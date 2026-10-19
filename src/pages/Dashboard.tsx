import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search, Plus, Trash2, Edit3, X, LogOut,
  CheckCircle2, FileText, Download, LayoutDashboard, ListOrdered,
  ShieldCheck, MessageCircle, Mail,
  User, Settings, Wallet, TrendingUp, History, BarChart3, Bell, Save,
  Package, Wifi, WifiOff, Bot, AlertTriangle, Boxes, CreditCard, MessageSquare,
  ArrowUp, HandCoins, Banknote, Sparkles, Phone, Receipt
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StatCard } from '../components/StatCard';
import { TaxEstimator } from '../components/TaxEstimator';
import { Onboarding } from '../components/Onboarding';
import Inventory from './Inventory';
import AIAssistant from './AIAssistant';
import BusinessSetup, { type BusinessMode } from './BusinessSetup';
import type { Transaction, PaymentMethod } from '../types/schema';
import type { Product, SaleItem } from '../types/product';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { TransactionService } from '../services/transactionService';
import {
  subscribeToProducts,
  deductStock,
  calculateInventoryStats
} from '../services/inventoryService';
import { formatCurrency } from '../utils/formatters';
import {
  auth,
  subscribeToTransactions,
  createTransaction,
  editTransaction,
  removeTransaction,
  logoutUser
} from '../services/firebase';
import { useLanguage } from '../hooks/useLanguage';

const MpesaLogo = '/Mpesa.jpeg';
const EcocashLogo = '/Ecocash.jpeg';

type View =
  | 'dashboard' | 'transactions' | 'inventory' | 'analytics'
  | 'ai' | 'wallet' | 'profile' | 'settings';

type LedgerTab = 'sales' | 'debts' | 'expenses';

const SEO = ({ view }: { view: string }) => {
  const title = `${view.charAt(0).toUpperCase() + view.slice(1)} | SME Finance`;
  const description = 'AI-powered financial management for SMEs in Lesotho.';
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="theme-color" content="#7c3aed" />
    </Helmet>
  );
};

const todayISO = () => new Date().toISOString().split('T')[0];
const addDaysISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};
const daysOverdue = (dueISO?: string) => {
  if (!dueISO) return 0;
  const diff = Math.floor((new Date(todayISO()).getTime() - new Date(dueISO).getTime()) / 86400000);
  return diff > 0 ? diff : 0;
};

const modeLabel = (m: BusinessMode) =>
  m === 'products' ? 'Products' : m === 'services' ? 'Services' : 'Debts';
const usesInventory = (m: BusinessMode) => m === 'products';
const allowsSales   = (m: BusinessMode) => m === 'products' || m === 'services';

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Transport', 'Stock', 'Other'] as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [businessMode, setBusinessMode] = useState<BusinessMode | null>(() => {
    const email = localStorage.getItem('khotsopay_user_email') || 'anon';
    const stored = localStorage.getItem(`khotsopay_businessMode_${email}`) as BusinessMode | null;
    if (stored === 'products' || stored === 'services' || stored === 'debts') return stored;
    return null;
  });

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [ledgerTab, setLedgerTab] = useState<LedgerTab>('sales');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [paymentModalId, setPaymentModalId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [inventoryPromptOpen, setInventoryPromptOpen] = useState(false);

  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  // Sale form
  const [saleName, setSaleName] = useState('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [saleProductId, setSaleProductId] = useState('');
  const [saleQty, setSaleQty] = useState('1');
  const [saleMethod, setSaleMethod] = useState<PaymentMethod>('M-Pesa');
  const [saleDesc, setSaleDesc] = useState('');
  const [saleAmount, setSaleAmount] = useState('');

  // Debt form
  const [debtName, setDebtName] = useState('');
  const [debtPhone, setDebtPhone] = useState('');
  const [debtEmail, setDebtEmail] = useState('');
  const [debtDueDate, setDebtDueDate] = useState(addDaysISO(7));
  const [debtItems, setDebtItems] = useState<SaleItem[]>([]);
  const [debtProductId, setDebtProductId] = useState('');
  const [debtQty, setDebtQty] = useState('1');
  const [debtNotes, setDebtNotes] = useState('');
  const [debtDesc, setDebtDesc] = useState('');
  const [debtAmount, setDebtAmount] = useState('');

  // Expense form
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<string>('Utilities');

  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    () => !localStorage.getItem('khotsopay_onboarded')
  );

  const [allTransactions, setAllTransactions] = useLocalStorage<Transaction[]>('khotsopay_tx', []);

  const [products, setProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem('khotsopay_products_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    }
    return [];
  });

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(navigator.onLine);
  const { t, language: appLanguage, setLanguage: setAppLanguage } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState(() => ({
    businessName: localStorage.getItem('khotsopay_business') || '',
    fullName: localStorage.getItem('khotsopay_fullName') || '',
    phone: localStorage.getItem('khotsopay_phone') || '',
    address: localStorage.getItem('khotsopay_address') || '',
    taxId: localStorage.getItem('khotsopay_taxId') || ''
  }));

  const [notifications, setNotifications] = useState({
    emailAlerts: localStorage.getItem('khotsopay_emailAlerts') === 'true',
    dailyReport: localStorage.getItem('khotsopay_dailyReport') === 'true',
    reminders: localStorage.getItem('khotsopay_reminders') === 'true'
  });
  const [dateFormat, setDateFormat] = useState(
    localStorage.getItem('khotsopay_dateFormat') || 'DD/MM/YYYY'
  );

  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const mainEl = document.querySelector('main');
    const onScroll = () => {
      const mainTop = mainEl?.scrollTop ?? 0;
      const winTop = window.scrollY || document.documentElement.scrollTop || 0;
      setShowScrollTop(Math.max(mainTop, winTop) > 300);
    };
    mainEl?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      mainEl?.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        localStorage.setItem('khotsopay_user_email', u.email || '');
        const email = u.email || 'anon';
        const stored = localStorage.getItem(`khotsopay_businessMode_${email}`) as BusinessMode | null;
        if (stored === 'products' || stored === 'services' || stored === 'debts') {
          setBusinessMode(stored);
        } else {
          setBusinessMode(null);
        }
        setCheckingAuth(false);
      } else {
        setCheckingAuth(false);
        navigate('/login');
      }
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToTransactions(user.uid, (data) => {
      setAllTransactions(data);
      localStorage.setItem('khotsopay_tx_cache', JSON.stringify(data));
    });
    return () => unsub();
  }, [user, setAllTransactions]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToProducts(user.uid, (data) => {
      setProducts(data);
      localStorage.setItem('khotsopay_products_cache', JSON.stringify(data));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const on = () => setOnlineStatus(true);
    const off = () => setOnlineStatus(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // ---- Derived lists ----
  const sales = useMemo(
    () => (allTransactions || []).filter((t) => t.status === 'Completed' && t.type !== 'expense'),
    [allTransactions]
  );
  const debts = useMemo(
    () => (allTransactions || []).filter((t) => t.status === 'Pending'),
    [allTransactions]
  );
  const expenses = useMemo(
    () => (allTransactions || []).filter((t) => t.type === 'expense'),
    [allTransactions]
  );

  const dailyStats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-LS', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    const todays = (allTransactions || []).filter((tx) => tx.date === todayStr);
    const todaysSales = todays.filter((t) => t.status === 'Completed' && t.type !== 'expense');
    const todaysExpenses = todays.filter((t) => t.type === 'expense');

    const revenue = todaysSales.reduce((s, t) => s + t.amount, 0);
    const expenseTotal = todaysExpenses.reduce((s, t) => s + t.amount, 0);

    return {
      revenue,
      mpesa: todaysSales.filter((t) => t.method === 'M-Pesa').reduce((s, t) => s + t.amount, 0),
      ecocash: todaysSales.filter((t) => t.method === 'EcoCash').reduce((s, t) => s + t.amount, 0),
      cash: todaysSales.filter((t) => t.method === 'Cash').reduce((s, t) => s + t.amount, 0),
      card: todaysSales.filter((t) => t.method === 'Card').reduce((s, t) => s + t.amount, 0),
      owed: todays.filter((t) => t.status === 'Pending').reduce((s, t) => s + (t.amount - (t.amountPaid ?? 0)), 0),
      expenses: expenseTotal,
      profit: revenue - expenseTotal,
      expenseCount: todaysExpenses.length,
      date: todayStr
    };
  }, [allTransactions]);

  const stats = useMemo(
    () => TransactionService.calculateDashboardStats(allTransactions || []),
    [allTransactions]
  );
  const inventoryStats = useMemo(() => calculateInventoryStats(products || []), [products]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold),
    [products]
  );

  const recentTransactions = useMemo(
    () => [...(allTransactions || [])].slice(0, 5),
    [allTransactions]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const debtSummary = useMemo(() => {
    const total = debts.reduce((s, t) => s + (t.amount - (t.amountPaid ?? 0)), 0);
    const overdue = debts.filter((t) => t.dueDate && t.dueDate < todayISO()).length;
    const withContact = debts.filter((t) => t.customerPhone).length;
    const noContact = debts.length - withContact;
    return { total, count: debts.length, overdue, withContact, noContact };
  }, [debts]);

  const filteredSales = useMemo(() => {
    return sales.filter((tx) =>
      tx.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.items && tx.items.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [sales, searchTerm]);

  const filteredDebts = useMemo(() => {
    return debts.filter((tx) =>
      tx.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.items && tx.items.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.customerPhone && tx.customerPhone.includes(searchTerm))
    );
  }, [debts, searchTerm]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((tx) =>
      tx.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.category && tx.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [expenses, searchTerm]);

  const productAnalytics = useMemo(() => {
    const productSales = new Map<string, number>();
    const productCount = new Map<string, number>();
    allTransactions.forEach((t) => {
      if (t.status === 'Completed' && t.type !== 'expense' && t.items) {
        t.items.split(',').map((i) => i.trim()).forEach((item) => {
          productSales.set(item, (productSales.get(item) || 0) + t.amount);
          productCount.set(item, (productCount.get(item) || 0) + 1);
        });
      }
    });
    return {
      topProducts: Array.from(productSales.entries())
        .map(([name, revenue]) => ({ name, revenue, sales: productCount.get(name) || 0 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      totalProducts: productSales.size
    };
  }, [allTransactions]);

  const handleSetupComplete = (mode: BusinessMode, type: string) => {
    const email = localStorage.getItem('khotsopay_user_email') || 'anon';
    localStorage.setItem(`khotsopay_businessMode_${email}`, mode);
    localStorage.setItem(`khotsopay_businessType_${email}`, type);
    setBusinessMode(mode);
  };

  const resetSaleForm = useCallback(() => {
    setSaleName('');
    setSaleItems([]);
    setSaleProductId('');
    setSaleQty('1');
    setSaleMethod('M-Pesa');
    setSaleDesc('');
    setSaleAmount('');
    setSaleModalOpen(false);
  }, []);

  const resetDebtForm = useCallback(() => {
    setDebtName('');
    setDebtPhone('');
    setDebtEmail('');
    setDebtDueDate(addDaysISO(7));
    setDebtItems([]);
    setDebtProductId('');
    setDebtQty('1');
    setDebtNotes('');
    setDebtDesc('');
    setDebtAmount('');
    setDebtModalOpen(false);
  }, []);

  const resetExpenseForm = useCallback(() => {
    setExpenseDesc('');
    setExpenseAmount('');
    setExpenseCategory('Utilities');
    setExpenseModalOpen(false);
  }, []);

  const openSaleModal = () => {
    if (businessMode === 'products' && products.length === 0) {
      setInventoryPromptOpen(true);
      return;
    }
    resetSaleForm();
    setSaleModalOpen(true);
  };

  const openDebtModal = () => { resetDebtForm(); setDebtModalOpen(true); };
  const openExpenseModal = () => { resetExpenseForm(); setExpenseModalOpen(true); };

  const addSaleItem = () => {
    const p = products.find((x) => x.id === saleProductId);
    if (!p) return;
    const q = parseInt(saleQty) || 1;
    if (q > p.stockQuantity) { alert(`Only ${p.stockQuantity} ${p.name} in stock.`); return; }
    setSaleItems((prev) => [...prev, {
      productId: p.id, productName: p.name, quantity: q,
      unitPrice: p.sellingPrice, buyingPrice: p.buyingPrice, subtotal: q * p.sellingPrice
    }]);
    setSaleProductId(''); setSaleQty('1');
  };
  const removeSaleItem = (id: string) =>
    setSaleItems((prev) => prev.filter((i) => i.productId !== id));

  const addDebtItem = () => {
    const p = products.find((x) => x.id === debtProductId);
    if (!p) return;
    const q = parseInt(debtQty) || 1;
    if (q > p.stockQuantity) { alert(`Only ${p.stockQuantity} ${p.name} in stock.`); return; }
    setDebtItems((prev) => [...prev, {
      productId: p.id, productName: p.name, quantity: q,
      unitPrice: p.sellingPrice, buyingPrice: p.buyingPrice, subtotal: q * p.sellingPrice
    }]);
    setDebtProductId(''); setDebtQty('1');
  };
  const removeDebtItem = (id: string) =>
    setDebtItems((prev) => prev.filter((i) => i.productId !== id));

  const saleTotal = businessMode === 'products'
    ? saleItems.reduce((s, i) => s + i.subtotal, 0)
    : parseFloat(saleAmount) || 0;
  const debtTotal = businessMode === 'products'
    ? debtItems.reduce((s, i) => s + i.subtotal, 0)
    : parseFloat(debtAmount) || 0;
  const saleItemsText = businessMode === 'products'
    ? saleItems.map((i) => `${i.quantity}x ${i.productName}`).join(', ')
    : saleDesc.trim();
  const debtItemsText = businessMode === 'products'
    ? debtItems.map((i) => `${i.quantity}x ${i.productName}`).join(', ')
    : debtDesc.trim();

  const submitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !businessMode) return;
    if (businessMode === 'products' && saleItems.length === 0) {
      alert('Add at least one product.'); return;
    }
    if (businessMode !== 'products' && (!saleDesc.trim() || !saleAmount || parseFloat(saleAmount) <= 0)) {
      alert('Enter a description and amount.'); return;
    }
    const now = new Date();
    try {
      await createTransaction(user.uid, {
        name: saleName,
        items: saleItemsText,
        amount: saleTotal,
        method: saleMethod,
        status: 'Completed',
        type: 'sale',
        date: now.toLocaleDateString('en-LS', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: now.toLocaleTimeString('en-LS', { hour: '2-digit', minute: '2-digit', hour12: false })
      });
      if (businessMode === 'products') await deductStock(saleItems);
      resetSaleForm();
    } catch (err) {
      console.error(err);
      alert('Failed to save sale.');
    }
  };

  const submitDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !businessMode) return;
    if (businessMode === 'products' && debtItems.length === 0) {
      alert('Add at least one product.'); return;
    }
    if (businessMode !== 'products' && (!debtDesc.trim() || !debtAmount || parseFloat(debtAmount) <= 0)) {
      alert('Enter a description and amount.'); return;
    }
    if (!debtPhone.trim()) { alert('Phone number is required for reminders.'); return; }
    if (!debtDueDate) { alert('Set a due date.'); return; }
    const now = new Date();
    try {
      await createTransaction(user.uid, {
        name: debtName,
        items: debtItemsText,
        amount: debtTotal,
        method: 'Cash',
        status: 'Pending',
        type: 'debt',
        date: now.toLocaleDateString('en-LS', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: now.toLocaleTimeString('en-LS', { hour: '2-digit', minute: '2-digit', hour12: false }),
        customerPhone: debtPhone.trim(),
        customerEmail: debtEmail.trim() || undefined,
        dueDate: debtDueDate,
        amountPaid: 0,
        remindersSent: 0,
        notes: debtNotes.trim() || undefined
      });
      if (businessMode === 'products') await deductStock(debtItems);
      resetDebtForm();
    } catch (err) {
      console.error(err);
      alert('Failed to save debt.');
    }
  };

  const submitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = parseFloat(expenseAmount);
    if (!expenseDesc.trim() || !amt || amt <= 0) {
      alert('Enter a description and amount.');
      return;
    }
    const now = new Date();
    try {
      await createTransaction(user.uid, {
        name: expenseDesc.trim(),
        items: expenseCategory,
        amount: amt,
        method: 'Cash',
        status: 'Completed',
        type: 'expense',
        category: expenseCategory,
        date: now.toLocaleDateString('en-LS', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: now.toLocaleTimeString('en-LS', { hour: '2-digit', minute: '2-digit', hour12: false })
      });
      resetExpenseForm();
    } catch (err) {
      console.error(err);
      alert('Failed to save expense.');
    }
  };

  const recordPayment = async (tx: Transaction) => {
    const val = parseFloat(paymentAmount);
    const remaining = tx.amount - (tx.amountPaid ?? 0);
    if (!val || val <= 0) { alert('Enter a valid amount.'); return; }
    if (val > remaining) { alert(`Exceeds balance of ${formatCurrency(remaining)}.`); return; }
    const newPaid = (tx.amountPaid ?? 0) + val;
    const paidOff = newPaid >= tx.amount - 0.001;
    try {
      await editTransaction(tx.id, {
        amountPaid: newPaid,
        status: paidOff ? 'Completed' : 'Pending'
      } as Partial<Transaction>);
      setPaymentModalId(null);
      setPaymentAmount('');
    } catch (err) { console.error(err); }
  };

  const sendReminder = async (tx: Transaction, type: 'whatsapp' | 'email' | 'sms') => {
    const remaining = tx.amount - (tx.amountPaid ?? 0);
    const biz = localStorage.getItem('khotsopay_business') || 'SME Finance';
    const msg = `Lumela ${tx.name}! Reminder from ${biz}: outstanding ${formatCurrency(remaining)} for ${tx.items || 'purchase'}${tx.dueDate ? `, due ${tx.dueDate}` : ''}. Please settle via M-Pesa, EcoCash, Cash, or Card. Khotso!`;

    if (type === 'whatsapp') {
      if (!tx.customerPhone) return;
      const d = tx.customerPhone.replace(/[^\d]/g, '');
      window.open(`https://wa.me/${d}?text=${encodeURIComponent(msg)}`, '_blank');
    } else if (type === 'email') {
      if (!tx.customerEmail) return;
      window.open(`mailto:${tx.customerEmail}?subject=${encodeURIComponent('Payment Reminder')}&body=${encodeURIComponent(msg)}`, '_self');
    } else {
      if (!tx.customerPhone) return;
      const d = tx.customerPhone.replace(/[^\d]/g, '');
      window.open(`sms:${d}?body=${encodeURIComponent(msg)}`, '_self');
    }

    try {
      await editTransaction(tx.id, {
        remindersSent: (tx.remindersSent ?? 0) + 1,
        lastReminderAt: new Date().toISOString()
      } as Partial<Transaction>);
    } catch (err) { console.error(err); }
  };

  const deleteTx = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    try { await removeTransaction(id); } catch (err) { console.error(err); }
  };

  const markPaid = async (id: string) => {
    if (!confirm('Mark as fully paid?')) return;
    try {
      const tx = allTransactions.find((t) => t.id === id);
      await editTransaction(id, {
        status: 'Completed',
        amountPaid: tx?.amount ?? 0
      } as Partial<Transaction>);
    } catch (err) { console.error(err); }
  };

  const handleLogout = async () => {
    if (!confirm('Logout?')) return;
    await logoutUser();
    setBusinessMode(null);
    navigate('/login');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.text('SME FINANCE DAILY CASH-UP', 14, 20);
    doc.text(`Date: ${dailyStats.date}`, 14, 28);
    autoTable(doc, {
      startY: 35,
      head: [['Category', 'Amount (LSL)']],
      body: [
        ['Revenue', formatCurrency(dailyStats.revenue)],
        ['M-Pesa', formatCurrency(dailyStats.mpesa)],
        ['EcoCash', formatCurrency(dailyStats.ecocash)],
        ['Cash', formatCurrency(dailyStats.cash)],
        ['Card', formatCurrency(dailyStats.card)],
        ['Owed', formatCurrency(dailyStats.owed)],
        ['Expenses', formatCurrency(dailyStats.expenses)],
        ['Profit', formatCurrency(dailyStats.profit)]
      ],
      headStyles: { fillColor: [124, 58, 237] }
    });
    doc.save(`SME_Finance_${dailyStats.date}.pdf`);
  };

  const exportToCSV = () => {
    const headers = ['Type', 'Customer/Description', 'Category', 'Phone', 'Email', 'Items', 'Amount', 'Paid', 'Balance', 'Method', 'Status', 'Due', 'Date', 'Time'];
    const rows = allTransactions.map((t) => [
      t.type === 'expense' ? 'Expense' : t.status === 'Pending' ? 'Debt' : 'Sale',
      t.name, t.category ?? '', t.customerPhone ?? '', t.customerEmail ?? '',
      t.items ?? '', t.amount, t.amountPaid ?? t.amount,
      t.amount - (t.amountPaid ?? 0), t.method, t.status,
      t.dueDate ?? '', t.date, t.time
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sme_finance_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const rows = allTransactions.map((t) => ({
      Type: t.type === 'expense' ? 'Expense' : t.status === 'Pending' ? 'Debt' : 'Sale',
      'Customer/Description': t.name,
      Category: t.category ?? '',
      Phone: t.customerPhone ?? '',
      Email: t.customerEmail ?? '',
      Items: t.items ?? '',
      Amount: t.amount,
      Paid: t.amountPaid ?? t.amount,
      Balance: t.amount - (t.amountPaid ?? 0),
      Method: t.method,
      Status: t.status,
      'Due Date': t.dueDate ?? '',
      Date: t.date,
      Time: t.time
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    XLSX.writeFile(wb, `sme_finance_${todayISO()}.xlsx`);
  };

  const handleSaveProfile = () => {
    localStorage.setItem('khotsopay_business', profileForm.businessName);
    localStorage.setItem('khotsopay_fullName', profileForm.fullName);
    localStorage.setItem('khotsopay_phone', profileForm.phone);
    localStorage.setItem('khotsopay_address', profileForm.address);
    localStorage.setItem('khotsopay_taxId', profileForm.taxId);
    setIsEditing(false);
    alert('Profile updated!');
  };

  const loadProfileData = () => {
    setProfileForm({
      businessName: localStorage.getItem('khotsopay_business') || '',
      fullName: localStorage.getItem('khotsopay_fullName') || '',
      phone: localStorage.getItem('khotsopay_phone') || '',
      address: localStorage.getItem('khotsopay_address') || '',
      taxId: localStorage.getItem('khotsopay_taxId') || ''
    });
  };

  if (!businessMode) {
    return (
      <HelmetProvider>
        <SEO view="setup" />
        <BusinessSetup onComplete={handleSetupComplete} language={appLanguage} />
      </HelmetProvider>
    );
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-3">
          <div className="h-10 w-40 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="h-24 bg-slate-200 rounded-2xl animate-pulse" />
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400 pt-4">Loading…</p>
        </div>
      </div>
    );
  }

  const navItems = (
    [
      'dashboard',
      'transactions',
      ...(usesInventory(businessMode) ? (['inventory'] as const) : []),
      'analytics',
      'ai',
      'wallet',
      'profile',
      'settings'
    ] as const
  ) as readonly View[];

  return (
    <HelmetProvider>
      <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <SEO view={currentView} />

        {showOnboarding && (
          <Onboarding
            onClose={() => {
              setShowOnboarding(false);
              localStorage.setItem('khotsopay_onboarded', 'true');
            }}
            language={appLanguage}
            businessMode={businessMode}
          />
        )}

        <Sidebar
          activeView={currentView}
          onNavigate={(v) => setCurrentView(v as View)}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-12 pb-12 overflow-y-auto w-full max-w-7xl mx-auto">

          <header className="mb-8 flex flex-row justify-end items-center gap-2 sticky top-0 bg-slate-50/85 backdrop-blur-md z-40 py-3 border-b border-slate-200/60 -mx-4 pl-16 pr-4 md:-mx-12 md:px-12 md:pl-12">
            <nav className="hidden md:flex gap-1 overflow-x-auto no-scrollbar md:order-2 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
              {navItems.map((v) => {
                const active = currentView === v;
                return (
                  <button key={v} onClick={() => setCurrentView(v)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 transition-all whitespace-nowrap ${active ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                    {v === 'dashboard' && <LayoutDashboard size={14} />}
                    {v === 'transactions' && <ListOrdered size={14} />}
                    {v === 'inventory' && <Boxes size={14} />}
                    {v === 'analytics' && <BarChart3 size={14} />}
                    {v === 'ai' && <Bot size={14} />}
                    {v === 'wallet' && <Wallet size={14} />}
                    {v === 'profile' && <User size={14} />}
                    {v === 'settings' && <Settings size={14} />}
                    <span className="hidden sm:inline">{v.charAt(0).toUpperCase() + v.slice(1)}</span>
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 md:order-3 ml-auto">
              <div className="flex gap-0.5 bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
                <button onClick={() => setAppLanguage('en')} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase ${appLanguage === 'en' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>EN</button>
                <button onClick={() => setAppLanguage('st')} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase ${appLanguage === 'st' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>ST</button>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[10px] font-bold uppercase border ${onlineStatus ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${onlineStatus ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {onlineStatus ? <Wifi size={12} /> : <WifiOff size={12} />}
              </div>
              <button onClick={handleLogout} title="Logout" aria-label="Logout" className="hidden md:block p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all">
                <LogOut size={18} />
              </button>
            </div>
          </header>

          {currentView === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900 p-6 md:p-10 shadow-xl">
                <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 border border-white/10">
                      <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" /></span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider">{localStorage.getItem('khotsopay_business') || 'SME Finance'} · {modeLabel(businessMode)}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">{t('lumela')}, welcome back.</h1>
                    <p className="text-slate-300 text-base max-w-md">{t('manageBusiness')}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    {allowsSales(businessMode) && (
                      <button onClick={openSaleModal} className="group flex items-center justify-center gap-2 bg-white text-slate-900 px-5 py-3.5 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:bg-slate-100 transition-all">
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        <span>Record Sale</span>
                      </button>
                    )}
                    <button onClick={openDebtModal} className="group flex items-center justify-center gap-2 bg-amber-500 text-white px-5 py-3.5 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:bg-amber-600 transition-all">
                      <HandCoins size={18} />
                      <span>Record Debt</span>
                    </button>
                    <button onClick={openExpenseModal} className="group flex items-center justify-center gap-2 bg-slate-700 text-white px-5 py-3.5 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all">
                      <Receipt size={18} />
                      <span>Record Expense</span>
                    </button>
                  </div>
                </div>
              </section>

              <article className="sf-card p-6 md:p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="sf-eyebrow">Cash-up summary</p>
                    <p className="text-lg font-semibold mt-1">{dailyStats.date}</p>
                  </div>
                  <button onClick={exportToPDF} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs">
                    <Download size={14} /> Export PDF
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
                    <div className="flex justify-between items-start mb-3"><p className="sf-eyebrow">Revenue</p><TrendingUp size={16} className="text-slate-400" /></div>
                    <p className="sf-metric">{formatCurrency(dailyStats.revenue)}</p>
                    <p className="sf-meta mt-1">Total paid</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
                    <div className="flex justify-between items-start mb-3"><p className="sf-eyebrow">M-Pesa</p><div className="bg-white rounded-md px-1.5 py-0.5 border border-slate-200"><img src={MpesaLogo} alt="M-Pesa" className="h-5 w-auto object-contain" /></div></div>
                    <p className="sf-metric">{formatCurrency(dailyStats.mpesa)}</p>
                    <p className="sf-meta mt-1">Mobile money</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
                    <div className="flex justify-between items-start mb-3"><p className="sf-eyebrow">EcoCash</p><div className="bg-white rounded-md px-1.5 py-0.5 border border-slate-200"><img src={EcocashLogo} alt="EcoCash" className="h-5 w-auto object-contain" /></div></div>
                    <p className="sf-metric">{formatCurrency(dailyStats.ecocash)}</p>
                    <p className="sf-meta mt-1">Mobile money</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
                    <div className="flex justify-between items-start mb-3"><p className="sf-eyebrow">Cash</p><Wallet size={16} className="text-slate-400" /></div>
                    <p className="sf-metric">{formatCurrency(dailyStats.cash)}</p>
                    <p className="sf-meta mt-1">On hand</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4 mt-3">
                  <div className="p-4 rounded-2xl border border-red-200 bg-red-50">
                    <div className="flex justify-between items-start mb-3"><p className="sf-eyebrow text-red-700">Expenses</p><Receipt size={16} className="text-red-500" /></div>
                    <p className="sf-metric text-red-900">{formatCurrency(dailyStats.expenses)}</p>
                    <p className="sf-meta text-red-700 mt-1">{dailyStats.expenseCount} recorded today</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${dailyStats.profit >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <p className={`sf-eyebrow ${dailyStats.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Profit</p>
                      <TrendingUp size={16} className={dailyStats.profit >= 0 ? 'text-emerald-500' : 'text-red-500'} />
                    </div>
                    <p className={`sf-metric ${dailyStats.profit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>{formatCurrency(dailyStats.profit)}</p>
                    <p className={`sf-meta mt-1 ${dailyStats.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Revenue − Expenses</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:gap-4 mt-3">
                  <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50">
                    <div className="flex justify-between items-start mb-3"><p className="sf-eyebrow text-amber-700">Sekoloto</p><AlertTriangle size={16} className="text-amber-500" /></div>
                    <p className="sf-metric text-amber-900">{formatCurrency(dailyStats.owed)}</p>
                    <p className="sf-meta text-amber-700 mt-1">Outstanding today</p>
                  </div>
                </div>
              </article>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} change="All time" />
                <StatCard title="M-Pesa" value={formatCurrency(stats.mpesaVolume)} color="red" />
                <StatCard title="EcoCash" value={formatCurrency(stats.ecocashVolume)} color="purple" />
                <StatCard title="Total Expenses" value={formatCurrency(totalExpenses)} color="red" />
              </div>

              {debts.length > 0 && (
                <div className="sf-card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><HandCoins size={20} className="text-amber-600" /> Debts (Sekoloto)</h3>
                    <button onClick={() => { setCurrentView('transactions'); setLedgerTab('debts'); }} className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1">
                      View All <History size={12} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500 mb-1">Debtors</p><p className="text-xl font-bold tabular-nums">{debtSummary.count}</p></div>
                    <div className="text-center p-3 bg-red-50 rounded-xl"><p className="text-xs text-red-600 mb-1">Overdue</p><p className="text-xl font-bold text-red-700 tabular-nums">{debtSummary.overdue}</p></div>
                    <div className="text-center p-3 bg-emerald-50 rounded-xl"><p className="text-xs text-emerald-600 mb-1">Reachable</p><p className="text-xl font-bold text-emerald-700 tabular-nums">{debtSummary.withContact}</p></div>
                    <div className="text-center p-3 bg-amber-50 rounded-xl"><p className="text-xs text-amber-600 mb-1">No contact</p><p className="text-xl font-bold text-amber-700 tabular-nums">{debtSummary.noContact}</p></div>
                  </div>

                  {debtSummary.noContact > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2 mb-4">
                      <Sparkles className="text-purple-600 flex-shrink-0 mt-0.5" size={14} />
                      <p className="text-xs text-purple-800"><strong>AI insight:</strong> {debtSummary.noContact} debt{debtSummary.noContact > 1 ? 's' : ''} have no phone number. Add contacts so reminders can reach them.</p>
                    </div>
                  )}

                  <div className="space-y-2 max-h-64 overflow-y-auto sf-scroll">
                    {debts.slice(0, 5).map((tx) => {
                      const remaining = tx.amount - (tx.amountPaid ?? 0);
                      const overdue = daysOverdue(tx.dueDate);
                      return (
                        <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{tx.name}</p>
                            <p className="text-xs text-slate-500 truncate">{tx.items || '-'}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {tx.customerPhone ? (
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><Phone size={10} /> {tx.customerPhone}</span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1"><AlertTriangle size={10} /> No contact</span>
                              )}
                              {overdue > 0 && <span className="text-[10px] font-bold text-red-600">{overdue}d overdue</span>}
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <p className="font-bold text-sm text-amber-700 tabular-nums">{formatCurrency(remaining)}</p>
                            {tx.amountPaid ? <p className="text-[10px] text-slate-400">Paid {formatCurrency(tx.amountPaid)}</p> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {usesInventory(businessMode) && (
                <div className="sf-card p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Boxes size={20} className="text-purple-600" /> Inventory</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-4 bg-slate-50 rounded-xl"><Package size={24} className="text-purple-600 mx-auto mb-2" /><p className="text-2xl font-bold tabular-nums">{inventoryStats.totalProducts}</p><p className="text-xs text-slate-500">Products</p></div>
                    <div className="text-center p-4 bg-slate-50 rounded-xl"><Wallet size={24} className="text-emerald-600 mx-auto mb-2" /><p className="text-2xl font-bold tabular-nums">{formatCurrency(inventoryStats.totalStockValue)}</p><p className="text-xs text-slate-500">Stock value</p></div>
                    <div className="text-center p-4 bg-amber-50 rounded-xl"><AlertTriangle size={24} className="text-amber-600 mx-auto mb-2" /><p className="text-2xl font-bold tabular-nums">{inventoryStats.lowStockCount}</p><p className="text-xs text-slate-500">Low stock</p></div>
                    <div className="text-center p-4 bg-red-50 rounded-xl"><AlertTriangle size={24} className="text-red-600 mx-auto mb-2" /><p className="text-2xl font-bold tabular-nums">{inventoryStats.outOfStockCount}</p><p className="text-xs text-slate-500">Out of stock</p></div>
                  </div>
                  {lowStockProducts.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
                      <p className="font-bold text-amber-800 text-sm mb-2 flex items-center gap-2"><AlertTriangle size={14} /> {lowStockProducts.length} low on stock:</p>
                      <ul className="text-sm text-amber-700 space-y-1">
                        {lowStockProducts.slice(0, 3).map((p) => <li key={p.id}>• {p.name} — only {p.stockQuantity} left</li>)}
                      </ul>
                    </div>
                  )}
                  <button onClick={() => setCurrentView('inventory')} className="w-full py-3 bg-purple-50 text-purple-600 rounded-xl font-bold text-sm hover:bg-purple-100 transition flex items-center justify-center gap-2">
                    <Boxes size={16} /> Manage Inventory
                  </button>
                </div>
              )}

              <div className="sf-card p-6">
                <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {allowsSales(businessMode) && (
                    <button onClick={openSaleModal} className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition"><Plus size={24} className="text-purple-600" /><span className="text-xs font-bold text-purple-700">Record Sale</span></button>
                  )}
                  <button onClick={openDebtModal} className="flex flex-col items-center gap-2 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition"><HandCoins size={24} className="text-amber-600" /><span className="text-xs font-bold text-amber-700">Record Debt</span></button>
                  <button onClick={openExpenseModal} className="flex flex-col items-center gap-2 p-4 bg-red-50 rounded-xl hover:bg-red-100 transition"><Receipt size={24} className="text-red-600" /><span className="text-xs font-bold text-red-700">Record Expense</span></button>
                  <button onClick={() => setAiDrawerOpen(true)} className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition"><Bot size={24} className="text-purple-600" /><span className="text-xs font-bold text-purple-700">AI Assistant</span></button>
                </div>
              </div>

              <div className="sf-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">Recent Activity</h3>
                  <button onClick={() => setCurrentView('transactions')} className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1">View All <History size={12} /></button>
                </div>
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3"><History size={22} className="text-slate-400" /></div>
                    <p className="font-semibold text-slate-700 text-sm">No activity yet</p>
                    <p className="text-slate-500 text-xs mt-1 mb-4">Record your first {allowsSales(businessMode) ? 'sale or debt' : 'debt'} to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentTransactions.map((tx) => {
                      const isDebt = tx.status === 'Pending';
                      const isExpense = tx.type === 'expense';
                      return (
                        <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isExpense ? 'bg-red-100' : isDebt ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                              {isExpense ? <Receipt size={14} className="text-red-600" /> : isDebt ? <HandCoins size={14} className="text-amber-600" /> : <CheckCircle2 size={14} className="text-emerald-600" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{tx.name}</p>
                              <p className="text-xs text-slate-400">{tx.items || '-'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-sm tabular-nums ${isExpense ? 'text-red-600' : ''}`}>
                              {isExpense ? '−' : ''}{formatCurrency(tx.amount)}
                            </p>
                            <p className={`text-[10px] font-bold uppercase ${isExpense ? 'text-red-600' : isDebt ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {isExpense ? 'Expense' : isDebt ? 'Debt' : 'Paid'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <TaxEstimator totalRevenue={stats.totalRevenue} />
            </div>
          )}

          {currentView === 'inventory' && user && usesInventory(businessMode) && (
            <Inventory userId={user.uid} />
          )}

          {currentView === 'transactions' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="sf-card overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Business Ledger</h3>
                    <p className="text-slate-500 text-sm mt-1">Sales, debts and expenses</p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Search…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-purple-300 focus:ring-4 focus:ring-purple-50 outline-none font-medium text-sm" />
                  </div>
                </div>

                <div className="flex gap-1 px-6 pt-4 border-b border-slate-100">
                  {allowsSales(businessMode) && (
                    <button onClick={() => setLedgerTab('sales')} className={`px-4 py-3 rounded-t-xl font-semibold text-sm flex items-center gap-2 ${ledgerTab === 'sales' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500'}`}>
                      <Banknote size={16} /> Sales ({sales.length})
                    </button>
                  )}
                  <button onClick={() => setLedgerTab('debts')} className={`px-4 py-3 rounded-t-xl font-semibold text-sm flex items-center gap-2 ${ledgerTab === 'debts' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-500'}`}>
                    <HandCoins size={16} /> Debts ({debts.length})
                  </button>
                  <button onClick={() => setLedgerTab('expenses')} className={`px-4 py-3 rounded-t-xl font-semibold text-sm flex items-center gap-2 ${ledgerTab === 'expenses' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500'}`}>
                    <Receipt size={16} /> Expenses ({expenses.length})
                  </button>
                </div>

                {ledgerTab === 'sales' && allowsSales(businessMode) && (
                  <div className="overflow-x-auto sf-scroll">
                    <table className="w-full text-left" aria-label="Sales">
                      <thead>
                        <tr className="text-slate-500 text-[10px] uppercase font-bold tracking-widest bg-slate-50/70">
                          <th className="py-4 px-6">Customer</th>
                          <th className="py-4 px-6">Items</th>
                          <th className="py-4 px-6 text-right">Amount</th>
                          <th className="py-4 px-6">Method</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSales.length === 0 ? (
                          <tr><td colSpan={5} className="py-14 text-center">
                            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3"><Banknote size={22} className="text-slate-400" /></div>
                            <p className="font-semibold text-slate-700 text-sm">No sales recorded</p>
                            <p className="text-slate-500 text-xs mt-1 mb-4">Record your first sale to see it here.</p>
                            <button onClick={openSaleModal} className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs hover:bg-purple-700">Record Sale</button>
                          </td></tr>
                        ) : filteredSales.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/80">
                            <td className="py-4 px-6">
                              <span className="text-sm font-bold text-slate-900 block">{tx.name}</span>
                              <span className="text-[10px] text-slate-400 uppercase">{tx.date} • {tx.time}</span>
                            </td>
                            <td className="py-4 px-6"><span className="text-sm text-slate-700 truncate max-w-[200px] inline-block">{tx.items || '-'}</span></td>
                            <td className="py-4 px-6 text-right font-bold tabular-nums">{formatCurrency(tx.amount)}</td>
                            <td className="py-4 px-6">
                              <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                                {tx.method === 'M-Pesa' && <img src={MpesaLogo} alt="M-Pesa" className="h-4 w-auto" />}
                                {tx.method === 'EcoCash' && <img src={EcocashLogo} alt="EcoCash" className="h-4 w-auto" />}
                                {tx.method === 'Card' && <CreditCard size={12} />}
                                {tx.method === 'Cash' && <Wallet size={12} />}
                                {tx.method}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button onClick={() => deleteTx(tx.id)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-red-600 rounded-lg" title="Delete">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {ledgerTab === 'debts' && (
                  <div className="overflow-x-auto sf-scroll">
                    <table className="w-full text-left" aria-label="Debts">
                      <thead>
                        <tr className="text-slate-500 text-[10px] uppercase font-bold tracking-widest bg-slate-50/70">
                          <th className="py-4 px-6">Customer</th>
                          <th className="py-4 px-6">Contact</th>
                          <th className="py-4 px-6 text-right">Balance</th>
                          <th className="py-4 px-6">Due</th>
                          <th className="py-4 px-6">Reminded</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDebts.length === 0 ? (
                          <tr><td colSpan={6} className="py-14 text-center">
                            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3"><HandCoins size={22} className="text-slate-400" /></div>
                            <p className="font-semibold text-slate-700 text-sm">No debts recorded</p>
                            <p className="text-slate-500 text-xs mt-1 mb-4">Record a debt to track who owes you.</p>
                            <button onClick={openDebtModal} className="px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600">Record Debt</button>
                          </td></tr>
                        ) : filteredDebts.map((tx) => {
                          const remaining = tx.amount - (tx.amountPaid ?? 0);
                          const overdue = daysOverdue(tx.dueDate);
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/80">
                              <td className="py-4 px-6">
                                <span className="text-sm font-bold text-slate-900 block">{tx.name}</span>
                                <span className="text-[10px] text-slate-400">{tx.items || '-'}</span>
                              </td>
                              <td className="py-4 px-6">
                                {tx.customerPhone ? (
                                  <div>
                                    <p className="text-xs font-medium">{tx.customerPhone}</p>
                                    {tx.customerEmail && <p className="text-[10px] text-slate-400">{tx.customerEmail}</p>}
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1"><AlertTriangle size={10} /> No contact</span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <p className="font-bold tabular-nums text-amber-700">{formatCurrency(remaining)}</p>
                                {tx.amountPaid ? <p className="text-[10px] text-slate-400 tabular-nums">Paid {formatCurrency(tx.amountPaid)}</p> : null}
                              </td>
                              <td className="py-4 px-6">
                                {tx.dueDate ? (
                                  <div>
                                    <p className="text-xs font-medium">{tx.dueDate}</p>
                                    {overdue > 0 && <p className="text-[10px] font-bold text-red-600">{overdue}d overdue</p>}
                                  </div>
                                ) : <span className="text-xs text-slate-400">—</span>}
                              </td>
                              <td className="py-4 px-6"><span className="text-xs text-slate-600">{tx.remindersSent ?? 0}×</span></td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex justify-end gap-1.5 flex-wrap">
                                  {tx.customerPhone && (
                                    <>
                                      <button onClick={() => sendReminder(tx, 'whatsapp')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="WhatsApp"><MessageCircle size={15} /></button>
                                      <button onClick={() => sendReminder(tx, 'sms')} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100" title="SMS"><MessageSquare size={15} /></button>
                                    </>
                                  )}
                                  {tx.customerEmail && (
                                    <button onClick={() => sendReminder(tx, 'email')} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100" title="Email"><Mail size={15} /></button>
                                  )}
                                  <button onClick={() => { setPaymentModalId(tx.id); setPaymentAmount(''); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100" title="Record payment"><Banknote size={15} /></button>
                                  <button onClick={() => markPaid(tx.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Mark fully paid"><CheckCircle2 size={15} /></button>
                                  <button onClick={() => deleteTx(tx.id)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-red-600 rounded-lg" title="Delete"><Trash2 size={15} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {ledgerTab === 'expenses' && (
                  <div className="overflow-x-auto sf-scroll">
                    <table className="w-full text-left" aria-label="Expenses">
                      <thead>
                        <tr className="text-slate-500 text-[10px] uppercase font-bold tracking-widest bg-slate-50/70">
                          <th className="py-4 px-6">Description</th>
                          <th className="py-4 px-6">Category</th>
                          <th className="py-4 px-6 text-right">Amount</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.length === 0 ? (
                          <tr><td colSpan={4} className="py-14 text-center">
                            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3"><Receipt size={22} className="text-slate-400" /></div>
                            <p className="font-semibold text-slate-700 text-sm">No expenses recorded</p>
                            <p className="text-slate-500 text-xs mt-1 mb-4">Record your first expense to see it here.</p>
                            <button onClick={openExpenseModal} className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700">Record Expense</button>
                          </td></tr>
                        ) : filteredExpenses.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/80">
                            <td className="py-4 px-6">
                              <span className="text-sm font-bold text-slate-900 block">{tx.name}</span>
                              <span className="text-[10px] text-slate-400 uppercase">{tx.date} • {tx.time}</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-2.5 py-1 rounded-lg">
                                {tx.category || 'Other'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right font-bold tabular-nums text-red-600">−{formatCurrency(tx.amount)}</td>
                            <td className="py-4 px-6 text-right">
                              <button onClick={() => deleteTx(tx.id)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-red-600 rounded-lg" title="Delete">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {saleModalOpen && allowsSales(businessMode) && (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) resetSaleForm(); }}>
              <div role="dialog" aria-modal="true" className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl p-6 md:p-10 shadow-2xl relative max-h-[95vh] overflow-y-auto sf-scroll">
                <button onClick={resetSaleForm} className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100" aria-label="Close"><X size={24} /></button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-xl"><Banknote size={22} className="text-purple-600" /></div>
                  <div>
                    <h2 className="text-2xl font-bold">Record Sale</h2>
                    <p className="text-xs text-slate-500">Payment received now</p>
                  </div>
                </div>
                <form onSubmit={submitSale} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Customer Name</label>
                    <input required autoFocus value={saleName} onChange={(e) => setSaleName(e.target.value)} placeholder="Who bought?" className="w-full mt-1 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none font-semibold" />
                  </div>

                  {businessMode === 'products' ? (
                    <>
                      <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Add Product</label>
                        <div className="grid grid-cols-3 gap-2">
                          <select value={saleProductId} onChange={(e) => setSaleProductId(e.target.value)} className="col-span-2 p-3 bg-white rounded-xl border border-slate-200 text-sm">
                            <option value="">Select product</option>
                            {products.map((p) => <option key={p.id} value={p.id} disabled={p.stockQuantity === 0}>{p.name} — {p.stockQuantity} left — M {p.sellingPrice}</option>)}
                          </select>
                          <input type="number" min="1" value={saleQty} onChange={(e) => setSaleQty(e.target.value)} placeholder="Qty" className="p-3 bg-white rounded-xl border border-slate-200 text-sm" />
                        </div>
                        <button type="button" onClick={addSaleItem} className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-purple-700"><Plus size={16} /> Add</button>
                      </div>
                      {saleItems.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
                          {saleItems.map((it) => (
                            <div key={it.productId} className="flex justify-between items-center p-2 bg-slate-50 rounded-xl">
                              <div><p className="font-medium text-sm">{it.productName}</p><p className="text-xs text-slate-500">{it.quantity} × M {it.unitPrice}</p></div>
                              <div className="flex items-center gap-2"><span className="font-bold text-sm tabular-nums">{formatCurrency(it.subtotal)}</span><button type="button" onClick={() => removeSaleItem(it.productId)} className="text-red-500"><X size={16} /></button></div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Total</label>
                        <p className="text-3xl font-bold text-purple-600 tabular-nums">{formatCurrency(saleTotal)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">What did you do?</label>
                        <input required value={saleDesc} onChange={(e) => setSaleDesc(e.target.value)} placeholder="E.g., Haircut + wash, Laundry 5 shirts" className="w-full mt-1 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none font-semibold" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Amount (LSL)</label>
                        <input required type="number" step="0.01" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} placeholder="0.00" className="w-full mt-1 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-2xl text-purple-600 tabular-nums" />
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['M-Pesa', 'EcoCash', 'Cash', 'Card'] as const).map((m) => (
                      <button key={m} type="button" onClick={() => setSaleMethod(m)}
                        className={`py-3 rounded-xl text-[10px] font-bold uppercase border-2 transition-all flex flex-col items-center gap-1 ${saleMethod === m ? 'border-purple-600 bg-purple-50 text-purple-600' : 'border-slate-200 text-slate-400'}`}>
                        {m === 'M-Pesa' && <div className="bg-white rounded px-2 py-0.5"><img src={MpesaLogo} alt="M-Pesa" className="h-6 w-auto" /></div>}
                        {m === 'EcoCash' && <div className="bg-white rounded px-2 py-0.5"><img src={EcocashLogo} alt="EcoCash" className="h-6 w-auto" /></div>}
                        {m === 'Cash' && <Wallet size={16} />}
                        {m === 'Card' && <CreditCard size={16} />}
                        {m}
                      </button>
                    ))}
                  </div>

                  {businessMode === 'products' && saleItems.length === 0 && (
                    <p className="text-center text-xs font-semibold text-amber-600 -mt-2">Add at least one product before confirming.</p>
                  )}
                  <button
                    type="submit"
                    disabled={businessMode === 'products' && saleItems.length === 0}
                    className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold hover:bg-purple-700 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:hover:bg-slate-300"
                  >
                    <CheckCircle2 size={18} /> Confirm Sale
                  </button>
                </form>
              </div>
            </div>
          )}

          {debtModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) resetDebtForm(); }}>
              <div role="dialog" aria-modal="true" className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl p-6 md:p-10 shadow-2xl relative max-h-[95vh] overflow-y-auto sf-scroll">
                <button onClick={resetDebtForm} className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100" aria-label="Close"><X size={24} /></button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-100 rounded-xl"><HandCoins size={22} className="text-amber-600" /></div>
                  <div>
                    <h2 className="text-2xl font-bold">Record Debt</h2>
                    <p className="text-xs text-slate-500">Customer will pay later</p>
                  </div>
                </div>
                <form onSubmit={submitDebt} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Customer Name</label>
                    <input required autoFocus value={debtName} onChange={(e) => setDebtName(e.target.value)} placeholder="Who owes you?" className="w-full mt-1 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-amber-300 focus:ring-4 focus:ring-amber-100 outline-none font-semibold" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Phone <span className="text-red-500">*</span></label>
                      <input required type="tel" value={debtPhone} onChange={(e) => setDebtPhone(e.target.value)} placeholder="+266 5xxx xxxx" className="w-full mt-1 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-amber-300 focus:ring-4 focus:ring-amber-100 outline-none font-semibold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Email <span className="text-slate-400 font-normal">(optional)</span></label>
                      <input type="email" value={debtEmail} onChange={(e) => setDebtEmail(e.target.value)} placeholder="customer@email.com" className="w-full mt-1 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-amber-300 focus:ring-4 focus:ring-amber-100 outline-none font-semibold" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Due Date <span className="text-red-500">*</span></label>
                    <input required type="date" value={debtDueDate} onChange={(e) => setDebtDueDate(e.target.value)} className="w-full mt-1 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-amber-300 focus:ring-4 focus:ring-amber-100 outline-none font-semibold" />
                  </div>

                  {businessMode === 'products' ? (
                    <>
                      <div className="bg-amber-50 rounded-2xl p-4 space-y-3 border border-amber-100">
                        <label className="text-[10px] font-bold uppercase text-amber-700 tracking-widest">Products Owed</label>
                        <div className="grid grid-cols-3 gap-2">
                          <select value={debtProductId} onChange={(e) => setDebtProductId(e.target.value)} className="col-span-2 p-3 bg-white rounded-xl border border-amber-200 text-sm">
                            <option value="">Select product</option>
                            {products.map((p) => <option key={p.id} value={p.id} disabled={p.stockQuantity === 0}>{p.name} — {p.stockQuantity} left — M {p.sellingPrice}</option>)}
                          </select>
                          <input type="number" min="1" value={debtQty} onChange={(e) => setDebtQty(e.target.value)} placeholder="Qty" className="p-3 bg-white rounded-xl border border-amber-200 text-sm" />
                        </div>
                        <button type="button" onClick={addDebtItem} className="w-full py-2.5 bg-amber-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-600"><Plus size={16} /> Add</button>
                      </div>
                      {debtItems.length > 0 && (
                        <div className="bg-white border border-amber-200 rounded-2xl p-3 space-y-2">
                          {debtItems.map((it) => (
                            <div key={it.productId} className="flex justify-between items-center p-2 bg-amber-50 rounded-xl">
                              <div><p className="font-medium text-sm">{it.productName}</p><p className="text-xs text-slate-500">{it.quantity} × M {it.unitPrice}</p></div>
                              <div className="flex items-center gap-2"><span className="font-bold text-sm tabular-nums">{formatCurrency(it.subtotal)}</span><button type="button" onClick={() => removeDebtItem(it.productId)} className="text-red-500"><X size={16} /></button></div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Total Owed</label>
                        <p className="text-3xl font-bold text-amber-600 tabular-nums">{formatCurrency(debtTotal)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">What do they owe you for?</label>
                        <input required value={debtDesc} onChange={(e) => setDebtDesc(e.target.value)} placeholder="E.g., Haircut, Laundry, Loan" className="w-full mt-1 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-amber-300 focus:ring-4 focus:ring-amber-100 outline-none font-semibold" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Amount (LSL)</label>
                        <input required type="number" step="0.01" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} placeholder="0.00" className="w-full mt-1 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-amber-300 focus:ring-4 focus:ring-amber-100 outline-none font-bold text-2xl text-amber-600 tabular-nums" />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Notes (optional)</label>
                    <textarea value={debtNotes} onChange={(e) => setDebtNotes(e.target.value)} rows={2} placeholder="E.g. promised to pay Friday" className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-amber-300 focus:ring-4 focus:ring-amber-100 outline-none text-sm resize-none" />
                  </div>

                  {businessMode === 'products' && debtItems.length === 0 && (
                    <p className="text-center text-xs font-semibold text-amber-600 -mt-2">Add at least one product before saving.</p>
                  )}
                  <button
                    type="submit"
                    disabled={businessMode === 'products' && debtItems.length === 0}
                    className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold hover:bg-amber-600 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:hover:bg-slate-300"
                  >
                    <HandCoins size={18} /> Save Debt
                  </button>
                </form>
              </div>
            </div>
          )}

          {expenseModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) resetExpenseForm(); }}>
              <div role="dialog" aria-modal="true" className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 md:p-8 shadow-2xl relative">
                <button onClick={resetExpenseForm} className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100" aria-label="Close"><X size={22} /></button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-red-100 rounded-xl"><Receipt size={22} className="text-red-600" /></div>
                  <div>
                    <h2 className="text-xl font-bold">Record Expense</h2>
                    <p className="text-xs text-slate-500">Money going out</p>
                  </div>
                </div>
                <form onSubmit={submitExpense} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">What did you spend on?</label>
                    <input required autoFocus value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="E.g., Electricity bill" className="w-full mt-1 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-red-300 focus:ring-4 focus:ring-red-100 outline-none font-semibold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Category</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setExpenseCategory(cat)}
                          className={`py-2.5 rounded-xl text-[11px] font-bold uppercase border-2 transition-all ${expenseCategory === cat ? 'border-red-600 bg-red-50 text-red-700' : 'border-slate-200 text-slate-400'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Amount (LSL)</label>
                    <input required type="number" step="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0.00" className="w-full mt-1 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-red-300 focus:ring-4 focus:ring-red-100 outline-none font-bold text-2xl text-red-600 tabular-nums" />
                  </div>
                  <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} /> Save Expense
                  </button>
                </form>
              </div>
            </div>
          )}

          {inventoryPromptOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setInventoryPromptOpen(false); }}>
              <div role="dialog" aria-modal="true" className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl text-center">
                <div className="w-14 h-14 bg-purple-100 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <Boxes size={28} className="text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">No inventory yet</h2>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  You're in <strong>Products mode</strong>, so a sale must come from inventory. Add at least one product first, then record the sale.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      setInventoryPromptOpen(false);
                      setCurrentView('inventory');
                    }}
                    className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition active:scale-95"
                  >
                    Add inventory
                  </button>
                  <button
                    onClick={() => setInventoryPromptOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {paymentModalId && (() => {
            const tx = allTransactions.find((t) => t.id === paymentModalId);
            if (!tx) return null;
            const remaining = tx.amount - (tx.amountPaid ?? 0);
            return (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setPaymentModalId(null); setPaymentAmount(''); } }}>
                <div role="dialog" aria-modal="true" className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold">Record Payment</h2>
                      <p className="text-xs text-slate-500">{tx.name} — {tx.items}</p>
                    </div>
                    <button onClick={() => { setPaymentModalId(null); setPaymentAmount(''); }} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 mb-4">
                    <div className="flex justify-between text-sm"><span className="text-slate-600">Balance</span><span className="font-bold tabular-nums">{formatCurrency(remaining)}</span></div>
                    {tx.amountPaid ? <div className="flex justify-between text-sm mt-1"><span className="text-slate-600">Already paid</span><span className="font-bold text-emerald-600 tabular-nums">{formatCurrency(tx.amountPaid)}</span></div> : null}
                  </div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1">Amount to pay (LSL)</label>
                  <input type="number" step="0.01" autoFocus value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" className="w-full mt-1 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-2xl tabular-nums" />
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setPaymentAmount(remaining.toString())} className="px-3 py-2 text-xs font-semibold bg-slate-100 rounded-lg hover:bg-slate-200">Full: {formatCurrency(remaining)}</button>
                  </div>
                  <button onClick={() => recordPayment(tx)} className="w-full mt-4 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700">Record Payment</button>
                </div>
              </div>
            );
          })()}

          {currentView === 'ai' && (
            <AIAssistant
              businessName={localStorage.getItem('khotsopay_business') || 'SME'}
              transactions={allTransactions}
              products={products}
              onlineStatus={onlineStatus}
              language={appLanguage}
            />
          )}

          {currentView === 'analytics' && (
            <div className="space-y-6">
              <h2 className="sf-h1">Analytics Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="sf-card p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-purple-600" /> Revenue Overview</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-600">Total Revenue</span><span className="font-bold tabular-nums">{formatCurrency(stats.totalRevenue)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Average Sale</span><span className="font-bold tabular-nums">{formatCurrency(stats.totalRevenue / (sales.length || 1))}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Total Expenses</span><span className="font-bold text-red-600 tabular-nums">{formatCurrency(totalExpenses)}</span></div>
                    <div className="flex justify-between border-t pt-3"><span className="text-slate-900 font-bold">Net Profit</span><span className={`font-black tabular-nums ${stats.totalRevenue - totalExpenses >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(stats.totalRevenue - totalExpenses)}</span></div>
                  </div>
                </div>
                <div className="sf-card p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Wallet size={20} className="text-purple-600" /> Payment Methods</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm items-center"><span className="flex items-center gap-2"><div className="bg-white rounded px-1 border border-slate-200"><img src={MpesaLogo} alt="M-Pesa" className="h-4 w-auto" /></div>M-Pesa</span><span className="font-bold tabular-nums">{formatCurrency(stats.mpesaVolume)}</span></div>
                    <div className="flex justify-between text-sm items-center"><span className="flex items-center gap-2"><div className="bg-white rounded px-1 border border-slate-200"><img src={EcocashLogo} alt="EcoCash" className="h-4 w-auto" /></div>EcoCash</span><span className="font-bold tabular-nums">{formatCurrency(stats.ecocashVolume)}</span></div>
                    <div className="flex justify-between text-sm items-center"><span className="flex items-center gap-2"><CreditCard size={16} />Card</span><span className="font-bold tabular-nums">{formatCurrency(dailyStats.card)}</span></div>
                    <div className="flex justify-between text-sm items-center"><span className="flex items-center gap-2"><Wallet size={16} />Cash</span><span className="font-bold tabular-nums">{formatCurrency(stats.totalRevenue - stats.mpesaVolume - stats.ecocashVolume - dailyStats.card)}</span></div>
                  </div>
                </div>
              </div>
              <div className="sf-card p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Package size={20} className="text-purple-600" /> {businessMode === 'products' ? 'Top Selling Products' : 'Top Services'}</h3>
                {productAnalytics.topProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3"><Package size={22} className="text-slate-400" /></div>
                    <p className="font-semibold text-slate-700 text-sm">No data yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {productAnalytics.topProducts.map((p, i) => (
                      <div key={p.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">{i + 1}</span>
                          <div><p className="font-medium text-sm">{p.name}</p><p className="text-xs text-slate-400">{p.sales} sale(s)</p></div>
                        </div>
                        <span className="font-bold text-purple-600 tabular-nums">{formatCurrency(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentView === 'wallet' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-3xl p-8 text-white shadow-lg">
                <p className="text-sm opacity-80 mb-2">Available Balance</p>
                <p className="text-4xl md:text-5xl font-bold tabular-nums">{formatCurrency(stats.totalRevenue - stats.totalPending - totalExpenses)}</p>
                <p className="text-xs opacity-70 mt-2">Pending (debts): {formatCurrency(stats.totalPending)}</p>
                <p className="text-xs opacity-70 mt-1">Total expenses: {formatCurrency(totalExpenses)}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="sf-card p-4"><TrendingUp className="text-emerald-600 mb-2" size={24} /><p className="text-2xl font-bold tabular-nums">{formatCurrency(dailyStats.revenue)}</p><p className="text-xs text-slate-500">Today's revenue</p></div>
                <div className="sf-card p-4"><Receipt className="text-red-600 mb-2" size={24} /><p className="text-2xl font-bold tabular-nums">{formatCurrency(dailyStats.expenses)}</p><p className="text-xs text-slate-500">Today's expenses</p></div>
                <div className="sf-card p-4"><Wallet className="text-purple-600 mb-2" size={24} /><p className="text-2xl font-bold tabular-nums">{formatCurrency(dailyStats.profit)}</p><p className="text-xs text-slate-500">Today's profit</p></div>
              </div>
            </div>
          )}

          {currentView === 'profile' && (
            <div className="space-y-6">
              <div className="sf-card p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"><User size={48} className="text-white" /></div>
                  <div className="text-center md:text-left flex-1">
                    <h2 className="text-2xl font-bold">{profileForm.businessName || 'Merchant User'}</h2>
                    <p className="text-slate-500">{localStorage.getItem('khotsopay_user_email') || 'merchant@sme.ls'}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full"><ShieldCheck size={12} /> {modeLabel(businessMode)} business</span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full"><CheckCircle2 size={12} /> Active</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sf-card p-6">
                <h3 className="text-xl font-bold mb-2">Business Mode</h3>
                <p className="text-sm text-slate-500 mb-4">Currently: <strong>{modeLabel(businessMode)}</strong>. Changing this changes what features you see.</p>
                <button
                  onClick={() => {
                    if (confirm('Change your business mode? You can pick again on the next screen.')) {
                      const email = localStorage.getItem('khotsopay_user_email') || 'anon';
                      localStorage.removeItem(`khotsopay_businessMode_${email}`);
                      setBusinessMode(null);
                    }
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200"
                >
                  Change Business Mode
                </button>
              </div>

              <div className="sf-card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Personal Information</h3>
                  <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700">
                    {isEditing ? <X size={16} /> : <Edit3 size={16} />}{isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Business Name', key: 'businessName' as const, type: 'text' },
                    { label: 'Owner Full Name', key: 'fullName' as const, type: 'text' },
                    { label: 'Phone Number', key: 'phone' as const, type: 'tel' },
                    { label: 'Business Address', key: 'address' as const, type: 'textarea' },
                    { label: 'Tax ID', key: 'taxId' as const, type: 'text' }
                  ].map((f) => (
                    <div key={f.key} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider md:col-span-1">{f.label}</label>
                      <div className="md:col-span-2">
                        {isEditing ? (
                          f.type === 'textarea' ? <textarea value={profileForm[f.key]} onChange={(e) => setProfileForm({ ...profileForm, [f.key]: e.target.value })} rows={3} className="w-full p-3 bg-slate-50 rounded-xl text-sm border border-slate-200" /> :
                          <input type={f.type} value={profileForm[f.key]} onChange={(e) => setProfileForm({ ...profileForm, [f.key]: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl text-sm border border-slate-200" />
                        ) : <p className="text-base">{profileForm[f.key] || 'Not set'}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                {isEditing && (
                  <div className="flex gap-3 mt-6 pt-4 border-t">
                    <button onClick={handleSaveProfile} className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Save size={18} /> Save</button>
                    <button onClick={() => { setIsEditing(false); loadProfileData(); }} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">Cancel</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentView === 'settings' && (
            <div className="space-y-6">
              <h2 className="sf-h1">Settings</h2>
              <div className="sf-card p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Bell size={20} className="text-purple-600" /> Notifications</h3>
                <div className="space-y-4">
                  {(['emailAlerts', 'dailyReport'] as const).map((key) => (
                    <label key={key} className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="font-medium">{key === 'emailAlerts' ? 'Email Alerts' : 'Daily Report'}</p>
                        <p className="text-xs text-slate-500">{key === 'emailAlerts' ? 'Receive transaction alerts' : 'Receive daily summary'}</p>
                      </div>
                      <button onClick={() => { const v = !notifications[key]; setNotifications({ ...notifications, [key]: v }); localStorage.setItem(`khotsopay_${key}`, String(v)); }} className={`w-12 h-6 rounded-full relative ${notifications[key] ? 'bg-purple-600' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 h-5 w-5 bg-white rounded-full transition-all ${notifications[key] ? 'left-6' : 'left-0.5'}`} />
                      </button>
                    </label>
                  ))}
                </div>
              </div>
              <div className="sf-card p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Settings size={20} className="text-purple-600" /> Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Language</label>
                    <select value={appLanguage} onChange={(e) => setAppLanguage(e.target.value as 'en' | 'st')} className="w-full p-3 bg-slate-50 rounded-xl text-sm border border-slate-200"><option value="en">English</option><option value="st">Sesotho</option></select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Date Format</label>
                    <select value={dateFormat} onChange={(e) => { setDateFormat(e.target.value); localStorage.setItem('khotsopay_dateFormat', e.target.value); }} className="w-full p-3 bg-slate-50 rounded-xl text-sm border border-slate-200"><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="MM/DD/YYYY">MM/DD/YYYY</option></select>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200">
                  <label className="block text-sm font-bold mb-2">Onboarding</label>
                  <button
                    onClick={() => {
                      localStorage.removeItem('khotsopay_onboarded');
                      setShowOnboarding(true);
                    }}
                    className="w-full p-3 bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 text-left"
                  >
                    Show tour again
                  </button>
                  <p className="text-xs text-slate-500 mt-2">
                    Replay the introduction to how the app works.
                  </p>
                </div>
              </div>
              <div className="sf-card p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ShieldCheck size={20} className="text-purple-600" /> Data Management</h3>
                <div className="space-y-3">
                  <button onClick={exportToExcel} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2"><FileText size={16} /> Export to Excel</button>
                  <button onClick={exportToCSV} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 flex items-center justify-center gap-2"><Download size={16} /> Export to CSV</button>
                </div>
              </div>
            </div>
          )}

          <footer className="mt-16 pt-8 border-t border-slate-200 pb-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">SF</div>
                <div><p className="text-sm font-bold leading-none">SME Finance</p><p className="text-[10px] font-medium text-slate-500 mt-1">Merchant Suite · {modeLabel(businessMode)}</p></div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
                <div className={`h-1.5 w-1.5 rounded-full ${onlineStatus ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-[10px] font-bold uppercase text-slate-600 tracking-wider">Lesotho · LSL</span>
              </div>
            </div>
          </footer>
        </main>

        <button
          onClick={() => setAiDrawerOpen(true)}
          aria-label="Open AI Assistant"
          className="fixed bottom-24 right-4 md:bottom-24 md:right-6 z-40 flex items-center gap-2 bg-gradient-to-br from-purple-600 to-purple-800 text-white px-4 py-3 rounded-full shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-105 active:scale-95 transition-all group"
        >
          <Bot size={20} className="group-hover:rotate-12 transition-transform" />
          <span className="hidden md:inline text-sm font-bold">Ask AI</span>
        </button>

        {aiDrawerOpen && (
          <>
            <div
              className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setAiDrawerOpen(false)}
            />
            <aside className="fixed top-0 right-0 bottom-0 z-[90] w-full sm:w-[480px] bg-slate-50 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <Bot size={16} className="text-purple-700" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">AI Assistant</p>
                </div>
                <button
                  onClick={() => setAiDrawerOpen(false)}
                  aria-label="Close AI Assistant"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <AIAssistant
                  businessName={localStorage.getItem('khotsopay_business') || 'SME'}
                  transactions={allTransactions}
                  products={products}
                  onlineStatus={onlineStatus}
                  language={appLanguage}
                />
              </div>
            </aside>
          </>
        )}

        <button onClick={() => { document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Scroll to top"
          className={`fixed bottom-6 right-4 md:right-6 z-40 p-3 rounded-full bg-slate-900 text-white shadow-2xl transition-all ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <ArrowUp size={20} strokeWidth={3} />
        </button>
      </div>
    </HelmetProvider>
  );
}
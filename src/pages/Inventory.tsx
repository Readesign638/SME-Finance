import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Search, Trash2, Edit3, X, Save,
  Package, AlertTriangle, Boxes, TrendingUp, Wallet
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  addStock
} from '../services/inventoryService';
import type { Product } from '../types/product';
import { formatCurrency } from '../utils/formatters';

interface InventoryProps {
  userId: string;
}

const Inventory: React.FC<InventoryProps> = ({ userId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState('1');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    buyingPrice: '',
    sellingPrice: '',
    stockQuantity: '',
    lowStockThreshold: '5',
    category: ''
  });

  // Subscribe to products in Firestore
  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, 'products'), where('userId', '==', userId));

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const items = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Product[];
      setProducts(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, searchTerm]);

  // Inventory stats
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalStockValue = products.reduce(
      (sum, p) => sum + p.buyingPrice * p.stockQuantity,
      0
    );
    const lowStock = products.filter(
      p => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold
    ).length;
    const outOfStock = products.filter(p => p.stockQuantity === 0).length;

    return { totalProducts, totalStockValue, lowStock, outOfStock };
  }, [products]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      buyingPrice: '',
      sellingPrice: '',
      stockQuantity: '',
      lowStockThreshold: '5',
      category: ''
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  // Open add form
  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open edit form
  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      buyingPrice: product.buyingPrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      stockQuantity: product.stockQuantity.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      category: product.category || ''
    });
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name.trim(),
      buyingPrice: parseFloat(formData.buyingPrice) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      lowStockThreshold: parseInt(formData.lowStockThreshold) || 5,
      category: formData.category.trim() || 'General'
    };

    if (!data.name) {
      alert('Product name is required.');
      return;
    }

    if (data.sellingPrice <= 0) {
      alert('Selling price must be greater than 0.');
      return;
    }

    try {
      if (editingId) {
        await updateProduct(editingId, data);
      } else {
        await createProduct(userId, data);
      }
      resetForm();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save product. Check your internet connection.');
    }
  };

  // Delete product
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(id);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete product.');
    }
  };

  // Restock
  const handleRestock = async () => {
    if (!restockId) return;
    const qty = parseInt(restockQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Enter a valid quantity.');
      return;
    }
    try {
      await addStock(restockId, qty);
      setRestockId(null);
      setRestockQty('1');
    } catch (error) {
      console.error('Restock failed:', error);
      alert('Failed to restock.');
    }
  };

  // Get stock status
  const getStockStatus = (product: Product) => {
    if (product.stockQuantity === 0) {
      return { label: 'OUT', color: 'bg-red-100 text-red-700 border-red-200' };
    }
    if (product.stockQuantity <= product.lowStockThreshold) {
      return { label: 'LOW', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { label: 'OK', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Inventory
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Track your products and stock
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-3 bg-purple-600 text-white px-6 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-purple-200 hover:bg-purple-700 transition active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          Add Product
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100">
          <Package className="text-purple-600 mb-2" size={22} />
          <p className="text-2xl font-bold tabular-nums">{stats.totalProducts}</p>
          <p className="text-xs text-slate-500 uppercase font-bold">Products</p>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100">
          <Wallet className="text-emerald-600 mb-2" size={22} />
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(stats.totalStockValue)}</p>
          <p className="text-xs text-slate-500 uppercase font-bold">Stock Value</p>
        </div>
        <div className="bg-amber-50 p-4 md:p-5 rounded-2xl shadow-sm border border-amber-200">
          <AlertTriangle className="text-amber-600 mb-2" size={22} />
          <p className="text-2xl font-bold tabular-nums">{stats.lowStock}</p>
          <p className="text-xs text-amber-700 uppercase font-bold">Low Stock</p>
        </div>
        <div className="bg-red-50 p-4 md:p-5 rounded-2xl shadow-sm border border-red-200">
          <AlertTriangle className="text-red-600 mb-2" size={22} />
          <p className="text-2xl font-bold tabular-nums">{stats.outOfStock}</p>
          <p className="text-xs text-red-700 uppercase font-bold">Out of Stock</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search products…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-200 focus:border-purple-300 focus:ring-4 focus:ring-purple-50 font-medium outline-none"
        />
      </div>

      {/* Empty state */}
      {filteredProducts.length === 0 && products.length === 0 && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <Boxes size={64} className="text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No products yet</h2>
          <p className="text-slate-500 mb-6">
            Add your first product to start tracking your stock.
          </p>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-3 bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition active:scale-95"
          >
            <Plus size={20} />
            Add Your First Product
          </button>
        </div>
      )}

      {/* Products list */}
      {filteredProducts.length > 0 && (
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const status = getStockStatus(product);
            const profitPerUnit = product.sellingPrice - product.buyingPrice;

            return (
              <div key={product.id} className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between gap-4">

                  {/* Left: Product info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    {product.category && (
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-2">
                        {product.category}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Stock</p>
                        <p className="font-bold text-slate-900 tabular-nums">{product.stockQuantity}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Buy</p>
                        <p className="font-bold text-slate-700 tabular-nums">{formatCurrency(product.buyingPrice)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Sell</p>
                        <p className="font-bold text-slate-700 tabular-nums">{formatCurrency(product.sellingPrice)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Profit/Unit</p>
                        <p className={`font-bold tabular-nums ${profitPerUnit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(profitPerUnit)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex md:flex-col gap-2 md:justify-center">
                    <button
                      onClick={() => setRestockId(product.id)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs uppercase hover:bg-emerald-100 transition"
                    >
                      <TrendingUp size={14} />
                      Restock
                    </button>
                    <button
                      onClick={() => handleEdit(product)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl font-bold text-xs uppercase hover:bg-purple-100 transition"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl font-bold text-xs uppercase hover:bg-red-100 transition"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search empty state */}
      {filteredProducts.length === 0 && products.length > 0 && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
          <p className="text-slate-500">No products match "{searchTerm}"</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}
        >
          <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl p-6 md:p-10 shadow-2xl relative max-h-[95vh] overflow-y-auto">
            <button
              onClick={resetForm}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100"
              aria-label="Close"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-slate-900 mb-8">
              {editingId ? 'Edit Product' : 'Add Product'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1 block mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="E.g., Bread"
                  className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1 block mb-2">
                  Category (optional)
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="E.g., Food"
                  className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1 block mb-2">
                    Buying Price (LSL) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.buyingPrice}
                    onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1 block mb-2">
                    Selling Price (LSL) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 font-bold tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1 block mb-2">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    placeholder="0"
                    className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1 block mb-2">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    placeholder="5"
                    className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 font-bold tabular-nums"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-purple-700 transition flex items-center justify-center gap-3 active:scale-[0.99]"
              >
                <Save size={20} />
                {editingId ? 'Save Changes' : 'Add Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setRestockId(null); setRestockQty('1'); } }}
        >
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Restock Product
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              How many units are you adding to stock?
            </p>
            <input
              type="number"
              min="1"
              autoFocus
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 font-bold text-3xl text-purple-600 text-center mb-6 tabular-nums"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRestockId(null); setRestockQty('1'); }}
                className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRestock}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition active:scale-95"
              >
                Add Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
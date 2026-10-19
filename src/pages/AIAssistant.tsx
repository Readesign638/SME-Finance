import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bot, Send, WifiOff, Sparkles, AlertCircle, Loader2,
  Copy, Check, RotateCcw, User, Trash2
} from 'lucide-react';
import { askGemini, type BusinessContext } from '../services/gemini';
import type { Transaction } from '../types/schema';
import type { Product } from '../types/product';

interface AIAssistantProps {
  businessName: string;
  transactions: Transaction[];
  products: Product[];
  onlineStatus: boolean;
  language: 'en' | 'st';
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
}

function getChatStorageKey(): string {
  const email = localStorage.getItem('khotsopay_user_email') || 'anon';
  return `khotsopay_ai_chat_${email}`;
}

function buildSuggestions(
  question: string,
  ctx: BusinessContext,
  language: 'en' | 'st'
): string[] {
  const q = question.toLowerCase();
  const en: string[] = [];
  const st: string[] = [];

  if (/owe|debt|kolot|pending|unpaid/.test(q)) {
    en.push('Draft a reminder message for debtors', 'How do I reduce unpaid debts?');
    st.push('Ngola molaetsa oa ho hopotsa ba kolotang', 'Nka fokotsa sekoloto joang?');
  } else if (/expense|spend|cost|litšenyehelo|tšebeliso/.test(q)) {
    en.push('How do I reduce my expenses?', 'Which category costs me most?');
    st.push('Nka fokotsa litšenyehelo joang?', 'Ke karolo efe e nkostsang haholo?');
  } else if (/profit|margin|phallo|pholokelo/.test(q)) {
    en.push('How can I increase profit?', 'What is my profit margin?');
    st.push('Nka eketsa pholokelo joang?', 'Pholokelo ea ka ke efe?');
  } else if (/sell|revenue|sale|chelete|thekiso/.test(q)) {
    en.push('What is my profit margin?', 'Which days sell the most?');
    st.push('Phallo ea ka ke efe?', 'Ke matsatsi afe a rekisoang haholo?');
  } else if (/stock|inventory|thepa|restock|low/.test(q)) {
    en.push('What should I restock first?', 'What is my stock worth?');
    st.push('Ke lokela ho tlatsa eng pele?', 'Thepa ea ka e bokae?');
  } else if (/cash|flow|balance/.test(q)) {
    en.push('How can I improve cash flow?', 'What are my biggest expenses?');
    st.push('Nka ntlafatsa phallo ea chelete joang?', 'Litšenyehelo tse kholo ke life?');
  } else {
    en.push('Summarize my finances', 'Who owes me money?', 'Am I making a profit?');
    st.push('Kakaretso ea lichelete', 'Ke mang ea ntseng a kolota?', 'Na ke etsa pholokelo?');
  }

  if (ctx.lowStockCount > 0) {
    en.push(`I have ${ctx.lowStockCount} low-stock items — what to reorder?`);
    st.push(`Ke na le ${ctx.lowStockCount} thepa e felang — ke reke eng?`);
  }
  if (ctx.totalPending > 0) {
    en.push(`Customers owe me M${ctx.totalPending.toFixed(2)} — how to collect?`);
    st.push(`Bareki ba nkolota M${ctx.totalPending.toFixed(2)} — nka e bokella joang?`);
  }

  const pool = language === 'st' ? st : en;
  return Array.from(new Set(pool)).slice(0, 3);
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  businessName,
  transactions,
  products,
  onlineStatus,
  language
}) => {
  const welcomeText =
    language === 'st'
      ? 'Lumela! Ke mothusi oa hau oa lichelete. Botsa lipotso ka khoebo ea hau.'
      : 'Hello! I am your financial assistant. Ask me anything about your business.';

  const storageKey = useMemo(() => getChatStorageKey(), []);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as Message[];
        }
      }
    } catch {}
    return [
      {
        id: 'welcome',
        role: 'ai',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString('en-LS', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  const buildContext = (): BusinessContext => {
    const todayStr = new Date().toLocaleDateString('en-LS', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    const todayTx = transactions.filter(t => t.date === todayStr);

    // Only count SALES as revenue (not expenses, not pending)
    const salesOnly = transactions.filter(t => t.status === 'Completed' && t.type !== 'expense');
    const expensesOnly = transactions.filter(t => t.type === 'expense');

    const totalRevenue = salesOnly.reduce((s, t) => s + t.amount, 0);
    const totalPending = transactions.filter(t => t.status === 'Pending').reduce((s, t) => s + t.amount, 0);

    const todayRevenue = todayTx
      .filter(t => t.status === 'Completed' && t.type !== 'expense')
      .reduce((s, t) => s + t.amount, 0);

    const todayOwed = todayTx
      .filter(t => t.status === 'Pending')
      .reduce((s, t) => s + t.amount, 0);

    // NEW: expenses
    const totalExpenses = expensesOnly.reduce((s, t) => s + t.amount, 0);
    const todayExpenses = todayTx
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    // Build top products from sales only (not expenses)
    const salesMap = new Map<string, { sales: number; revenue: number }>();
    salesOnly
      .filter(t => t.items)
      .forEach(t => {
        const itemsText = t.items || '';
        if (!itemsText) return;
        itemsText.split(',').map(i => i.trim()).forEach(item => {
          const existing = salesMap.get(item) || { sales: 0, revenue: 0 };
          salesMap.set(item, { sales: existing.sales + 1, revenue: existing.revenue + t.amount });
        });
      });

    const topProducts = Array.from(salesMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const lowStockCount = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold).length;
    const outOfStockCount = products.filter(p => p.stockQuantity === 0).length;
    const totalStockValue = products.reduce((s, p) => s + p.buyingPrice * p.stockQuantity, 0);

    const recentTransactions = [...transactions].slice(0, 5).map(t => ({
      name: t.type === 'expense' ? `[Expense] ${t.name}` : t.name,
      items: t.items || '-',
      amount: t.amount,
      status: t.type === 'expense' ? 'Expense' : t.status === 'Completed' ? 'Paid' : 'Owed'
    }));

    return {
      businessName,
      totalRevenue,
      totalPending,
      todayRevenue,
      todayOwed,
      totalProducts: products.length,
      lowStockCount,
      outOfStockCount,
      totalStockValue,
      topProducts,
      recentTransactions,
      totalExpenses,
      todayExpenses
    };
  };

  const sendQuestion = async (question: string) => {
    if (!question || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString('en-LS', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    if (!onlineStatus) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'ai',
          text: language === 'st'
            ? 'AI e hloka inthanete. Ka kopo kopanya hape ebe u botsa.'
            : 'The AI Assistant needs internet. Please reconnect and try again.',
          timestamp: new Date().toLocaleTimeString('en-LS', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setLoading(false);
      return;
    }

    try {
      const context = buildContext();
      const response = await askGemini(question, context, language);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'ai',
          text: response,
          timestamp: new Date().toLocaleTimeString('en-LS', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (error) {
      console.error('AI error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'ai',
          text: language === 'st'
            ? 'Ka masoabi, ho na le bothata. Ka kopo leka hape.'
            : 'Sorry, something went wrong. Please try again.',
          timestamp: new Date().toLocaleTimeString('en-LS', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendQuestion(input.trim());
  const handleQuickPrompt = (prompt: string) => setInput(prompt);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleRetry = () => {
    if (loading) return;
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    setMessages(prev => {
      const lastAiIdx = [...prev].reverse().findIndex(m => m.role === 'ai' && m.id !== 'welcome');
      if (lastAiIdx === -1) return prev;
      const idx = prev.length - 1 - lastAiIdx;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
    sendQuestion(lastUser.text);
  };

  const handleClearChat = () => {
    if (!confirm(language === 'st' ? 'Hlakola nalane ea puisano?' : 'Clear chat history?')) return;
    const fresh: Message[] = [
      {
        id: 'welcome',
        role: 'ai',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString('en-LS', { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setMessages(fresh);
    try {
      localStorage.setItem(storageKey, JSON.stringify(fresh));
    } catch {}
  };

  const suggestions = useMemo(() => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser) {
      return language === 'st'
        ? ['Kakaretso ea lichelete', 'Ke mang ea ntseng a kolota?', 'Na ke etsa pholokelo?']
        : ['Summarize my finances', 'Who owes me money?', 'Am I making a profit?'];
    }
    const lastAi = [...messages].reverse().find(m => m.role === 'ai' && m.id !== 'welcome');
    if (!lastAi || loading) return [];
    return buildSuggestions(lastUser.text, buildContext(), language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading, language, transactions, products, businessName]);

  const lastAiMessageId = useMemo(() => {
    const lastAi = [...messages].reverse().find(m => m.role === 'ai' && m.id !== 'welcome');
    return lastAi?.id ?? null;
  }, [messages]);

  const hasUserMessages = messages.some(m => m.role === 'user');

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 py-2">
        <div className="p-2.5 bg-purple-100 rounded-2xl">
          <Bot size={22} className="text-purple-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">AI Business Assistant</h1>
          <p className="text-xs text-slate-500">
            {language === 'st' ? 'Botsa ka khoebo ea hau' : 'Ask about your business finances'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {hasUserMessages && (
            <button
              onClick={handleClearChat}
              aria-label="Clear chat history"
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
              title={language === 'st' ? 'Hlakola puisano' : 'Clear chat'}
            >
              <Trash2 size={16} />
            </button>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider border border-purple-100">
            <Sparkles size={10} /> Beta
          </span>
        </div>
      </div>

      {/* Value banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-sm text-purple-800">
        {language === 'st' ? (
          <>
            <strong>Hobaneng u sebelisa AI?</strong> E bala lintlha tsa hau tsa 'nete tsa lichelete le thepa ho u fa likarabo tsa hang-hang mabapi le phallo ea chelete, mekoloto le boemo ba thepa—ho u thusa ho etsa liqeto kapele.
          </>
        ) : (
          <>
            <strong>Why use the AI?</strong> It reads your real transaction and inventory data to give you instant answers about cash flow, debts, profit, and stock levels—helping you make faster decisions.
          </>
        )}
      </div>

      {/* Offline warning */}
      {!onlineStatus && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <WifiOff className="text-amber-600 flex-shrink-0" size={22} />
          <div>
            <p className="font-bold text-amber-800 text-sm">You are offline</p>
            <p className="text-amber-700 text-xs">
              The AI Assistant needs internet to work. Reconnect and try again.
            </p>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="sf-card overflow-hidden">
        <div className="p-4 md:p-6 space-y-4 max-h-[520px] overflow-y-auto sf-scroll">
          {messages.map((message) => {
            const isLastAi = message.id === lastAiMessageId;
            const isCopied = copiedId === message.id;
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Bot size={18} className="text-purple-700" />
                  </div>
                )}

                <div className="max-w-[80%]">
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                    <p className={`text-[10px] mt-2 ${message.role === 'user' ? 'text-purple-200' : 'text-slate-400'}`}>
                      {message.timestamp}
                    </p>
                  </div>

                  {message.role === 'ai' && message.id !== 'welcome' && (
                    <div className="flex items-center gap-1 mt-1.5 ml-1">
                      <button
                        onClick={() => handleCopy(message.id, message.text)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition"
                        title="Copy answer"
                        aria-label="Copy answer"
                      >
                        {isCopied ? (
                          <>
                            <Check size={12} className="text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {isLastAi && (
                        <button
                          onClick={handleRetry}
                          disabled={loading || !onlineStatus}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          title="Regenerate answer"
                          aria-label="Retry"
                        >
                          <RotateCcw size={12} />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
                    <User size={16} />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Bot size={18} className="text-purple-700" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm">
                <Loader2 size={16} className="animate-spin text-purple-600" />
                <span className="text-sm text-slate-500">Thinking…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* First-time quick prompts */}
        {messages.length <= 1 && (
          <div className="px-4 md:px-6 pb-4">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Quick questions</p>
            <div className="flex flex-wrap gap-2">
              {[
                language === 'st' ? 'Kakaretso ea lichelete' : 'Summarize my finances',
                language === 'st' ? 'Na ke etsa pholokelo?' : 'Am I making a profit?',
                language === 'st' ? 'Litšenyehelo tse kholo ke life?' : 'What are my biggest expenses?',
                language === 'st' ? 'Ke mang ea ntseng a kolota?' : 'Who owes me money?',
                language === 'st' ? 'Thepa e rekisoang haholo' : 'Top selling products',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full text-xs font-semibold transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Contextual follow-ups */}
        {suggestions.length > 0 && (
          <div className="px-4 md:px-6 pb-4 border-t border-slate-100 pt-3">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-1">
              <Sparkles size={12} className="text-purple-500" />
              {language === 'st' ? 'Tsoela pele ho botsa' : 'Suggested follow-ups'}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendQuestion(prompt)}
                  disabled={loading || !onlineStatus}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 text-slate-600 rounded-full text-xs font-semibold transition disabled:opacity-40"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-100 p-4 md:p-5">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={language === 'st' ? 'Botsa ka lichelete tsa hau…' : 'Ask about your finances…'}
              rows={1}
              disabled={loading || !onlineStatus}
              aria-label="Message the AI assistant"
              className="flex-1 p-3.5 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-purple-100 font-medium resize-none disabled:opacity-50 text-sm"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim() || !onlineStatus}
              aria-label="Send message"
              className="px-5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-2xl font-semibold flex items-center transition active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>

          <div className="mt-3 flex items-start gap-2 bg-slate-50 rounded-xl p-3">
            <AlertCircle size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {language === 'st'
                ? 'AI e fana ka tlhahisoleseding feela, eseng likeletso tsa lichelete tse tebileng. Iketsetse liqeto tsa hau.'
                : 'AI provides information only, not professional financial advice. You make the final decisions.'}
            </p>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="sf-card p-6">
        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-purple-600" />
          {language === 'st' ? 'U ka botsa' : 'You can ask'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
          <div className="flex items-start gap-2"><span className="text-purple-600">•</span><span>"Am I making a profit?"</span></div>
          <div className="flex items-start gap-2"><span className="text-purple-600">•</span><span>"What are my biggest expenses?"</span></div>
          <div className="flex items-start gap-2"><span className="text-purple-600">•</span><span>"How much did I sell today?"</span></div>
          <div className="flex items-start gap-2"><span className="text-purple-600">•</span><span>"Who owes me money?"</span></div>
          <div className="flex items-start gap-2"><span className="text-purple-600">•</span><span>"Which products sell best?"</span></div>
          <div className="flex items-start gap-2"><span className="text-purple-600">•</span><span>"What should I restock?"</span></div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
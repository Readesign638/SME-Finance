import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  X, HelpCircle, Scale, MessageCircle, Mail, Phone, BookOpen,
  ChevronRight, Search,
} from 'lucide-react';
import LegalGuide from './LegalGuide';

interface HelpCenterProps {
  onClose: () => void;
  onContactSupport?: () => void;
}

type HelpView = 'home' | 'legal';

const FAQS = [
  {
    q: 'How do I record a sale?',
    a: 'Tap "Record Sale" on the Dashboard, enter the customer name, add products (Products mode) or a description (Services mode), then confirm the payment method.',
  },
  {
    q: 'How do I send a debt reminder?',
    a: 'Go to Transactions → Debts. For each debtor with a phone number, tap the WhatsApp, SMS, or Email icon to send a reminder.',
  },
  {
    q: 'What is the difference between a sale and a debt?',
    a: 'A sale is paid immediately. A debt is recorded now but the customer pays later. Debts can be partially paid and tracked until fully settled.',
  },
  {
    q: 'How do I change my business mode?',
    a: 'Go to Profile → Change Business Mode. This changes which features you see (inventory only appears in Products mode).',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. Go to Settings → Data Management to export to Excel or CSV.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. Data is stored in Firebase (Google Cloud) with encryption in transit and at rest, and we comply with Lesotho\'s Data Protection Act 2012.',
  },
];

export default function HelpCenter({ onClose, onContactSupport }: HelpCenterProps) {
  const [view, setView] = useState<HelpView>('home');
  const [query, setQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(query.toLowerCase()) ||
      f.a.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Help Center | SME Finance</title>
        <meta
          name="description"
          content="Get help with SME Finance: FAQs, legal guide, and support contacts."
        />
      </Helmet>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-100 rounded-lg">
              <HelpCircle size={16} className="text-teal-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Help Center</p>
              <p className="text-[10px] text-slate-500">FAQs, legal, and support</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close help center"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {view === 'home' ? (
          <div className="p-5 md:p-6 max-h-[75vh] overflow-y-auto space-y-5">
            {/* Search */}
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search help topics…"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-teal-300 focus:ring-4 focus:ring-teal-50 outline-none text-sm font-medium"
              />
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setView('legal')}
                className="flex flex-col items-start gap-1 p-3 bg-teal-50 rounded-xl hover:bg-teal-100 text-left transition"
              >
                <Scale size={20} className="text-teal-600" />
                <span className="text-xs font-bold text-teal-800">Legal Guide</span>
                <span className="text-[10px] text-teal-600">Terms, privacy, tax</span>
              </button>
              <a
                href="mailto:support@smefinance.ls"
                className="flex flex-col items-start gap-1 p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 text-left transition"
              >
                <Mail size={20} className="text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800">Email Support</span>
                <span className="text-[10px] text-emerald-600">support@smefinance.ls</span>
              </a>
              <a
                href="tel:+26622311339"
                className="flex flex-col items-start gap-1 p-3 bg-amber-50 rounded-xl hover:bg-amber-100 text-left transition"
              >
                <Phone size={20} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-800">Call Us</span>
                <span className="text-[10px] text-amber-600">+266 2231 1339</span>
              </a>
              <a
                href="https://wa.me/26658123456"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-start gap-1 p-3 bg-slate-100 rounded-xl hover:bg-slate-200 text-left transition"
              >
                <MessageCircle size={20} className="text-slate-700" />
                <span className="text-xs font-bold text-slate-800">WhatsApp</span>
                <span className="text-[10px] text-slate-600">Chat with us</span>
              </a>
            </div>

            {/* FAQs */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <BookOpen size={16} className="text-teal-600" />
                Frequently Asked Questions
              </h3>
              {filteredFaqs.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No results for &quot;{query}&quot;.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {filteredFaqs.map((f, i) => (
                    <div
                      key={i}
                      className="border border-slate-200 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        <span>{f.q}</span>
                        <ChevronRight
                          size={14}
                          className={`text-slate-400 transition-transform ${
                            openFaq === i ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                      {openFaq === i && (
                        <div className="px-3 pb-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
                          {f.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {onContactSupport && (
              <button
                onClick={onContactSupport}
                className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors"
              >
                Contact Support
              </button>
            )}
          </div>
        ) : (
          <div className="p-5">
            <button
              onClick={() => setView('home')}
              className="text-xs font-bold text-teal-600 hover:underline mb-3"
            >
              ← Back to Help Center
            </button>
            {/* No outer card wrapper — render LegalGuide flat */}
            <LegalGuide onClose={() => setView('home')} />
          </div>
        )}
      </div>
    </>
  );
}
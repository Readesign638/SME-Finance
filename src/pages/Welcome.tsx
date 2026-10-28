import { useEffect, useState } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import {
  ArrowRight, ShieldCheck, Sparkles, TrendingUp,
  HandCoins, Boxes, CheckCircle2, Mail, Phone
} from 'lucide-react';
import { auth } from '../services/firebase';
import Logo from '../components/Logo';

const BACKGROUND_IMAGE =
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2400&auto=format&fit=crop';
// Alternative professional options (swap the URL above):
// Maseru / African business:  https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=2400&auto=format&fit=crop
// Market / shop:              https://images.unsplash.com/photo-1556740758-90de374c12ad?q=80&w=2400&auto=format&fit=crop
// Handshake / deal:           https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=2400&auto=format&fit=crop

const HIGHLIGHTS = [
  {
    icon: <TrendingUp size={22} />,
    title: 'Sales & payments',
    desc: 'Record M-Pesa, EcoCash, cash and card sales in seconds.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: <HandCoins size={22} />,
    title: 'Debts (Sekoloto)',
    desc: 'Track who owes you and send WhatsApp, SMS or email reminders.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: <Boxes size={22} />,
    title: 'Inventory & insights',
    desc: 'Manage stock, see real profit, and get AI-powered advice.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
];

export default function Welcome() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) navigate('/dashboard', { replace: true });
      else setChecking(false);
    });
    return () => unsub();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          {/* Replaced text "SF" with Logo component */}
          <div className="mx-auto">
            <Logo size="lg" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <Helmet>
        <title>SME Finance — Run your business smarter</title>
        <meta
          name="description"
          content="Record sales, track debts, manage inventory and grow with AI. Built for Lesotho SMEs."
        />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Helmet>

      <div className="relative min-h-screen text-white antialiased font-sans overflow-hidden">
        {/* Background image + overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${BACKGROUND_IMAGE}')` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/85 to-purple-900/80" />
        <div className="absolute inset-0 bg-slate-900/30" />

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <header className="w-full max-w-6xl mx-auto px-5 md:px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Replaced text "SF" with Logo component */}
              <Logo size="md" />
              <div>
                <p className="text-sm font-bold leading-none">SME Finance</p>
                <p className="text-[10px] font-medium text-white/60 mt-0.5">Lesotho</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition"
            >
              Sign in <ArrowRight size={14} />
            </button>
          </header>

          {/* Hero */}
          <main className="flex-1 w-full max-w-6xl mx-auto px-5 md:px-8 flex items-center">
            <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center w-full py-10 md:py-16">
              {/* Left: copy */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                  <Sparkles size={12} className="text-purple-300" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                    Built for Lesotho SMEs
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                  Run your business <span className="text-purple-300">smarter</span>.
                </h1>

                <p className="text-base md:text-lg text-white/80 max-w-lg leading-relaxed">
                  Record sales, track who owes you, manage stock, and grow — all in one simple app, made for small businesses in Lesotho.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-purple-600 text-white font-bold text-base hover:bg-purple-500 transition shadow-2xl shadow-purple-900/50"
                  >
                    Get started free
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-base hover:bg-white/20 transition"
                  >
                    I have an account
                  </button>
                </div>

                <div className="flex items-center gap-5 pt-2 text-xs text-white/70 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    Free to start
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Secure &amp; private
                  </span>
                </div>
              </div>

              {/* Right: 3 highlight cards stacked */}
              <div className="space-y-3">
                {HIGHLIGHTS.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 md:p-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl hover:bg-white/15 transition"
                  >
                    <div className={`flex-shrink-0 p-2.5 rounded-xl ${h.bg} ${h.color}`}>
                      {h.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">{h.title}</p>
                      <p className="text-xs text-white/70 leading-relaxed">{h.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="w-full max-w-6xl mx-auto px-5 md:px-8 py-5 border-t border-white/10">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-white/50">
              <p>© {new Date().getFullYear()} SME Finance · Made in Lesotho</p>
              <div className="flex items-center gap-4">
                <a href="mailto:support@smefinance.ls" className="hover:text-white transition flex items-center gap-1">
                  <Mail size={11} /> Support
                </a>
                <a href="tel:+26622311339" className="hover:text-white transition flex items-center gap-1">
                  <Phone size={11} /> Call
                </a>
                <span className="flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                  Lesotho · LSL
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </HelmetProvider>
  );
}
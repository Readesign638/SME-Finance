import React, { useState } from 'react';
import { Info, Package, HandCoins, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

type BusinessMode = 'products' | 'services' | 'debts';

interface OnboardingProps {
  onClose: () => void;
  language: 'en' | 'st';
  businessMode?: BusinessMode | null;
}

interface Slide {
  icon: typeof Info;
  titleEn: string;
  titleSt: string;
  bodyEn: string;
  bodySt: string;
  color: string;
  bg: string;
}

const SLIDES_BY_MODE: Record<BusinessMode, Slide[]> = {
  products: [
    {
      icon: Package,
      titleEn: 'Record sales and debts in seconds',
      titleSt: 'Rekota thekiso le mekoloto ka metsotsoana',
      bodyEn: 'Tap "Record Sale" to log a customer who pays now. Tap "Record Debt" to log a customer who will pay later. Sales must come from your inventory.',
      bodySt: 'Tobetsa "Rekota Thekiso" ho boloka moreki ea lefang hona joale. Tobetsa "Rekota Sekoloto" ho boloka moreki ea tla lefa hamorao. Thekiso e tlameha ho tsoa thepeng ea hau.',
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
    {
      icon: Info,
      titleEn: 'Add products before selling',
      titleSt: 'Kenya lihlahisoa pele u rekisa',
      bodyEn: 'Products mode requires inventory. If you tap Record Sale with no products, the app will ask you to add them first. This keeps your stock accurate.',
      bodySt: 'Mokhoa oa Lihlahisoa o hloka thepa. Haeba u tobetsa Rekota Thekiso ho se na lihlahisoa, app e tla u kopa ho li kenya pele. Sena se boloka thepa ea hau e nepahetse.',
      color: 'text-emerald-600',
      bg: 'bg-emerald-100'
    },
    {
      icon: Sparkles,
      titleEn: 'Let the AI read your numbers',
      titleSt: 'Tlohella AI e bale lipalo tsa hau',
      bodyEn: 'Open the AI tab to ask questions like "Who owes me?" or "What should I restock?" It reads your real data — no setup required.',
      bodySt: 'Bula tabo ea AI ho botsa lipotso tse joalo ka "Ke mang ea nkolotang?" kapa "Ke reke eng hape?" E bala data ea hau ea sebele.',
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    }
  ],
  services: [
    {
      icon: HandCoins,
      titleEn: 'Record what you did — no inventory needed',
      titleSt: 'Rekota seo u se entseng — ha ho hloke thepa',
      bodyEn: 'You offer services, so a "sale" is just a description and an amount — "Haircut + wash — M50". No products to track.',
      bodySt: 'U fana ka litšebeletso, kahoo "thekiso" ke tlhaloso le chelete feela — "Ho kuta moriri — M50". Ha ho lihlahisoa tse lokelang ho lateloa.',
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
    {
      icon: Info,
      titleEn: 'Record debts when someone owes you',
      titleSt: 'Rekota mekoloto ha motho a u kolota',
      bodyEn: 'Tap "Record Debt", type what they owe you for, add their phone number, and set a due date. The app will remind you (and them) when it\'s due.',
      bodySt: 'Tobetsa "Rekota Sekoloto", ngola hore na ba u kolota eng, kenya nomoro ea bona ea mohala, \'me u behe letsatsi la ho lefa.',
      color: 'text-amber-600',
      bg: 'bg-amber-100'
    },
    {
      icon: Sparkles,
      titleEn: 'Let the AI read your numbers',
      titleSt: 'Tlohella AI e bale lipalo tsa hau',
      bodyEn: 'Ask the AI: "Who owes me money?" or "How much did I make this week?" It reads your real data and answers instantly.',
      bodySt: 'Botsa AI: "Ke mang ea nkolotang?" kapa "Ke entse chelete e kae bekeng ee?" E bala data ea hau ea sebele.',
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    }
  ],
  debts: [
    {
      icon: HandCoins,
      titleEn: 'Track who owes you — nothing else',
      titleSt: 'Latela hore na ke mang ea u kolotang — ha ho letho le leng',
      bodyEn: 'This is a debt-tracking app for you. Tap "Record Debt" to log a customer: name, phone, amount owed, and due date. That\'s it.',
      bodySt: 'Ena ke app ea ho latela mekoloto. Tobetsa "Rekota Sekoloto" ho boloka moreki: lebitso, mohala, chelete e kolotang, le letsatsi la ho lefa.',
      color: 'text-amber-600',
      bg: 'bg-amber-100'
    },
    {
      icon: Info,
      titleEn: 'Send reminders in one tap',
      titleSt: 'Romela likhopotso ka ho tobetsa hanngoe',
      bodyEn: 'From the Debts tab, tap WhatsApp, SMS, or Email to remind a customer. The app writes the message — you just send it. Note: the customer needs a phone number on file.',
      bodySt: 'Ho tloha tabong ea Mekoloto, tobetsa WhatsApp, SMS, kapa Email ho hopotsa moreki. App e ngola molaetsa — u o romela feela.',
      color: 'text-emerald-600',
      bg: 'bg-emerald-100'
    },
    {
      icon: Sparkles,
      titleEn: 'Mark paid — revenue updates instantly',
      titleSt: 'Tšoaea e le e lefiloeng — chelete e ntšoa hang-hang',
      bodyEn: 'When a customer pays, tap "Record Payment" for partial payments, or "Mark Paid" for full payments. It moves from Debts to Sales and updates your cash-up summary.',
      bodySt: 'Ha moreki a lefa, tobetsa "Rekota Tefo" bakeng sa litefello tse sa fellang, kapa "Tšoaea e Lefiloe" bakeng sa tefo e felletseng.',
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    }
  ]
};

export const Onboarding: React.FC<OnboardingProps> = ({
  onClose,
  language,
  businessMode = 'products'
}) => {
  // Default to products slides if mode is unknown
  const mode: BusinessMode = businessMode || 'products';
  const slides = SLIDES_BY_MODE[mode];

  const [step, setStep] = useState(0);
  const isLast = step === slides.length - 1;
  const current = slides[step];
  const Icon = current.icon;
  const isSt = language === 'st';

  const handleNext = () => {
    if (isLast) onClose();
    else setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
      >
        {/* Skip */}
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition"
            aria-label="Skip tour"
          >
            {isSt ? 'Tlōla' : 'Skip'}
          </button>
        </div>

        {/* Icon */}
        <div className={`${current.bg} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5`}>
          <Icon className={current.color} size={32} />
        </div>

        {/* Title + body */}
        <div className="text-center mb-8 min-h-[140px]">
          <h2 id="onboarding-title" className="text-xl font-bold text-slate-900 mb-2">
            {isSt ? current.titleSt : current.titleEn}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {isSt ? current.bodySt : current.bodyEn}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-purple-600' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Nav */}
        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition"
            >
              <ArrowLeft size={16} />
              {isSt ? 'Morao' : 'Back'}
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-purple-700 transition active:scale-95"
          >
            {isLast ? (
              isSt ? 'Kea utloisisa!' : 'Got it!'
            ) : (
              <>
                {isSt ? 'E latelang' : 'Next'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {/* Step counter */}
        <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-4">
          {step + 1} / {slides.length}
        </p>
      </div>
    </div>
  );
};
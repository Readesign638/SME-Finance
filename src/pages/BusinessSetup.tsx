import { useState } from 'react';
import { Package, Scissors, HandCoins, ArrowRight, Sparkles } from 'lucide-react';

export type BusinessMode = 'products' | 'services' | 'debts';

interface BusinessSetupProps {
  onComplete: (mode: BusinessMode, businessType: string) => void;
  initialMode?: BusinessMode | null;
  language?: 'en' | 'st';
}

const TILES: Array<{
  mode: BusinessMode;
  icon: typeof Package;
  titleEn: string;
  titleSt: string;
  descEn: string;
  descSt: string;
  color: string;
  bg: string;
  ring: string;
  defaultType: string;
}> = [
  {
    mode: 'products',
    icon: Package,
    titleEn: 'I sell products',
    titleSt: 'Ke rekisa thepa',
    descEn: 'Shop, bakery, hardware, wholesale — anything with stock.',
    descSt: 'Lebenkele, bakery, hardware — ntho efe kapa efe e nang le stock.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    ring: 'ring-blue-500',
    defaultType: 'Retail'
  },
  {
    mode: 'services',
    icon: Scissors,
    titleEn: 'I offer services',
    titleSt: 'Ke fana ka litšebeletso',
    descEn: 'Hair, laundry, transport, repairs, tutoring — no stock needed.',
    descSt: 'Moriri, ho hlatsoa, lipalangoang — ha ho hloke stock.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    ring: 'ring-purple-500',
    defaultType: 'Services'
  },
  {
    mode: 'debts',
    icon: HandCoins,
    titleEn: 'I just track debts',
    titleSt: 'Ke latela mekoloto feela',
    descEn: 'Lending, stokvel, microloans — you only want to know who owes you.',
    descSt: 'Ho alima, stokvel — u batla feela ho tseba hore na ke mang ea u kolotang.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    ring: 'ring-amber-500',
    defaultType: 'Debts'
  }
];

export default function BusinessSetup({
  onComplete,
  initialMode = null,
  language = 'en'
}: BusinessSetupProps) {
  const [selected, setSelected] = useState<BusinessMode | null>(initialMode);
  const [saving, setSaving] = useState(false);

  const isSt = language === 'st';

  const handleContinue = () => {
    if (!selected) return;
    setSaving(true);
    const tile = TILES.find((t) => t.mode === selected)!;
    onComplete(selected, tile.defaultType);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 mb-4">
            <Sparkles size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isSt ? 'Boitokisetso' : 'Setup'} · {isSt ? 'Motsotso o le mong' : '1 minute'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-2">
            {isSt ? 'U etsa khoebo ea mofuta ofe?' : 'What kind of business do you run?'}
          </h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto">
            {isSt
              ? 'Re tla lokisa app ho latela khetho ea hau. U ka e fetola hamorao ho Profil.'
              : 'We\'ll set up the app to fit your business. You can change this later in Profile.'}
          </p>
        </div>

        {/* Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            const isActive = selected === tile.mode;
            return (
              <button
                key={tile.mode}
                type="button"
                onClick={() => setSelected(tile.mode)}
                aria-pressed={isActive}
                className={`group text-left p-5 sm:p-6 rounded-2xl bg-white border-2 transition-all ${
                  isActive
                    ? `border-transparent ring-2 ring-offset-2 ${tile.ring} shadow-lg scale-[1.02]`
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${tile.bg} flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${
                    isActive ? 'scale-110' : ''
                  }`}
                >
                  <Icon size={24} className={tile.color} />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">
                  {isSt ? tile.titleSt : tile.titleEn}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {isSt ? tile.descSt : tile.descEn}
                </p>
              </button>
            );
          })}
        </div>

        {/* Footer / CTA */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            {selected
              ? isSt
                ? `U khethile: ${TILES.find((t) => t.mode === selected)?.titleSt}`
                : `You picked: ${TILES.find((t) => t.mode === selected)?.titleEn}`
              : isSt
              ? 'Khetha e le \'ngoe ho tsoela pele'
              : 'Pick one to continue'}
          </p>
          <button
            onClick={handleContinue}
            disabled={!selected || saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition active:scale-95"
          >
            {saving ? (
              <span className="text-sm">{isSt ? 'E boloka…' : 'Saving…'}</span>
            ) : (
              <>
                <span className="text-sm">{isSt ? 'Tsoela pele' : 'Continue'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
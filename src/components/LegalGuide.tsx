import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { X, ShieldCheck, FileText, Scale, Download, ChevronRight } from 'lucide-react';

export type LegalSection =
  | 'overview' | 'terms' | 'privacy' | 'data-protection'
  | 'tax' | 'consumer-protection' | 'disputes';

interface LegalGuideProps {
  onClose?: () => void;
  initialSection?: LegalSection;
}

const SECTIONS: { id: LegalSection; title: string; icon: React.ReactNode }[] = [
  { id: 'overview', title: 'Overview', icon: <FileText size={16} /> },
  { id: 'terms', title: 'Terms of Service', icon: <Scale size={16} /> },
  { id: 'privacy', title: 'Privacy Policy', icon: <ShieldCheck size={16} /> },
  { id: 'data-protection', title: 'Data Protection', icon: <ShieldCheck size={16} /> },
  { id: 'tax', title: 'Tax Obligations', icon: <FileText size={16} /> },
  { id: 'consumer-protection', title: 'Consumer Protection', icon: <Scale size={16} /> },
  { id: 'disputes', title: 'Dispute Resolution', icon: <Scale size={16} /> },
];

const CONTENT: Record<LegalSection, { title: string; updated: string; body: React.ReactNode }> = {
  overview: {
    title: 'Legal Guide Overview',
    updated: '2025-01-01',
    body: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>Welcome to SME Finance. This Legal Guide explains your rights and responsibilities as a merchant using our platform, and how we handle your data in compliance with the laws of the Kingdom of Lesotho.</p>
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <p className="font-bold text-teal-900 mb-1">Important</p>
          <p className="text-teal-800">This guide is informational only and does not constitute legal advice. Consult a licensed Lesotho attorney for legal matters specific to your business.</p>
        </div>
        <h3 className="font-bold text-base mt-4">What's covered</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Terms of Service — the rules for using SME Finance</li>
          <li>Privacy Policy — how we collect, use, and protect your data</li>
          <li>Data Protection — your rights under Lesotho's Data Protection Act 2012</li>
          <li>Tax Obligations — your responsibilities with the Lesotho Revenue Authority (LRA)</li>
          <li>Consumer Protection — fair treatment of your customers</li>
          <li>Dispute Resolution — how to resolve issues</li>
        </ul>
      </div>
    ),
  },
  terms: {
    title: 'Terms of Service',
    updated: '2025-01-01',
    body: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <h3 className="font-bold">1. Acceptance of Terms</h3>
        <p>By using SME Finance you agree to these Terms. If you do not agree, you may not use the Service.</p>
        <h3 className="font-bold">2. Eligibility</h3>
        <p>You must be at least 18 and operating a legitimate business in Lesotho.</p>
        <h3 className="font-bold">3. Your Account</h3>
        <p>You are responsible for keeping your credentials confidential and for all activity under your account.</p>
        <h3 className="font-bold">4. Acceptable Use</h3>
        <p>You agree not to use the Service to violate Lesotho law, commit fraud or money laundering, record fictitious transactions, harass customers, or infringe on intellectual property.</p>
        <h3 className="font-bold">5. Debt Reminders</h3>
        <p>You are responsible for the content of reminders sent through the Service. Reminders must be professional, truthful, and compliant with the Consumer Protection Act 2001.</p>
        <h3 className="font-bold">6. Fees</h3>
        <p>Certain features may be subject to fees, clearly disclosed before charge.</p>
        <h3 className="font-bold">7. Limitation of Liability</h3>
        <p>The Service is provided "as is". We are not liable for indirect, incidental, or consequential damages.</p>
        <h3 className="font-bold">8. Termination</h3>
        <p>We may suspend accounts for violations. You may delete your account at any time.</p>
      </div>
    ),
  },
  privacy: {
    title: 'Privacy Policy',
    updated: '2025-01-01',
    body: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <h3 className="font-bold">What we collect</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account data:</strong> name, business name, email, phone</li>
          <li><strong>Transaction data:</strong> sales, debts, expenses, payment methods</li>
          <li><strong>Customer data:</strong> names, phones, emails you enter</li>
          <li><strong>Device data:</strong> browser type, IP, usage patterns</li>
        </ul>
        <h3 className="font-bold">How we use it</h3>
        <p>To provide the Service, send alerts and reminders you request, comply with the law, and generate your analytics.</p>
        <h3 className="font-bold">Sharing</h3>
        <p>We do not sell your data. We may share with Firebase (Google Cloud) for secure storage, payment processors you use, and law enforcement when required.</p>
        <h3 className="font-bold">Your rights</h3>
        <p>Access, correct, or delete your data anytime from Profile and Settings.</p>
        <h3 className="font-bold">Retention</h3>
        <p>Transaction data is retained 7 years to comply with LRA record-keeping.</p>
      </div>
    ),
  },
  'data-protection': {
    title: 'Data Protection (Lesotho)',
    updated: '2025-01-01',
    body: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>SME Finance complies with the <strong>Data Protection Act 2012</strong> of Lesotho.</p>
        <h3 className="font-bold">Your rights under the Act</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Access:</strong> request a copy of the personal data we hold</li>
          <li><strong>Rectification:</strong> correct inaccurate data</li>
          <li><strong>Erasure:</strong> request deletion (subject to legal retention)</li>
          <li><strong>Object:</strong> object to marketing processing</li>
          <li><strong>Complain:</strong> lodge a complaint with the Data Protection Commissioner</li>
        </ul>
        <h3 className="font-bold">How to exercise rights</h3>
        <p>Email <a href="mailto:privacy@smefinance.ls" className="text-teal-600 underline">privacy@smefinance.ls</a>. We respond within 30 days.</p>
        <h3 className="font-bold">Security</h3>
        <p>Encryption in transit and at rest, role-based access, and regular audits.</p>
        <h3 className="font-bold">Regulator</h3>
        <p>Data Protection Commissioner, Lesotho — info@dpc.org.ls</p>
      </div>
    ),
  },
  tax: {
    title: 'Tax Obligations',
    updated: '2025-01-01',
    body: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>As an SME in Lesotho you have obligations to the <strong>Lesotho Revenue Authority (LRA)</strong>.</p>
        <h3 className="font-bold">Common taxes</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>VAT:</strong> 15% on taxable supplies above M 1,000,000 annual turnover</li>
          <li><strong>Income Tax:</strong> on business profits</li>
          <li><strong>Withholding Tax:</strong> on certain contractor payments</li>
          <li><strong>PAYE:</strong> if you employ staff</li>
        </ul>
        <h3 className="font-bold">Record keeping</h3>
        <p>Keep records of all sales, purchases, and expenses for at least <strong>7 years</strong>.</p>
        <h3 className="font-bold">Tax Estimator</h3>
        <p>The in-app Tax Estimator is a guide only. Confirm your liability with the LRA or a qualified practitioner.</p>
        <h3 className="font-bold">LRA</h3>
        <p><a href="https://www.lra.org.ls" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline">lra.org.ls</a> · +266 2231 1339</p>
      </div>
    ),
  },
  'consumer-protection': {
    title: 'Consumer Protection',
    updated: '2025-01-01',
    body: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>When you record debts and send reminders, you must comply with the <strong>Consumer Protection Act 2001</strong>.</p>
        <h3 className="font-bold">Fair treatment</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide accurate, clear descriptions of goods/services on debts</li>
          <li>Do not misrepresent amounts owed</li>
          <li>Give reasonable notice before legal action</li>
        </ul>
        <h3 className="font-bold">Reminders</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Truthful and not misleading</li>
          <li>Do not contact before 7am or after 8pm</li>
          <li>Do not disclose a customer's debt to third parties without consent</li>
          <li>Respect a request to communicate only in writing</li>
        </ul>
        <h3 className="font-bold">Prohibited conduct</h3>
        <p>No threatening, abusive, or harassing language in any reminder.</p>
      </div>
    ),
  },
  disputes: {
    title: 'Dispute Resolution',
    updated: '2025-01-01',
    body: (
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <h3 className="font-bold">Between you and SME Finance</h3>
        <p>Email <a href="mailto:support@smefinance.ls" className="text-teal-600 underline">support@smefinance.ls</a>. We aim to resolve matters within 14 days, else mediation in Maseru under Lesotho law.</p>
        <h3 className="font-bold">Between you and your customers</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Discuss the issue directly and in writing</li>
          <li>Reconcile records against receipts</li>
          <li>Offer a fair payment plan if hardship is genuine</li>
          <li>Consult a Lesotho attorney or the Small Claims Court</li>
        </ol>
        <h3 className="font-bold">Small Claims Court</h3>
        <p>For claims under M 5,000, you can approach the Small Claims Court in your district.</p>
      </div>
    ),
  },
};

export default function LegalGuide({ onClose, initialSection = 'overview' }: LegalGuideProps) {
  const [active, setActive] = useState<LegalSection>(initialSection);
  const current = CONTENT[active];

  const downloadGuide = () => {
    const text = [
      'SME FINANCE — LEGAL GUIDE',
      '',
      current.title,
      `Last updated: ${current.updated}`,
      '',
      document.getElementById('legal-print')?.innerText ?? '',
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SME_Finance_Legal_${active}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Helmet>
        <title>Legal Guide | SME Finance</title>
        <meta name="description" content="SME Finance legal guide: terms, privacy, data protection, tax, and dispute resolution." />
      </Helmet>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-100 rounded-lg">
              <Scale size={16} className="text-teal-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Legal Guide</p>
              <p className="text-[10px] text-slate-500">Terms, Privacy, Tax & Compliance</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={downloadGuide} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100" title="Download this section">
              <Download size={16} />
            </button>
            {onClose && (
              <button onClick={onClose} aria-label="Close legal guide" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-[220px_1fr]">
          <nav className="border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 p-2 md:p-3 max-h-48 md:max-h-none overflow-y-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold transition ${
                  active === s.id ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                {s.icon}
                <span className="flex-1 truncate">{s.title}</span>
                <ChevronRight size={12} className={active === s.id ? 'opacity-100' : 'opacity-0'} />
              </button>
            ))}
          </nav>

          <div id="legal-print" className="p-5 md:p-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{current.title}</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Updated {current.updated}</span>
            </div>
            {current.body}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Informational only — not legal advice. Consult a qualified Lesotho attorney for legal advice specific to your situation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
import {
  LayoutDashboard, ListOrdered, BarChart3, Wallet
} from 'lucide-react';

interface SidebarProps {
  onNavigate: (view: 'dashboard' | 'transactions' | 'analytics' | 'wallet') => void;
  activeView: string;
}

export default function Sidebar({ onNavigate, activeView }: SidebarProps) {
  const getLinkClass = (view: string) =>
    `flex items-center justify-center md:justify-start gap-2 md:gap-3 p-3 md:p-4 rounded-2xl font-bold transition-all ${
      activeView === view
        ? 'bg-purple-600 text-white shadow-lg'
        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
    }`;

  const links: Array<{ view: 'dashboard' | 'transactions' | 'analytics' | 'wallet'; label: string; Icon: typeof LayoutDashboard }> = [
    { view: 'dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
    { view: 'transactions', label: 'Transactions', Icon: ListOrdered },
    { view: 'analytics',    label: 'Analytics',    Icon: BarChart3 },
    { view: 'wallet',       label: 'Wallet',       Icon: Wallet }
  ];

  return (
    <aside className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-2 z-50
                      md:relative md:w-64 md:h-screen md:border-r md:border-t-0 md:p-6 flex md:flex-col">

      <nav className="flex flex-row justify-around w-full md:flex-col md:space-y-4">
        {links.map(({ view, label, Icon }) => (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            className={getLinkClass(view)}
            aria-current={activeView === view ? 'page' : undefined}
          >
            <Icon size={18} />
            <span className="text-xs md:text-base">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
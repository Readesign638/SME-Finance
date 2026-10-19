import { useState } from 'react';
import {
  LayoutDashboard, ListOrdered, BarChart3, Wallet, Boxes,
  Bot, User, Settings, X, Menu, LogOut
} from 'lucide-react';

interface SidebarProps {
  onNavigate: (view: string) => void;
  activeView: string;
  onLogout?: () => void;
}

export default function Sidebar({ onNavigate, activeView, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links: Array<{
    view: string;
    label: string;
    Icon: typeof LayoutDashboard;
  }> = [
    { view: 'dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
    { view: 'transactions', label: 'Transactions', Icon: ListOrdered },
    { view: 'analytics',    label: 'Analytics',    Icon: BarChart3 },
    { view: 'wallet',       label: 'Wallet',       Icon: Wallet },
    { view: 'inventory',    label: 'Inventory',    Icon: Boxes },
    { view: 'ai',           label: 'AI Assistant', Icon: Bot },
    { view: 'profile',      label: 'Profile',      Icon: User },
    { view: 'settings',     label: 'Settings',     Icon: Settings }
  ];

  const handleNavigate = (view: string) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  const handleLogoutClick = () => {
    setMobileOpen(false);
    if (onLogout) onLogout();
  };

  const getLinkClass = (view: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all w-full text-left ${
      activeView === view
        ? 'bg-purple-600 text-white shadow-sm'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`;

  return (
    <>
      {/* ===== MOBILE: hamburger button (top-left) ===== */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-50 active:scale-95 transition"
      >
        <Menu size={22} />
      </button>

      {/* ===== MOBILE: slide-in drawer ===== */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-[80] shadow-2xl p-5 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  SF
                </div>
                <div>
                  <p className="text-sm font-bold leading-none">SME Finance</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Merchant Suite</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col gap-1 flex-1">
              {links.map(({ view, label, Icon }) => (
                <button
                  key={view}
                  onClick={() => handleNavigate(view)}
                  className={getLinkClass(view)}
                  aria-current={activeView === view ? 'page' : undefined}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            {/* Logout at the bottom of the drawer */}
            {onLogout && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={handleLogoutClick}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-red-600 hover:bg-red-50 transition w-full text-left"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </aside>
        </>
      )}

      {/* ===== DESKTOP: static sidebar ===== */}
      <aside className="hidden md:flex md:flex-col w-64 h-screen bg-white border-r border-slate-100 p-6 sticky top-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            SF
          </div>
          <div>
            <p className="text-base font-bold leading-none">SME Finance</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Merchant Suite</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {links.map(({ view, label, Icon }) => (
            <button
              key={view}
              onClick={() => handleNavigate(view)}
              className={getLinkClass(view)}
              aria-current={activeView === view ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Logout at the bottom of the desktop sidebar too */}
        {onLogout && (
          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-red-600 hover:bg-red-50 transition w-full text-left"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
'use client';
// components/Layout.jsx
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Building2, FileText, Settings,
  LogOut, Menu, X, ChevronRight, Hourglass, BarChart2
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
  { href: '/flats', label: 'Flats', icon: Building2 },
  { href: '/receipts', label: 'Receipts', icon: FileText },
  { href: "/pending", label: "Pending", icon: Hourglass },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children, title }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[#2a2a4e]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#e2b04a] rounded-lg flex items-center justify-center">
            <Building2 size={20} className="text-[#1a1a2e]" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              ApartmentLedger
            </p>
            <p className="text-[#8888aa] text-xs">{user?.email?.split('@')[0]}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-[#e2b04a] text-[#1a1a2e]'
                  : 'text-[#aaaacc] hover:bg-[#2a2a4e] hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-[#2a2a4e]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-[#aaaacc] hover:bg-[#2a2a4e] hover:text-[#e2b04a] transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col fixed inset-y-0 left-0 z-30 bg-[#1a1a2e]">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-[#1a1a2e] flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-[#aaaacc] hover:text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-[#1a1a2e]"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h1 style={{ fontFamily: 'Playfair Display, serif' }} className="text-xl font-semibold text-[#1a1a2e]">
              {title}
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
            <div className="w-8 h-8 rounded-full bg-[#e2b04a] flex items-center justify-center text-[#1a1a2e] font-bold text-xs">
              {user?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

'use client';
// app/page.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth} from "../context/AuthContext";
import toast from 'react-hot-toast';
import { Building2, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const { user, login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        toast.success('Welcome back!');
      } else {
        await register(email, password);
        toast.success('Account created!');
      }
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-[#1a1a2e] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-60px] left-[-60px] w-72 h-72 rounded-full bg-[#e2b04a]/10" />
        <div className="absolute bottom-[-40px] right-[-40px] w-56 h-56 rounded-full bg-[#e2b04a]/5" />

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-[#e2b04a] rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Building2 size={40} className="text-[#1a1a2e]" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Apartment<br />Ledger
          </h1>
          <p className="text-[#8888aa] text-lg leading-relaxed max-w-sm">
            Manage maintenance receipts for your apartment complex — effortlessly.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[['Flats', 'Track all units'], ['Receipts', 'PDF ready'], ['History', 'Full audit']].map(([t, s]) => (
              <div key={t} className="bg-[#2a2a4e] rounded-xl p-4">
                <p className="text-[#e2b04a] font-semibold text-sm">{t}</p>
                <p className="text-[#666688] text-xs mt-1">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#f8f9fc]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#e2b04a] rounded-xl flex items-center justify-center">
              <Building2 size={22} className="text-[#1a1a2e]" />
            </div>
            <span className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: 'Playfair Display, serif' }}>
              ApartmentLedger
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-2xl font-semibold text-[#1a1a2e] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              {mode === 'login' ? 'Sign in to manage your receipts' : 'Set up your apartment ledger'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#e2b04a] text-[#1a1a2e] font-semibold py-3 rounded-lg hover:bg-[#d4a03a] transition-colors disabled:opacity-60 mt-2"
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-[#b8861f] font-semibold hover:underline"
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

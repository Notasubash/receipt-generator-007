'use client';
// app/dashboard/page.jsx  (full updated file)
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext';
import SavePendingModal from '../../components/SavePendingModal';
import {
  Building2, FileText, IndianRupee, TrendingUp,
  Plus, ArrowRight, AlertCircle, X, ChevronRight, BookmarkPlus, Check
} from 'lucide-react';
import { format, parse } from 'date-fns';
import toast from 'react-hot-toast';

const formatDate = (str) => {
  if (!str) return '—';
  try { return format(parse(str, 'yyyy-MM-dd', new Date()), 'dd-MM-yyyy'); }
  catch { return str; }
};

// add helper near top
const isActiveFlat = (f) => f?.status !== 'inactive';

export default function DashboardPage() {
  const { getDashboardStats, getSettings, addPendingFlat } = useFirestore();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingOpen, setPendingOpen] = useState(false);
  // flat being saved to pending (opens mini-modal)
  const [savingFlat, setSavingFlat] = useState(null);
  // set of flatIds already saved this session
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [s, cfg] = await Promise.all([getDashboardStats(), getSettings()]);
      setStats(s);
      setSettings(cfg);
      setLoading(false);
    };
    load();
  }, [user]);

  const currency = settings?.currency || '₹';

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const paidFlatIds = new Set(
    (stats?.receipts || [])
      .filter((r) => r.month === currentMonth)
      .map((r) => r.flatId)
  );
  const pendingFlats = (stats?.flats || [])
    .filter(isActiveFlat)
    .filter((f) => !paidFlatIds.has(f.id));

  const handleSaveToPending = async (data) => {
    try {
      await addPendingFlat(data);
      toast.success(`${data.flatNumber} saved to pending`);
      setSavedIds((prev) => new Set([...prev, data.flatId]));
      setSavingFlat(null);
    } catch {
      toast.error('Failed to save to pending');
    }
  };

  const StatCard = ({ icon: Icon, label, value, sub, color, onClick }) => (
    <div
      className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm card-lift ${onClick ? 'cursor-pointer hover:border-[#e2b04a] transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
          <p className="text-3xl font-bold text-[#1a1a2e]">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} />
        </div>
      </div>
      {onClick && pendingFlats.length > 0 && (
        <p className="text-xs text-orange-500 font-medium mt-3 flex items-center gap-1">
          <span>Click to view pending flats</span> <ChevronRight size={12} />
        </p>
      )}
    </div>
  );

  return (
    <ProtectedRoute>
      <Layout title="Dashboard">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[#e2b04a] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8 max-w-6xl">

            {/* Welcome */}
            <div className="bg-[#1a1a2e] rounded-2xl p-6 text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-40 h-40 bg-[#e2b04a]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <p className="text-[#e2b04a] font-medium text-sm mb-1">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
              </p>
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                {settings?.apartmentName || 'Your Apartment'}
              </h2>
              <p className="text-[#8888aa] text-sm mt-1">{user?.email}</p>
              <Link
                href="/receipts/new"
                className="mt-4 inline-flex items-center gap-2 bg-[#e2b04a] text-[#1a1a2e] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#d4a03a] transition-colors"
              >
                <Plus size={16} /> New Receipt
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                icon={IndianRupee}
                label="This Month"
                value={`${currency}${(stats?.thisMonthTotal || 0).toLocaleString('en-IN')}`}
                sub={currentMonth}
                color="bg-[#fdf0d5] text-[#b8861f]"
              />
              <StatCard
                icon={AlertCircle}
                label="Pending This Month"
                value={pendingFlats.length}
                sub={pendingFlats.length === 0 ? 'All flats paid ✓' : `for ${currentMonth}`}
                color={pendingFlats.length > 0 ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-600'}
                onClick={pendingFlats.length > 0 ? () => setPendingOpen(true) : undefined}
              />
            </div>

            {/* Recent receipts */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-[#1a1a2e]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Recent Receipts
                </h3>
                <Link href="/receipts" className="text-[#b8861f] text-sm font-medium flex items-center gap-1 hover:underline">
                  View all <ArrowRight size={14} />
                </Link>
              </div>
              {!stats?.receipts?.length ? (
                <div className="py-12 text-center text-gray-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No receipts yet.</p>
                  <Link href="/receipts/new" className="text-[#b8861f] text-sm font-medium hover:underline mt-1 inline-block">
                    Create your first receipt
                  </Link>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-400 tracking-wide">
                    <tr>
                      <th className="text-left px-6 py-3">Receipt No</th>
                      <th className="text-left px-6 py-3">Date</th>
                      <th className="text-left px-6 py-3">Flat</th>
                      <th className="text-left px-6 py-3">Month</th>
                      <th className="text-right px-6 py-3">Amount</th>
                      <th className="text-left px-6 py-3">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.receipts.slice(0, 8).map((r) => (
                      <tr key={r.id} className="border-t border-gray-50 table-row-hover">
                        <td className="px-6 py-3 font-mono text-xs text-gray-500">{r.receiptNumber}</td>
                        <td className="px-6 py-3 text-gray-600">{formatDate(r.paymentDate)}</td>
                        <td className="px-6 py-3 font-medium text-[#1a1a2e]">{r.flatNumber} — {r.ownerName}</td>
                        <td className="px-6 py-3 text-gray-600">{r.month}</td>
                        <td className="px-6 py-3 text-right font-semibold text-[#1a1a2e]">
                          {currency}{Number(r.paidAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-3 text-gray-500 capitalize">{r.modeOfPayment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { href: '/flats', label: 'Manage Flats', desc: 'Add or edit flat details', icon: Building2 },
                { href: '/receipts/new', label: 'New Receipt', desc: 'Generate one or multiple', icon: Plus },
                { href: '/reports', label: 'Reports', desc: 'Month-wise collection report', icon: TrendingUp },
              ].map(({ href, label, desc, icon: Icon }) => (
                <Link key={href} href={href} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 hover:border-[#e2b04a] hover:shadow-sm transition-all card-lift">
                  <div className="w-10 h-10 bg-[#fdf0d5] rounded-xl flex items-center justify-center">
                    <Icon size={20} className="text-[#b8861f]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a1a2e] text-sm">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-gray-300" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Pending Flats Modal ── */}
        {pendingOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={() => setPendingOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-[#1a1a2e]" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Pending Flats
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {currentMonth} · {pendingFlats.length} flat{pendingFlats.length !== 1 ? 's' : ''} not yet paid
                  </p>
                </div>
                <button
                  onClick={() => setPendingOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1">
                {pendingFlats.map((flat) => {
                  const isSaved = savedIds.has(flat.id);
                  return (
                    <div
                      key={flat.id}
                      className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#fdf6ec] transition-colors border-t border-gray-50 first:border-0"
                    >
                      {/* Flat info — clicking navigates to new receipt */}
                      <Link
                        href={`/receipts/new?flatId=${flat.id}`}
                        onClick={() => setPendingOpen(false)}
                        className="flex-1 min-w-0"
                      >
                        <p className="text-sm font-medium text-[#1a1a2e]">{flat.ownerName}</p>
                        <p className="text-xs text-gray-400">
                          {flat.flatNumber}{flat.type ? ` · ${flat.type}` : ''}{flat.floor ? ` · Floor ${flat.floor}` : ''}
                        </p>
                      </Link>

                      {/* Save to Pending */}
                      <button
                        onClick={() => !isSaved && setSavingFlat(flat)}
                        title={isSaved ? 'Saved to pending' : 'Save to pending list'}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${isSaved
                          ? 'bg-[#fdf0d5] text-[#b8861f] cursor-default'
                          : 'bg-gray-100 text-gray-500 hover:bg-[#fdf0d5] hover:text-[#b8861f]'
                          }`}
                      >
                        {isSaved ? <Check size={12} /> : <BookmarkPlus size={12} />}
                        {isSaved ? 'Saved' : 'Pending'}
                      </button>

                      {/* Add receipt */}
                      <Link
                        href={`/receipts/new?flatId=${flat.id}`}
                        onClick={() => setPendingOpen(false)}
                        className="text-xs text-[#b8861f] font-medium flex items-center gap-0.5 hover:underline shrink-0"
                      >
                        Add receipt <ChevronRight size={12} />
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between">
                <Link
                  href="/reports"
                  onClick={() => setPendingOpen(false)}
                  className="text-xs text-[#b8861f] font-medium hover:underline"
                >
                  View in Reports →
                </Link>
                <Link
                  href="/receipts/new"
                  onClick={() => setPendingOpen(false)}
                  className="text-xs text-gray-400 hover:underline"
                >
                  Go to new receipt →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Save to Pending mini-modal ── */}
        {savingFlat && (
          <SavePendingModal
            flat={savingFlat}
            month={currentMonth}
            onSave={handleSaveToPending}
            onClose={() => setSavingFlat(null)}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
}
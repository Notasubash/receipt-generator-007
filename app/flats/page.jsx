'use client';
// app/flats/page.jsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Building2, Search, Pencil, Trash2, ChevronRight, UserX, UserCheck, Eye, EyeOff } from 'lucide-react';

const EMPTY_FLAT = {
  flatNumber: '', ownerName: '',
  floor: '', type: '', ownershipType: 'owner', notes: '', status: 'active'
};

const FLAT_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', 'Commercial'];

const isActiveFlat = (f) => f?.status !== 'inactive';

export default function FlatsPage() {
  const { getFlats, addFlat, updateFlat, deleteFlat } = useFirestore();
  const { user } = useAuth();
  const router = useRouter();
  const [flats, setFlats] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editFlat, setEditFlat] = useState(null);
  const [form, setForm] = useState(EMPTY_FLAT);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await getFlats();
    setFlats(data);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      flats.filter((f) => {
        if (!showInactive && !isActiveFlat(f)) return false;
        return (
          f.flatNumber?.toLowerCase().includes(q) ||
          f.ownerName?.toLowerCase().includes(q)
        );
      })
    );
  }, [search, flats, showInactive]);

  const inactiveCount = flats.filter((f) => !isActiveFlat(f)).length;

  const openAdd = () => { setEditFlat(null); setForm(EMPTY_FLAT); setModalOpen(true); };
  const openEdit = (flat) => { setEditFlat(flat); setForm(flat); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.flatNumber || !form.ownerName) {
      toast.error('Flat number and owner name are required');
      return;
    }
    setSaving(true);
    try {
      if (editFlat) {
        await updateFlat(editFlat.id, form);
        toast.success('Flat updated');
      } else {
        await addFlat(form);
        toast.success('Flat added');
      }
      setModalOpen(false);
      await load();
    } catch {
      toast.error('Failed to save flat');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (flat) => {
    if (!confirm(`Delete flat ${flat.flatNumber}? This cannot be undone.`)) return;
    try {
      await deleteFlat(flat.id);
      toast.success('Flat deleted');
      await load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleToggleStatus = async (flat) => {
    const nextStatus = isActiveFlat(flat) ? 'inactive' : 'active';
    const verb = nextStatus === 'inactive' ? 'Mark this flat inactive' : 'Mark this flat active';
    if (!confirm(`${verb} (Flat ${flat.flatNumber} — ${flat.ownerName})?`)) return;
    try {
      await updateFlat(flat.id, { status: nextStatus });
      toast.success(nextStatus === 'inactive' ? 'Marked inactive' : 'Marked active');
      await load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <ProtectedRoute>
      <Layout title="Flats">
        <div className="max-w-5xl space-y-4 sm:space-y-6">

          {/* Header actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-1 sm:max-w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search flats, owners..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none bg-white"
              />
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setShowInactive((v) => !v)}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-sm font-medium rounded-xl border transition-colors whitespace-nowrap ${
                  showInactive
                    ? 'bg-[#1a1a2e] text-[#e2b04a] border-[#1a1a2e]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {showInactive ? <Eye size={15} /> : <EyeOff size={15} />}
                {showInactive ? 'Hide Inactive' : 'Show Inactive'}
                {inactiveCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${showInactive ? 'bg-[#e2b04a]/20' : 'bg-gray-100'}`}>
                    {inactiveCount}
                  </span>
                )}
              </button>
              <Button onClick={openAdd} size="md" className="flex items-center justify-center gap-2 whitespace-nowrap">
                <Plus size={16} /> Add Flat
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#e2b04a] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <Building2 size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 font-medium">No flats found</p>
              <button onClick={openAdd} className="text-[#b8861f] text-sm font-medium hover:underline mt-2 inline-block">
                Add your first flat
              </button>
            </div>
          ) : (
            <>
              {/* ── Mobile: card list (hidden on md+) ── */}
              <div className="flex flex-col gap-3 md:hidden">
                {filtered.map((flat) => {
                  const active = isActiveFlat(flat);
                  return (
                    <div
                      key={flat.id}
                      onClick={() => router.push(`/flats/${flat.id}`)}
                      className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4 active:bg-[#fdf6ec] transition-colors cursor-pointer ${
                        active ? 'border-gray-100' : 'border-gray-100 opacity-60'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${active ? 'bg-[#1a1a2e]' : 'bg-gray-300'}`}>
                        <span className={`font-bold text-xs font-mono leading-tight text-center px-1 ${active ? 'text-[#e2b04a]' : 'text-white'}`}>
                          {flat.flatNumber}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#1a1a2e] text-sm">{flat.ownerName}</span>
                          <Badge color={flat.ownershipType === 'owner' ? 'gold' : 'blue'} className="text-[10px]">
                            {flat.ownershipType === 'owner' ? 'Owner' : 'Tenant'}
                          </Badge>
                          {!active && (
                            <Badge color="gray" className="text-[10px]">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {flat.type && <Badge color="gray" className="text-[10px]">{flat.type}</Badge>}
                          {flat.floor && <span className="text-xs text-gray-400">Floor {flat.floor}</span>}
                          {flat.notes && (
                            <span className="text-xs text-gray-400 truncate max-w-[140px]">{flat.notes}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleStatus(flat)}
                          className={`p-2 rounded-lg transition-colors ${
                            active
                              ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          aria-label={active ? 'Mark inactive' : 'Mark active'}
                          title={active ? 'Mark inactive' : 'Mark active'}
                        >
                          {active ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
                        <button
                          onClick={() => openEdit(flat)}
                          className="p-2 text-gray-400 hover:text-[#b8861f] hover:bg-[#fdf0d5] rounded-lg transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(flat)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                        <ChevronRight size={15} className="text-gray-300 ml-1" />
                      </div>
                    </div>
                  );
                })}

                <p className="text-center text-xs text-gray-400 pt-1">
                  {filtered.length} flat{filtered.length !== 1 ? 's' : ''}
                  {search && ` matching "${search}"`}
                </p>
              </div>

              {/* ── Desktop: table (hidden below md) ── */}
              <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-400 tracking-wide border-b border-gray-100">
                      <tr>
                        <th className="text-left px-6 py-3">Flat No</th>
                        <th className="text-left px-6 py-3">Owner</th>
                        <th className="text-left px-6 py-3">Type</th>
                        <th className="text-left px-6 py-3">Floor</th>
                        <th className="text-left px-6 py-3">Ownership</th>
                        <th className="text-left px-6 py-3">Status</th>
                        <th className="text-right px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((flat) => {
                        const active = isActiveFlat(flat);
                        return (
                          <tr
                            key={flat.id}
                            onClick={() => router.push(`/flats/${flat.id}`)}
                            className={`border-t border-gray-50 hover:bg-[#fdf6ec]/50 transition-colors cursor-pointer ${!active ? 'opacity-60' : ''}`}
                          >
                            <td className="px-6 py-3.5">
                              <span className="font-mono font-bold text-[#1a1a2e] text-sm">{flat.flatNumber}</span>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="font-medium text-[#1a1a2e]">{flat.ownerName}</span>
                              {flat.notes && (
                                <p className="text-xs text-gray-400 truncate max-w-[180px]">{flat.notes}</p>
                              )}
                            </td>
                            <td className="px-6 py-3.5">
                              {flat.type ? <Badge color="gray">{flat.type}</Badge> : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-6 py-3.5 text-gray-500">
                              {flat.floor ? `Floor ${flat.floor}` : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-6 py-3.5">
                              <Badge color={flat.ownershipType === 'owner' ? 'gold' : 'blue'}>
                                {flat.ownershipType === 'owner' ? 'Owner' : 'Tenant'}
                              </Badge>
                            </td>
                            <td className="px-6 py-3.5">
                              {active ? (
                                <Badge color="green">Active</Badge>
                              ) : (
                                <Badge color="gray">Inactive</Badge>
                              )}
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleToggleStatus(flat)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    active
                                      ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                  }`}
                                  title={active ? 'Mark inactive' : 'Mark active'}
                                >
                                  {active ? <UserX size={14} /> : <UserCheck size={14} />}
                                </button>
                                <button
                                  onClick={() => openEdit(flat)}
                                  className="p-1.5 text-gray-400 hover:text-[#b8861f] hover:bg-[#fdf0d5] rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(flat)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-3 border-t border-gray-50 text-xs text-gray-400">
                  {filtered.length} flat{filtered.length !== 1 ? 's' : ''}
                  {search && ` matching "${search}"`}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Add/Edit Modal */}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editFlat ? 'Edit Flat' : 'Add New Flat'} size="md">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Flat Number *"
                value={form.flatNumber}
                onChange={(e) => set('flatNumber', e.target.value)}
                placeholder="A-101"
                required
              />
              <Input
                label="Floor"
                value={form.floor}
                onChange={(e) => set('floor', e.target.value)}
                placeholder="1"
              />
            </div>
            <Input
              label="Owner / Resident Name *"
              value={form.ownerName}
              onChange={(e) => set('ownerName', e.target.value)}
              placeholder="John Doe"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Flat Type" value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="">Select type</option>
                {FLAT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Select label="Ownership" value={form.ownershipType} onChange={(e) => set('ownershipType', e.target.value)}>
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
              </Select>
            </div>
            <Select
              label="Status"
              value={form.status || 'active'}
              onChange={(e) => set('status', e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Notes</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] outline-none resize-none"
                placeholder="Optional notes..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editFlat ? 'Update Flat' : 'Add Flat'}
              </Button>
            </div>
          </form>
        </Modal>
      </Layout>
    </ProtectedRoute>
  );
}
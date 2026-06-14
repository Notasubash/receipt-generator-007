// components/SavePendingModal.jsx
// Drop-in mini-modal for "Save to Pending" from the dashboard pending list

'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function SavePendingModal({ flat, month, onSave, onClose }) {
  const [amountDue, setAmountDue] = useState('');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amountDue || isNaN(Number(amountDue))) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    await onSave({
      flatId:     flat.id,
      flatNumber: flat.flatNumber,
      ownerName:  flat.ownerName,
      month,
      amountDue:  Number(amountDue),
      notes,
    });
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-[#1a1a2e] text-sm">Save to Pending</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {flat.flatNumber} — {flat.ownerName} · {month}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Amount Due *</label>
            <input
              type="number"
              min="0"
              value={amountDue}
              onChange={(e) => setAmountDue(e.target.value)}
              placeholder="e.g. 1500"
              autoFocus
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional reason…"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-[#1a1a2e] text-[#e2b04a] font-medium hover:bg-[#2a2a3e] disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
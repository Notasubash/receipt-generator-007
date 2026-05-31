'use client';
// app/settings/page.jsx
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useFirestore } from '../../hooks/useFirestore';
import { Input, Select } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { Save, Building2 } from 'lucide-react';

const CURRENCIES = ['₹', '$', '€', '£', '¥', '₦', 'AED'];
const DESIGNATIONS = ['Manager', 'Secretary', 'Treasurer', 'Chairman', 'Administrator', 'Owner'];

export default function SettingsPage() {
  const { getSettings, saveSettings } = useFirestore();
  const [form, setForm] = useState({
    apartmentName: '',
    address: '',
    designation: '',
    currency: '₹',
    totalFlats: '',
    phone: '',
    email: '',
    maintenanceAmount: '',
    bankDetails: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      if (s) setForm((prev) => ({ ...prev, ...s }));
      setLoading(false);
    });
  }, []);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(form);
      toast.success('Settings saved!');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <Layout title="Settings">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[#e2b04a] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#fdf0d5] rounded-xl flex items-center justify-center">
                  <Building2 size={20} className="text-[#b8861f]" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#1a1a2e]" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Apartment Configuration
                  </h2>
                  <p className="text-xs text-gray-400">This information appears on all generated receipts</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      label="Apartment / Society Name"
                      value={form.apartmentName}
                      onChange={(e) => set('apartmentName', e.target.value)}
                      placeholder="Green Valley Apartments"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      label="Full Address"
                      value={form.address}
                      onChange={(e) => set('address', e.target.value)}
                      placeholder="123 Main Street, Chennai - 600001"
                    />
                  </div>

                  <Select
                    label="Your Designation"
                    value={form.designation}
                    onChange={(e) => set('designation', e.target.value)}
                  >
                    <option value="">Select designation</option>
                    {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>

                  <Select
                    label="Currency"
                    value={form.currency}
                    onChange={(e) => set('currency', e.target.value)}
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>

                  <Input
                    label="Total Number of Flats"
                    type="number"
                    value={form.totalFlats}
                    onChange={(e) => set('totalFlats', e.target.value)}
                    placeholder="24"
                  />

                  <Input
                    label="Default Maintenance Amount"
                    type="number"
                    value={form.maintenanceAmount}
                    onChange={(e) => set('maintenanceAmount', e.target.value)}
                    placeholder="1500"
                  />

                  <Input
                    label="Contact Phone"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                  />

                  <Input
                    label="Contact Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="admin@apartment.com"
                  />

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide block mb-1">
                      Bank Details (optional, shown on receipt)
                    </label>
                    <textarea
                      rows={3}
                      value={form.bankDetails}
                      onChange={(e) => set('bankDetails', e.target.value)}
                      placeholder="Bank: HDFC Bank&#10;Account No: 1234567890&#10;IFSC: HDFC0001234"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saving} size="lg">
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}

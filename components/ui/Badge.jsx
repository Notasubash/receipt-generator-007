'use client';
// components/ui/Badge.jsx
export default function Badge({ children, color = 'gold' }) {
  const colors = {
    gold: 'bg-[#fdf0d5] text-[#b8861f] border border-[#e2b04a]/30',
    green: 'bg-green-50 text-green-700 border border-green-200',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    red: 'bg-red-50 text-red-700 border border-red-200',
    gray: 'bg-gray-100 text-gray-600 border border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
}

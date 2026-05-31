'use client';
// components/ui/Input.jsx
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#1a1a2e] bg-white transition-all
          ${error ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20'}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#1a1a2e] bg-white transition-all
          ${error ? 'border-red-400' : 'border-gray-200 focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20'}
          ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold text-[#555577] uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        rows={3}
        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#1a1a2e] bg-white transition-all resize-none
          ${error ? 'border-red-400' : 'border-gray-200 focus:border-[#e2b04a] focus:ring-2 focus:ring-[#e2b04a]/20'}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

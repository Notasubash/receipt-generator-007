// components/ui/Select.jsx
export function Select({ value, onChange, children, placeholder, className, name, id }) {
  return (
    <div className="relative">
      <select
        name={name}
        id={id}
        value={value}
        onChange={onChange}
        className={`appearance-none flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1a1a2e] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#e2b04a] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export function SelectItem({ value, children }) {
  return <option value={value}>{children}</option>;
}
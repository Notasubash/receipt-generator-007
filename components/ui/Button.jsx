'use client';
// components/ui/Button.jsx
export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-[#e2b04a] text-[#1a1a2e] hover:bg-[#d4a03a] shadow-sm',
    secondary: 'bg-[#1a1a2e] text-white hover:bg-[#2a2a4e]',
    outline: 'border border-[#e2b04a] text-[#b8861f] hover:bg-[#fdf6ec]',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

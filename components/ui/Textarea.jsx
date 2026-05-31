// components/ui/Textarea.jsx
export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={`flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1a1a2e] shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e2b04a] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-none ${className || ''}`}
      {...props}
    />
  );
}
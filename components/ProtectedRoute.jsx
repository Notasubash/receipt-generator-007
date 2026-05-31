'use client';
// components/ProtectedRoute.jsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#e2b04a] border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
          <p className="text-[#1a1a2e] font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return children;
}

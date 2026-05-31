'use client';
// hooks/useFirestore.js
import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export function useFirestore() {
  const { user } = useAuth();

  // ── Settings ──────────────────────────────────────────────────
  const getSettings = async () => {
    if (!user) return null;
    const ref = doc(db, 'users', user.uid, 'settings', 'config');
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  };

  const saveSettings = async (data) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'settings', 'config');
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  };

  // ── Flats ─────────────────────────────────────────────────────
  const getFlats = async () => {
    if (!user) return [];

    const ref = collection(db, 'users', user.uid, 'flats');
    
    const snap = await getDocs(query(ref)); // no orderBy — sort client-side
    console.log('Fetched flats:', snap);
    const flats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort by flatNumber alphabetically client-side (avoids needing a Firestore index)
    return flats.sort((a, b) =>
      (a.flatNumber || '').localeCompare(b.flatNumber || '', undefined, { numeric: true })
    );
  };

  const getFlat = async (flatId) => {
    if (!user) return null;
    const ref = doc(db, 'users', user.uid, 'flats', flatId);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  };

  const addFlat = async (data) => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'flats');
    return addDoc(ref, { ...data, createdAt: serverTimestamp() });
  };

  const updateFlat = async (flatId, data) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'flats', flatId);
    return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  };

  const deleteFlat = async (flatId) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'flats', flatId);
    return deleteDoc(ref);
  };

  // ── Receipts ──────────────────────────────────────────────────
  const getReceipts = async (flatId = null) => {
    if (!user) return [];
    const ref = collection(db, 'users', user.uid, 'receipts');
    // Use where() only when filtering by flatId — no orderBy to avoid index requirement
    const q = flatId ? query(ref, where('flatId', '==', flatId)) : query(ref);
    const snap = await getDocs(q);
    const receipts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort newest first client-side using createdAt timestamp
    return receipts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
  };

  const addReceipt = async (data) => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'receipts');
    // receiptNumber is passed in from the page (sequential logic lives there)
    return addDoc(ref, { ...data, createdAt: serverTimestamp() });
  };

  const updateReceipt = async (receiptId, data) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'receipts', receiptId);
    return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  };

  const deleteReceipt = async (receiptId) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'receipts', receiptId);
    return deleteDoc(ref);
  };

  // Dashboard stats
  const getDashboardStats = async () => {
    if (!user) return {};
    const [flats, receipts] = await Promise.all([getFlats(), getReceipts()]);
    const totalCollected = receipts.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
    const thisMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const thisMonthReceipts = receipts.filter((r) => r.month === thisMonth);
    const thisMonthTotal = thisMonthReceipts.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
    return { totalFlats: flats.length, totalReceipts: receipts.length, totalCollected, thisMonthTotal, flats, receipts };
  };

  return {
    getSettings, saveSettings,
    getFlats, getFlat, addFlat, updateFlat, deleteFlat,
    getReceipts, addReceipt, updateReceipt, deleteReceipt,
    getDashboardStats,
  };
}
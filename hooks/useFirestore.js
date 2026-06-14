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
  limit,
  startAfter,
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
    const snap = await getDocs(query(ref));
    const flats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  /**
   * Paginated receipts — used for the main list view.
   * Pass flatId to scope to a single flat.
   * Pass lastDoc (Firestore doc snapshot) for cursor-based pagination.
   * Pass pageSize to override default (25).
   */
  const getReceipts = async (flatId = null, lastDoc = null, pageSize = 25) => {
    if (!user) return { receipts: [], lastDoc: null, hasMore: false };

    const ref = collection(db, 'users', user.uid, 'receipts');

    const constraints = [
      orderBy('createdAt', 'desc'),
      limit(pageSize + 1), // fetch one extra to detect next page
    ];

    if (flatId) constraints.unshift(where('flatId', '==', flatId));
    if (lastDoc) constraints.push(startAfter(lastDoc));

    const snap = await getDocs(query(ref, ...constraints));
    const docs = snap.docs;

    const hasMore = docs.length > pageSize;
    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

    return {
      receipts: pageDocs.map((d) => ({ id: d.id, ...d.data() })),
      lastDoc: pageDocs[pageDocs.length - 1] ?? null,
      hasMore,
    };
  };

  const getAllReceiptsByFlat = async (flatId) => {
  if (!user) return [];
  const ref = collection(db, 'users', user.uid, 'receipts');
  const snap = await getDocs(
    query(ref, where('flatId', '==', flatId), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

  /**
   * Fetch ALL receipts (no pagination) — used for full-text search.
   * Optionally scoped to a flatId.
   * Use sparingly; only triggered when the user types a search query.
   */
  const getAllReceipts = async (flatId = null) => {
    if (!user) return [];

    const ref = collection(db, 'users', user.uid, 'receipts');
    const constraints = [orderBy('createdAt', 'desc')];
    if (flatId) constraints.unshift(where('flatId', '==', flatId));

    const snap = await getDocs(query(ref, ...constraints));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const addReceipt = async (data) => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'receipts');
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
    const [flats, allReceipts] = await Promise.all([getFlats(), getAllReceipts()]);
    const totalCollected = allReceipts.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
    const thisMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const thisMonthReceipts = allReceipts.filter((r) => r.month === thisMonth);
    const thisMonthTotal = thisMonthReceipts.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
    return {
      totalFlats: flats.length,
      totalReceipts: allReceipts.length,
      totalCollected,
      thisMonthTotal,
      flats,
      receipts: allReceipts,
    };
  };
// ─────────────────────────────────────────────────────────────
// ADD THESE FUNCTIONS inside the useFirestore() hook body,
// alongside the existing getReceipts, addReceipt, etc.
// Then add them to the return {} at the bottom.
// ─────────────────────────────────────────────────────────────

// ── Pending Flats ─────────────────────────────────────────────

/**
 * Fetch all saved pending-flat records for this user.
 * Ordered newest first.
 */
const getPendingFlats = async () => {
  if (!user) return [];
  const ref = collection(db, 'users', user.uid, 'pendingFlats');
  const snap = await getDocs(query(ref, orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Save a flat as pending for a given month.
 * data shape: { flatId, flatNumber, ownerName, month, amountDue, notes }
 */
const addPendingFlat = async (data) => {
  if (!user) return;
  const ref = collection(db, 'users', user.uid, 'pendingFlats');
  return addDoc(ref, { ...data, createdAt: serverTimestamp() });
};

/**
 * Remove a pending entry by its Firestore document ID.
 */
const deletePendingFlat = async (pendingId) => {
  if (!user) return;
  const ref = doc(db, 'users', user.uid, 'pendingFlats', pendingId);
  return deleteDoc(ref);
};

// ─────────────────────────────────────────────────────────────
// UPDATE the return statement to include:
// getPendingFlats, addPendingFlat, deletePendingFlat
// ─────────────────────────────────────────────────────────────

// return {
//   getSettings, saveSettings,
//   getFlats, getFlat, addFlat, updateFlat, deleteFlat,
//   getReceipts, getAllReceipts, getAllReceiptsByFlat,
//   addReceipt, updateReceipt, deleteReceipt,
//   getDashboardStats,
//   getPendingFlats, addPendingFlat, deletePendingFlat,   // ← add these
// };
  return {
    getSettings, saveSettings,
    getFlats, getFlat, addFlat, updateFlat, deleteFlat,
    getReceipts, getAllReceipts, addReceipt, updateReceipt, deleteReceipt,
    getDashboardStats, getAllReceiptsByFlat,
    getPendingFlats, addPendingFlat, deletePendingFlat  
  };
}
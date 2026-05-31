# ApartmentLedger — Receipt Generator

A full-featured apartment maintenance receipt management system built with Next.js 14 and Firebase.

---

## Features

- 🔐 Firebase Auth (email/password login & registration)
- 🏢 **Settings** — apartment name, address, designation, currency, total flats, maintenance amount
- 🏠 **Flats** — add/edit/delete flats with owner name, flat number, email, phone, type, floor
- 🧾 **Receipts** — create receipts for one or multiple months at once, with flat auto-fill
- 📄 **PDF Generation** — A5-sized receipts with each month on its own page, download on demand
- 📊 **Dashboard** — stats for total flats, receipts, monthly and all-time collections
- 🗂️ **Flat Detail Page** — view receipt history, download individual or all receipts as PDF
- 🔒 Per-user data isolation via Firestore security rules

---

## Firebase Structure

```
Firestore
└── users/
    └── {uid}/
        ├── settings/
        │   └── config         (apartment config doc)
        ├── flats/
        │   └── {flatId}       (flat documents)
        └── receipts/
            └── {receiptId}    (receipt documents with flatId lookup)
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create a Firebase project
- Go to https://console.firebase.google.com
- Create a new project
- Enable **Authentication** → Email/Password
- Enable **Firestore Database** (start in production mode)

### 3. Configure environment variables
Copy `.env.local` and fill in your Firebase credentials:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 4. Deploy Firestore rules
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project
firebase deploy --only firestore:rules
```

### 5. Run development server
```bash
npm run dev
```

Open http://localhost:3000

---

## Usage

1. **Register** with your email and password
2. Go to **Settings** and configure your apartment name, currency, etc.
3. Go to **Flats** and add all your flat units
4. Go to **New Receipt** to generate receipts:
   - Search and select a flat (owner auto-fills, and vice versa)
   - Add one or multiple months using "Add Another Month"
   - Click **Save & Download PDF** — each month is a separate page in the PDF
5. View receipt history per flat in the **Flat Detail** page
6. Download any past receipt from **Receipts** history or flat detail page

---

## Tech Stack

- **Next.js 14** (App Router)
- **Firebase** (Auth + Firestore)
- **Tailwind CSS**
- **jsPDF** (PDF generation, no server needed)
- **date-fns** (date utilities)
- **lucide-react** (icons)
- **react-hot-toast** (notifications)

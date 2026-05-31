// app/layout.js
import { AuthProvider } from '../context/AuthContext';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata = {
  title: 'ApartmentLedger — Receipt Generator',
  description: 'Manage apartment maintenance receipts',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1a2e',
                color: '#fdf6ec',
                border: '1px solid #e2b04a',
                fontFamily: 'DM Sans, sans-serif',
              },
              success: { iconTheme: { primary: '#e2b04a', secondary: '#1a1a2e' } },
            }}
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

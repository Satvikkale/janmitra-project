import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { Navbar, Footer } from '@/components/layout';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JanMitra - Smart Society Management',
  description: 'Streamline complaint resolution, share announcements instantly, and manage your housing society effortlessly with JanMitra.',
  keywords: ['society management', 'housing society', 'complaint management', 'RWA', 'residential welfare'],
  authors: [{ name: 'JanMitra Team' }],
  icons: {
    icon: '/icon.jpg',
    shortcut: '/icon.jpg',
    apple: '/icon.jpg',
  },
  openGraph: {
    title: 'JanMitra - Smart Society Management',
    description: 'Streamline complaint resolution, share announcements instantly, and manage your housing society effortlessly.',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen flex flex-col bg-white">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 pt-16 lg:pt-20">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
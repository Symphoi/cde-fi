'use client';
import { usePathname } from 'next/navigation';
import { Inter } from "next/font/google";
import "./globals.css";
import AppSidebar from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/SidebarContext";
import { Toaster } from 'sonner'; // ✅ IMPORT TOASTER

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-white`}>
        {isLoginPage ? (
          // Halaman login - TANPO sidebar
          <div className="min-h-screen">
            {children}
          </div>
        ) : (
          // Halaman lain - DENGAN sidebar
          <SidebarProvider>
            <div className="flex min-h-screen">
              <div className="flex-shrink-0">
                <AppSidebar />
              </div>
              
              <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 p-6">
                  {children}
                </main>
              </div>
            </div>
          </SidebarProvider>
        )}
        
        {/* ✅ TOASTER COMPONENT - PASTI KELUAR */}
        <Toaster 
          position="top-right"
          richColors
          closeButton
          duration={4000}
          expand={true}
          visibleToasts={5}
        />
      </body>
    </html>
  );
}
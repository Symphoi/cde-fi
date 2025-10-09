'use client';
import { usePathname } from 'next/navigation';
import { Inter } from "next/font/google";
import "./globals.css";
import AppSidebar from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/SidebarContext";

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
          // Halaman login - TANPA sidebar
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
      </body>
    </html>
  );
}
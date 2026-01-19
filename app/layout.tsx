// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { Kantumruy_Pro } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const kantumruy = Kantumruy_Pro({
  subsets: ["khmer"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-kantumruy",
});
export const metadata: Metadata = {
  title: "Bay - Admin Dashboard",
  description: "Admin dashboard for managing the Bay application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <link
        rel="shortcut icon"
        href="/logo_bay.svg"
        type="image/x-icon"
        className="rounded-lg"
      />
      <body className={`${inter.className} bg-gray-50`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

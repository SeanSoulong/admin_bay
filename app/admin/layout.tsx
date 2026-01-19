import { AuthProvider } from "../context/AuthContext";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Portal - Marketplace",
  description: "Administrative portal for managing marketplace content",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen">{children}</div>
    </AuthProvider>
  );
}

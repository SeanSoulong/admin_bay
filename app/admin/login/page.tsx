// app/admin/login/page.tsx
import AdminLogin from "../../components/AdminLogin";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login - Marketplace Dashboard",
  description: "Login page for marketplace admin dashboard",
};

export default function AdminLoginPage() {
  return <AdminLogin />;
}

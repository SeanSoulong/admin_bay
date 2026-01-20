import { AuthProvider } from "../context/AuthContext";

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

"use client";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "./Navbar";
import LoginPage from "./LoginPage";

function Gated({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <LoginPage />;
  return (
    <>
      <Navbar />
      <main className="container">{children}</main>
    </>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Gated>{children}</Gated>
      </ThemeProvider>
    </AuthProvider>
  );
}

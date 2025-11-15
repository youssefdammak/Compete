"use client";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Analytics } from "@vercel/analytics/next";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== "/auth") {
      router.replace("/auth");
    }
    if (!loading && user && pathname === "/auth") {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);

  if (loading || (!user && pathname !== "/auth")) {
    return null;
  }
  return <>{children}</>;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = pathname !== "/auth";
  return (
    <AuthProvider>
      <RequireAuth>
        {showSidebar && <Sidebar />}
        <div className={showSidebar ? "ml-64" : ""}>{children}</div>
        <Analytics />
      </RequireAuth>
    </AuthProvider>
  );
}

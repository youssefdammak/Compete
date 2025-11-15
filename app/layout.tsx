import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ClientLayout from "./ClientLayout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Competitor Pulse - Market Dashboard",
  description: "Real-time competitive intelligence and market insights dashboard",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}


function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // If not loading, not logged in, and not on /auth, redirect to /auth
    if (!loading && !user && pathname !== "/auth") {
      router.replace("/auth");
    }
    // If logged in and on /auth, redirect to dashboard
    if (!loading && user && pathname === "/auth") {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);

  // Show nothing while loading or redirecting
  if (loading || (!user && pathname !== "/auth")) {
    return null;
  }
  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}

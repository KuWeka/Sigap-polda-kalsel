"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { SocketProvider, useSocket } from "@/providers/SocketProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { settingsApi } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SystemSettings {
  appName: string;
  appLogo: string | null;
}

// ─── Inner Layout (needs auth & socket context) ─────────────────────────────

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { unreadCount } = useSocket();
  const currentPath = usePathname();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    appName: "SIGAP",
    appLogo: null,
  });

  // Fetch system settings on mount
  useEffect(() => {
    settingsApi
      .get()
      .then((res) => {
        const data = res.data?.data || res.data;
        if (data) {
          setSettings({
            appName: data.appName || "SIGAP",
            appLogo: data.appLogo || null,
          });
        }
      })
      .catch(() => {
        // Use defaults if settings fetch fails
      });
  }, []);

  // Show loading skeleton while auth is initializing
  if (isLoading) {
    return (
      <div className="flex h-screen">
        {/* Sidebar skeleton (desktop) — dark bg to match real sidebar */}
        <div className="hidden lg:flex w-64 flex-shrink-0 flex-col bg-[#0f172a] border-r border-[#1e293b] p-4 gap-4">
          <Skeleton className="h-8 w-32 bg-white/10" />
          <div className="flex flex-col gap-2 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full bg-white/10" />
            ))}
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b flex items-center px-4 gap-4">
            <Skeleton className="h-8 w-8 lg:hidden" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, render nothing (middleware handles redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  const logoUrl = settings.appLogo
    ? `${process.env.NEXT_PUBLIC_API_URL || '/api'}/settings/logo`
    : "";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar
          role={user.role}
          currentPath={currentPath}
          appName={settings.appName}
          appLogo={logoUrl || null}
          user={{ nama: user.nama, role: user.role, foto: null }}
          unreadCount={unreadCount}
        />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        role={user.role}
        currentPath={currentPath}
        appName={settings.appName}
        appLogo={logoUrl}
        user={{ nama: user.nama, role: user.role }}
        unreadCount={unreadCount}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        {/* Header (visible on mobile, shows hamburger; on desktop shows user menu) */}
        <Header
          onMenuToggle={() => setDrawerOpen(true)}
          user={{ nama: user.nama, role: user.role }}
          unreadCount={unreadCount}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── Root Dashboard Layout (wraps with providers) ───────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryProvider>
          <SocketProvider>
            <ToastProvider>
              <DashboardLayoutInner>{children}</DashboardLayoutInner>
            </ToastProvider>
          </SocketProvider>
        </QueryProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

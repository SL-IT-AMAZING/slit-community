"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { redirect } from "next/navigation";

import AdminSidebar from "@/components/admin/admin-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FaBars } from "react-icons/fa6";

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session, status } = useSession();
  const locale = useLocale();
  const t = useTranslations();

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex min-h-screen">
        <div className="hidden w-64 border-r bg-card md:block">
          <Skeleton className="h-screen w-full" />
        </div>
        <div className="flex-1 p-4 md:p-8">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Check if user is authenticated and is admin
  if (!session?.user) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/admin`);
  }

  // Check if user has admin role
  if (session.user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">
            {t("admin.accessDenied")}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.adminRequired")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile header with hamburger */}
      <div className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center border-b bg-background px-4 md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="min-h-[44px] min-w-[44px]"
        >
          <FaBars size={20} />
        </Button>
        <span className="ml-3 font-cera text-lg font-bold">Admin</span>
      </div>

      <main className="flex-1 p-4 pt-[70px] md:ml-64 md:p-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}

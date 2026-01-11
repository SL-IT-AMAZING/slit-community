"use client";

import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { redirect } from "next/navigation";

import AdminSidebar from "@/components/admin/admin-sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({ children }) {
  const { data: session, status } = useSession();
  const locale = useLocale();
  const t = useTranslations();

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 border-r bg-card">
          <Skeleton className="h-screen w-full" />
        </div>
        <div className="flex-1 p-8">
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
      <AdminSidebar />
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  );
}

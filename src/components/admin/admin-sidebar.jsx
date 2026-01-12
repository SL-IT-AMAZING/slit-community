"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

import { Button } from "@/components/ui/button";

import {
  FaHouse,
  FaNewspaper,
  FaUsers,
  FaGear,
  FaChartLine,
  FaPlus,
  FaArrowLeft,
  FaRss,
} from "react-icons/fa6";

const navItems = [
  {
    name: "Dashboard",
    nameKo: "대시보드",
    href: "/admin",
    icon: FaHouse,
  },
  {
    name: "Content",
    nameKo: "콘텐츠",
    href: "/admin/content",
    icon: FaNewspaper,
  },
  {
    name: "Crawler",
    nameKo: "크롤러",
    href: "/admin/crawler",
    icon: FaRss,
  },
  {
    name: "Users",
    nameKo: "사용자",
    href: "/admin/users",
    icon: FaUsers,
  },
  {
    name: "Analytics",
    nameKo: "분석",
    href: "/admin/analytics",
    icon: FaChartLine,
  },
  {
    name: "Settings",
    nameKo: "설정",
    href: "/admin/settings",
    icon: FaGear,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const locale = useLocale();

  const isActive = (href) => {
    const localizedPath = `/${locale}${href}`;
    if (href === "/admin") {
      return pathname === localizedPath;
    }
    return pathname.startsWith(localizedPath);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <span className="font-cera text-lg font-bold">Admin</span>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1">
              <FaArrowLeft size={12} />
              {locale === "ko" ? "사이트" : "Site"}
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon size={16} />
              {locale === "ko" ? item.nameKo : item.name}
            </Link>
          ))}
        </nav>

        {/* Quick Actions */}
        <div className="border-t p-4">
          <Link href="/admin/content/new">
            <Button className="w-full gap-2">
              <FaPlus size={12} />
              {locale === "ko" ? "새 콘텐츠" : "New Content"}
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}

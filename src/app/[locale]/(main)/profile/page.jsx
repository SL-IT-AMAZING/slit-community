"use client";

import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { FaUser, FaBookmark, FaCrown, FaGear } from "react-icons/fa6";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const t = useTranslations("profile");
  const locale = useLocale();

  if (status === "loading") {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container flex min-h-[50vh] flex-col items-center justify-center py-8">
        <p className="mb-4 text-muted-foreground">
          {locale === "ko"
            ? "로그인이 필요합니다."
            : "Please log in to view your profile."}
        </p>
        <Link href="/login">
          <Button>{locale === "ko" ? "로그인" : "Login"}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="mb-8 font-cera text-3xl font-bold">{t("title")}</h1>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Profile Card */}
          <Card>
            <CardContent className="flex flex-col items-center p-6">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent">
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <FaUser size={32} className="text-muted-foreground" />
                )}
              </div>
              <h2 className="text-lg font-semibold">
                {session.user?.name || "User"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {session.user?.email}
              </p>
              {session.user?.isPremium && (
                <span className="mt-2 flex items-center gap-1 rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-500">
                  <FaCrown size={12} />
                  Premium
                </span>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent"
                >
                  <FaGear size={14} />
                  {t("settings")}
                </Link>
                <Link
                  href="/profile/bookmarks"
                  className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent"
                >
                  <FaBookmark size={14} />
                  {t("bookmarks.title")}
                </Link>
                <button
                  onClick={() => alert("준비중입니다")}
                  className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-accent"
                >
                  <FaCrown size={14} />
                  {locale === "ko" ? "프리미엄 구독" : "Premium Subscription"}
                </button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">{t("displayName")}</Label>
                <Input
                  id="displayName"
                  defaultValue={session.user?.name || ""}
                  placeholder={locale === "ko" ? "표시 이름" : "Display name"}
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  value={session.user?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Subscription Status */}
              <div className="space-y-2">
                <Label>{t("subscription")}</Label>
                <div className="rounded-md border p-4">
                  {session.user?.isPremium ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-500">
                          {locale === "ko" ? "프리미엄 활성" : "Premium Active"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {locale === "ko"
                            ? "모든 프리미엄 콘텐츠에 접근할 수 있습니다."
                            : "You have access to all premium content."}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => alert("준비중입니다")}
                      >
                        {locale === "ko" ? "관리" : "Manage"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {locale === "ko" ? "무료 플랜" : "Free Plan"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {locale === "ko"
                            ? "프리미엄으로 업그레이드하고 모든 콘텐츠를 즐기세요."
                            : "Upgrade to premium to enjoy all content."}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => alert("준비중입니다")}>
                        {locale === "ko" ? "업그레이드" : "Upgrade"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <Button className="w-full md:w-auto">{t("update")}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

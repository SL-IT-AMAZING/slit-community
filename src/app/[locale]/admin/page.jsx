import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  FaNewspaper,
  FaUsers,
  FaCrown,
  FaEye,
  FaArrowUp,
  FaArrowRight,
  FaPlus,
} from "react-icons/fa6";

import {
  getAdminStats,
  fetchAllContent,
  fetchAllUsers,
} from "@/services/supabase";

export default async function AdminDashboard() {
  const locale = await getLocale();

  // Fetch data from Supabase
  const [stats, recentContent, recentUsers] = await Promise.all([
    getAdminStats(),
    fetchAllContent({ limitCount: 3 }),
    fetchAllUsers({ limitCount: 3 }),
  ]);

  // Calculate total views from content
  const totalViews = recentContent.reduce(
    (sum, content) => sum + (content.view_count || 0),
    0
  );

  const statCards = [
    {
      title: locale === "ko" ? "전체 콘텐츠" : "Total Content",
      value: stats?.totalContent || 0,
      icon: FaNewspaper,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: locale === "ko" ? "전체 사용자" : "Total Users",
      value: stats?.totalUsers || 0,
      icon: FaUsers,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: locale === "ko" ? "프리미엄 구독자" : "Premium Subscribers",
      value: stats?.premiumUsers || 0,
      icon: FaCrown,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: locale === "ko" ? "총 조회수" : "Total Views",
      value: totalViews,
      icon: FaEye,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-cera text-3xl font-bold">
            {locale === "ko" ? "대시보드" : "Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {locale === "ko"
              ? "AI Community 관리자 페이지에 오신 것을 환영합니다."
              : "Welcome to the AI Community admin dashboard."}
          </p>
        </div>
        <Link href="/admin/content/new">
          <Button className="gap-2">
            <FaPlus size={12} />
            {locale === "ko" ? "새 콘텐츠" : "New Content"}
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${stat.bgColor}`}
                >
                  <stat.icon size={20} className={stat.color} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Content & Users */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Content */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              {locale === "ko" ? "최근 콘텐츠" : "Recent Content"}
            </CardTitle>
            <Link href="/admin/content">
              <Button variant="ghost" size="sm" className="gap-1">
                {locale === "ko" ? "전체 보기" : "View All"}
                <FaArrowRight size={12} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentContent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "ko" ? "콘텐츠가 없습니다." : "No content yet."}
                </p>
              ) : (
                recentContent.map((content) => (
                  <div
                    key={content.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {locale === "ko"
                          ? content.title
                          : content.title_en || content.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(content.view_count || 0).toLocaleString()}{" "}
                        {locale === "ko" ? "조회" : "views"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        content.status === "published"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-yellow-500/10 text-yellow-500"
                      }`}
                    >
                      {content.status === "published"
                        ? locale === "ko"
                          ? "게시됨"
                          : "Published"
                        : locale === "ko"
                        ? "초안"
                        : "Draft"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              {locale === "ko" ? "최근 사용자" : "Recent Users"}
            </CardTitle>
            <Link href="/admin/users">
              <Button variant="ghost" size="sm" className="gap-1">
                {locale === "ko" ? "전체 보기" : "View All"}
                <FaArrowRight size={12} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "ko" ? "사용자가 없습니다." : "No users yet."}
                </p>
              ) : (
                recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {user.display_name || user.email?.split("@")[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    {user.is_premium && (
                      <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">
                        <FaCrown size={10} />
                        Premium
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

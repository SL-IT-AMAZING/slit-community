import { getLocale } from "next-intl/server";
import { fetchAllUsers } from "@/services/supabase";
import AdminUsersList from "./users-list";

export default async function AdminUsersPage() {
  const locale = await getLocale();
  const users = await fetchAllUsers({ limitCount: 100 });

  return <AdminUsersList initialUsers={users} locale={locale} />;
}

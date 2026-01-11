"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  FaMagnifyingGlass,
  FaUser,
  FaCrown,
  FaShield,
} from "react-icons/fa6";

import { createClient } from "@/lib/supabase/client";

export default function AdminUsersList({ initialUsers, locale }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredUsers = users.filter((user) => {
    const name = user.display_name || "";
    const email = user.email || "";
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const openActionDialog = (user, type) => {
    setSelectedUser(user);
    setActionType(type);
    setDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;

    setIsUpdating(true);
    try {
      const supabase = createClient();

      if (actionType === "togglePremium") {
        const newPremiumStatus = !selectedUser.is_premium;
        const { error } = await supabase
          .from("users")
          .update({ is_premium: newPremiumStatus })
          .eq("id", selectedUser.id);

        if (error) {
          console.error("Error updating premium status:", error);
          alert(locale === "ko" ? "업데이트에 실패했습니다." : "Failed to update.");
          return;
        }

        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id ? { ...u, is_premium: newPremiumStatus } : u
          )
        );
      } else if (actionType === "toggleRole") {
        const newRole = selectedUser.role === "admin" ? "user" : "admin";
        const { error } = await supabase
          .from("users")
          .update({ role: newRole })
          .eq("id", selectedUser.id);

        if (error) {
          console.error("Error updating role:", error);
          alert(locale === "ko" ? "업데이트에 실패했습니다." : "Failed to update.");
          return;
        }

        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id ? { ...u, role: newRole } : u
          )
        );
      }

      router.refresh();
    } catch (error) {
      console.error("Error performing action:", error);
      alert(locale === "ko" ? "업데이트에 실패했습니다." : "Failed to update.");
    } finally {
      setIsUpdating(false);
      setDialogOpen(false);
      setSelectedUser(null);
      setActionType(null);
    }
  };

  const getDialogContent = () => {
    if (!selectedUser || !actionType) return {};

    if (actionType === "togglePremium") {
      const action = selectedUser.is_premium
        ? locale === "ko"
          ? "제거"
          : "remove"
        : locale === "ko"
        ? "부여"
        : "grant";

      const userName = selectedUser.display_name || selectedUser.email?.split("@")[0];

      return {
        title:
          locale === "ko"
            ? `프리미엄 ${action}`
            : `${action.charAt(0).toUpperCase() + action.slice(1)} Premium`,
        description:
          locale === "ko"
            ? `${userName}의 프리미엄 상태를 ${action}하시겠습니까?`
            : `Are you sure you want to ${action} premium status for ${userName}?`,
        confirmText: locale === "ko" ? "확인" : "Confirm",
      };
    }

    if (actionType === "toggleRole") {
      const newRole = selectedUser.role === "admin" ? "user" : "admin";
      const userName = selectedUser.display_name || selectedUser.email?.split("@")[0];

      return {
        title: locale === "ko" ? "역할 변경" : "Change Role",
        description:
          locale === "ko"
            ? `${userName}의 역할을 ${newRole}(으)로 변경하시겠습니까?`
            : `Are you sure you want to change ${userName}'s role to ${newRole}?`,
        confirmText: locale === "ko" ? "확인" : "Confirm",
      };
    }

    return {};
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US");
  };

  const dialogContent = getDialogContent();

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-cera text-3xl font-bold">
          {locale === "ko" ? "사용자 관리" : "User Management"}
        </h1>
        <p className="text-muted-foreground">
          {locale === "ko"
            ? `총 ${users.length}명의 사용자`
            : `${users.length} total users`}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <FaUser size={16} className="text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">
                {locale === "ko" ? "전체 사용자" : "Total Users"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
              <FaCrown size={16} className="text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {users.filter((u) => u.is_premium).length}
              </p>
              <p className="text-sm text-muted-foreground">
                {locale === "ko" ? "프리미엄" : "Premium"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
              <FaShield size={16} className="text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {users.filter((u) => u.role === "admin").length}
              </p>
              <p className="text-sm text-muted-foreground">
                {locale === "ko" ? "관리자" : "Admins"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <FaMagnifyingGlass
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={14}
        />
        <Input
          type="text"
          placeholder={
            locale === "ko" ? "이름 또는 이메일로 검색..." : "Search by name or email..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* User List */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                {locale === "ko" ? "사용자가 없습니다." : "No users found."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
                    {user.photo_url ? (
                      <img
                        src={user.photo_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <FaUser size={16} className="text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {user.display_name || user.email?.split("@")[0]}
                      </h3>
                      {user.role === "admin" && (
                        <Badge className="gap-1 bg-purple-500/10 text-purple-500">
                          <FaShield size={8} />
                          Admin
                        </Badge>
                      )}
                      {user.is_premium && (
                        <Badge className="gap-1 bg-yellow-500/10 text-yellow-500">
                          <FaCrown size={8} />
                          Premium
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{user.email}</span>
                      <span>
                        {locale === "ko" ? "가입일" : "Joined"}: {formatDate(user.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openActionDialog(user, "togglePremium")}
                  >
                    {user.is_premium
                      ? locale === "ko"
                        ? "프리미엄 해제"
                        : "Remove Premium"
                      : locale === "ko"
                      ? "프리미엄 부여"
                      : "Grant Premium"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openActionDialog(user, "toggleRole")}
                  >
                    {user.role === "admin"
                      ? locale === "ko"
                        ? "관리자 해제"
                        : "Remove Admin"
                      : locale === "ko"
                      ? "관리자 부여"
                      : "Make Admin"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogContent.title}</DialogTitle>
            <DialogDescription>{dialogContent.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isUpdating}
            >
              {locale === "ko" ? "취소" : "Cancel"}
            </Button>
            <Button onClick={handleAction} disabled={isUpdating}>
              {isUpdating ? "..." : dialogContent.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

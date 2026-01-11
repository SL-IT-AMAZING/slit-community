"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";

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
  FaPlus,
  FaMagnifyingGlass,
  FaPen,
  FaTrash,
  FaEye,
  FaCrown,
  FaNewspaper,
  FaVideo,
  FaCode,
} from "react-icons/fa6";

import { createClient } from "@/lib/supabase/client";

function ContentTypeIcon({ type }) {
  switch (type) {
    case "video":
      return <FaVideo size={12} />;
    case "open-source":
      return <FaCode size={12} />;
    default:
      return <FaNewspaper size={12} />;
  }
}

export default function AdminContentList({ initialContent, locale }) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredContent = content.filter((item) => {
    const title = locale === "ko" ? item.title : item.title_en || item.title;
    return title?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleDelete = async () => {
    if (!contentToDelete) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("content")
        .delete()
        .eq("id", contentToDelete.id);

      if (error) {
        console.error("Delete error:", error);
        alert(locale === "ko" ? "삭제에 실패했습니다." : "Failed to delete.");
        return;
      }

      setContent((prev) => prev.filter((item) => item.id !== contentToDelete.id));
      setDeleteDialogOpen(false);
      setContentToDelete(null);
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
      alert(locale === "ko" ? "삭제에 실패했습니다." : "Failed to delete.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (item) => {
    setContentToDelete(item);
    setDeleteDialogOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US");
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-cera text-3xl font-bold">
            {locale === "ko" ? "콘텐츠 관리" : "Content Management"}
          </h1>
          <p className="text-muted-foreground">
            {locale === "ko"
              ? `총 ${content.length}개의 콘텐츠`
              : `${content.length} total content items`}
          </p>
        </div>
        <Link href="/admin/content/new">
          <Button className="gap-2">
            <FaPlus size={12} />
            {locale === "ko" ? "새 콘텐츠" : "New Content"}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <FaMagnifyingGlass
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={14}
        />
        <Input
          type="text"
          placeholder={locale === "ko" ? "콘텐츠 검색..." : "Search content..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {filteredContent.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                {locale === "ko" ? "콘텐츠가 없습니다." : "No content found."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredContent.map((item) => (
            <Card key={item.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <ContentTypeIcon type={item.type} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {locale === "ko"
                          ? item.title
                          : item.title_en || item.title}
                      </h3>
                      {item.is_premium && (
                        <Badge className="gap-1 bg-yellow-500/10 text-yellow-500">
                          <FaCrown size={8} />
                          Premium
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                      <span>{item.category}</span>
                      <span className="flex items-center gap-1">
                        <FaEye size={10} />
                        {(item.view_count || 0).toLocaleString()}
                      </span>
                      {item.published_at && (
                        <span>{formatDate(item.published_at)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={item.status === "published" ? "default" : "secondary"}
                    className={
                      item.status === "published"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-yellow-500/10 text-yellow-500"
                    }
                  >
                    {item.status === "published"
                      ? locale === "ko"
                        ? "게시됨"
                        : "Published"
                      : locale === "ko"
                      ? "초안"
                      : "Draft"}
                  </Badge>

                  <Link href={`/admin/content/${item.id}`}>
                    <Button variant="ghost" size="icon">
                      <FaPen size={14} />
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => openDeleteDialog(item)}
                  >
                    <FaTrash size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locale === "ko" ? "콘텐츠 삭제" : "Delete Content"}
            </DialogTitle>
            <DialogDescription>
              {locale === "ko"
                ? `"${contentToDelete?.title}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
                : `Are you sure you want to delete "${contentToDelete?.title}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {locale === "ko" ? "취소" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? "..."
                : locale === "ko"
                ? "삭제"
                : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

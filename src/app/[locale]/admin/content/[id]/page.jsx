"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import RichTextEditor from "@/components/admin/rich-text-editor";

import { FaArrowLeft, FaFloppyDisk, FaTrash } from "react-icons/fa6";
import { createClient } from "@/lib/supabase/client";

const CONTENT_TYPES = [
  { value: "article", label: "Article", labelKo: "아티클" },
  { value: "news", label: "News", labelKo: "뉴스" },
  { value: "video", label: "Video", labelKo: "비디오" },
  { value: "open-source", label: "Open Source", labelKo: "오픈소스" },
  { value: "x-thread", label: "X Thread", labelKo: "X 스레드" },
  { value: "linkedin", label: "LinkedIn", labelKo: "링크드인" },
  { value: "newsletter", label: "Newsletter", labelKo: "뉴스레터" },
];

const CATEGORIES = [
  { value: "ai-basics", label: "AI Basics", labelKo: "AI 기초" },
  { value: "llm", label: "LLM", labelKo: "LLM" },
  { value: "image-generation", label: "Image Generation", labelKo: "이미지 생성" },
  { value: "ai-tools", label: "AI Tools", labelKo: "AI 도구" },
  { value: "tutorials", label: "Tutorials", labelKo: "튜토리얼" },
  { value: "industry-trends", label: "Industry Trends", labelKo: "업계 트렌드" },
  { value: "open-source", label: "Open Source", labelKo: "오픈소스" },
  { value: "ai-monetization", label: "AI Monetization", labelKo: "AI 수익화" },
  { value: "research-papers", label: "Research Papers", labelKo: "연구 논문" },
];

export default function EditContentPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    titleEn: "",
    slug: "",
    description: "",
    descriptionEn: "",
    body: "",
    bodyEn: "",
    type: "article",
    category: "ai-basics",
    tags: "",
    thumbnailUrl: "",
    externalUrl: "",
    isPremium: false,
    isFeatured: false,
    status: "draft",
  });

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("content")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching content:", error);
          router.push(`/${locale}/admin/content`);
          return;
        }

        if (data) {
          setFormData({
            title: data.title || "",
            titleEn: data.title_en || "",
            slug: data.slug || "",
            description: data.description || "",
            descriptionEn: data.description_en || "",
            body: data.body || "",
            bodyEn: data.body_en || "",
            type: data.type || "article",
            category: data.category || "ai-basics",
            tags: (data.tags || []).join(", "),
            thumbnailUrl: data.thumbnail_url || "",
            externalUrl: data.external_url || "",
            isPremium: data.is_premium || false,
            isFeatured: data.is_featured || false,
            status: data.status || "draft",
            publishedAt: data.published_at,
          });
        }
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [id, locale, router]);

  const handleSubmit = async (status) => {
    setIsSaving(true);

    try {
      const supabase = createClient();

      const updateData = {
        title: formData.title,
        title_en: formData.titleEn,
        slug: formData.slug,
        description: formData.description,
        description_en: formData.descriptionEn,
        body: formData.body,
        body_en: formData.bodyEn,
        type: formData.type,
        category: formData.category,
        tags: formData.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        thumbnail_url: formData.thumbnailUrl,
        external_url: formData.externalUrl,
        is_premium: formData.isPremium,
        is_featured: formData.isFeatured,
        status: status,
        updated_at: new Date().toISOString(),
      };

      // Set published_at if publishing for first time
      if (status === "published" && !formData.publishedAt) {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("content")
        .update(updateData)
        .eq("id", id);

      if (error) {
        console.error("Error updating content:", error);
        alert(locale === "ko" ? "저장에 실패했습니다." : "Failed to save.");
        return;
      }

      router.push(`/${locale}/admin/content`);
    } catch (error) {
      console.error("Error updating content:", error);
      alert(locale === "ko" ? "저장에 실패했습니다." : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(locale === "ko" ? "정말 삭제하시겠습니까?" : "Are you sure you want to delete this?")) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from("content").delete().eq("id", id);

      if (error) {
        console.error("Error deleting content:", error);
        alert(locale === "ko" ? "삭제에 실패했습니다." : "Failed to delete.");
        return;
      }

      router.push(`/${locale}/admin/content`);
    } catch (error) {
      console.error("Error deleting content:", error);
      alert(locale === "ko" ? "삭제에 실패했습니다." : "Failed to delete.");
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/content">
            <Button variant="ghost" size="icon">
              <FaArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="font-cera text-3xl font-bold">
              {locale === "ko" ? "콘텐츠 수정" : "Edit Content"}
            </h1>
            <p className="text-muted-foreground">{formData.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            disabled={isSaving}
          >
            <FaTrash size={14} />
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit("draft")}
            disabled={isSaving}
          >
            {locale === "ko" ? "초안 저장" : "Save Draft"}
          </Button>
          <Button
            onClick={() => handleSubmit("published")}
            disabled={isSaving}
            className="gap-2"
          >
            <FaFloppyDisk size={14} />
            {formData.status === "published"
              ? locale === "ko"
                ? "업데이트"
                : "Update"
              : locale === "ko"
              ? "게시"
              : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>
                {locale === "ko" ? "기본 정보" : "Basic Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  {locale === "ko" ? "제목 (한국어)" : "Title (Korean)"}
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="titleEn">
                  {locale === "ko" ? "제목 (영어)" : "Title (English)"}
                </Label>
                <Input
                  id="titleEn"
                  value={formData.titleEn}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, titleEn: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  {locale === "ko" ? "설명 (한국어)" : "Description (Korean)"}
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descriptionEn">
                  {locale === "ko" ? "설명 (영어)" : "Description (English)"}
                </Label>
                <Textarea
                  id="descriptionEn"
                  value={formData.descriptionEn}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      descriptionEn: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Body */}
          <Card>
            <CardHeader>
              <CardTitle>
                {locale === "ko" ? "본문 (한국어)" : "Content (Korean)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={formData.body}
                onChange={(content) =>
                  setFormData((prev) => ({ ...prev, body: content }))
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {locale === "ko" ? "본문 (영어)" : "Content (English)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={formData.bodyEn}
                onChange={(content) =>
                  setFormData((prev) => ({ ...prev, bodyEn: content }))
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{locale === "ko" ? "설정" : "Settings"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">
                  {locale === "ko" ? "콘텐츠 유형" : "Content Type"}
                </Label>
                <select
                  id="type"
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, type: e.target.value }))
                  }
                >
                  {CONTENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {locale === "ko" ? type.labelKo : type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  {locale === "ko" ? "카테고리" : "Category"}
                </Label>
                <select
                  id="category"
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category: e.target.value }))
                  }
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {locale === "ko" ? cat.labelKo : cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">
                  {locale === "ko" ? "태그 (쉼표로 구분)" : "Tags (comma separated)"}
                </Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tags: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isPremium">
                  {locale === "ko" ? "프리미엄 콘텐츠" : "Premium Content"}
                </Label>
                <Switch
                  id="isPremium"
                  checked={formData.isPremium}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isPremium: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isFeatured">
                  {locale === "ko" ? "추천 콘텐츠" : "Featured Content"}
                </Label>
                <Switch
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isFeatured: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>{locale === "ko" ? "미디어" : "Media"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="thumbnailUrl">
                  {locale === "ko" ? "썸네일 URL" : "Thumbnail URL"}
                </Label>
                <Input
                  id="thumbnailUrl"
                  value={formData.thumbnailUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      thumbnailUrl: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="externalUrl">
                  {locale === "ko" ? "외부 링크" : "External URL"}
                </Label>
                <Input
                  id="externalUrl"
                  value={formData.externalUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      externalUrl: e.target.value,
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

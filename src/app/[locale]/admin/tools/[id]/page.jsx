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

import { FaArrowLeft, FaFloppyDisk, FaTrash } from "react-icons/fa6";
import { createClient } from "@/lib/supabase/client";

const TAGS = [
  "ui",
  "vibe-coding",
  "automation",
  "etc",
  "opensource",
  "methodology",
  "claude",
  "content-creation",
];

const PRICING_OPTIONS = [
  { value: "free", label: "Free", labelKo: "무료" },
  { value: "paid", label: "Paid", labelKo: "유료" },
  { value: "freemium", label: "Freemium", labelKo: "프리미엄" },
];

export default function EditToolPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    descriptionEn: "",
    link: "",
    thumbnailUrl: "",
    adminRating: 3,
    tags: [],
    pricing: "free",
    isFeatured: false,
    pros: [""],
    cons: [""],
  });

  useEffect(() => {
    const fetchTool = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("tools")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching tool:", error);
          router.push(`/${locale}/admin/tools`);
          return;
        }

        if (data) {
          setFormData({
            name: data.name || "",
            slug: data.slug || "",
            description: data.description || "",
            descriptionEn: data.description_en || "",
            link: data.link || "",
            thumbnailUrl: data.thumbnail_url || "",
            adminRating: data.admin_rating || 3,
            tags: data.tags || [],
            pricing: data.pricing || "free",
            isFeatured: data.is_featured || false,
            pros: data.pros && data.pros.length > 0 ? data.pros : [""],
            cons: data.cons && data.cons.length > 0 ? data.cons : [""],
          });
        }
      } catch (error) {
        console.error("Error fetching tool:", error);
        router.push(`/${locale}/admin/tools`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTool();
  }, [id, locale, router]);

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handleTagToggle = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleProChange = (index, value) => {
    const newPros = [...formData.pros];
    newPros[index] = value;
    setFormData((prev) => ({ ...prev, pros: newPros }));
  };

  const handleAddPro = () => {
    setFormData((prev) => ({ ...prev, pros: [...prev.pros, ""] }));
  };

  const handleRemovePro = (index) => {
    setFormData((prev) => ({
      ...prev,
      pros: prev.pros.filter((_, i) => i !== index),
    }));
  };

  const handleConChange = (index, value) => {
    const newCons = [...formData.cons];
    newCons[index] = value;
    setFormData((prev) => ({ ...prev, cons: newCons }));
  };

  const handleAddCon = () => {
    setFormData((prev) => ({ ...prev, cons: [...prev.cons, ""] }));
  };

  const handleRemoveCon = (index) => {
    setFormData((prev) => ({
      ...prev,
      cons: prev.cons.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.slug || !formData.link) {
      alert(
        locale === "ko"
          ? "이름, 슬러그, 링크는 필수입니다."
          : "Name, slug, and link are required.",
      );
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();

      const updateData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        description_en: formData.descriptionEn,
        link: formData.link,
        thumbnail_url: formData.thumbnailUrl,
        admin_rating: formData.adminRating,
        tags: formData.tags,
        pricing: formData.pricing,
        is_featured: formData.isFeatured,
        pros: formData.pros.filter((p) => p.trim()),
        cons: formData.cons.filter((c) => c.trim()),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("tools")
        .update(updateData)
        .eq("id", id);

      if (error) {
        console.error("Error updating tool:", error);
        if (error.message.includes("duplicate")) {
          alert(
            locale === "ko"
              ? "이미 존재하는 슬러그입니다."
              : "This slug already exists.",
          );
        } else {
          alert(locale === "ko" ? "저장에 실패했습니다." : "Failed to save.");
        }
        return;
      }

      router.push(`/${locale}/admin/tools`);
    } catch (error) {
      console.error("Error updating tool:", error);
      alert(locale === "ko" ? "저장에 실패했습니다." : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        locale === "ko"
          ? "정말 삭제하시겠습니까?"
          : "Are you sure you want to delete this?",
      )
    ) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from("tools").delete().eq("id", id);

      if (error) {
        console.error("Error deleting tool:", error);
        alert(locale === "ko" ? "삭제에 실패했습니다." : "Failed to delete.");
        return;
      }

      router.push(`/${locale}/admin/tools`);
    } catch (error) {
      console.error("Error deleting tool:", error);
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
          <Link href="/admin/tools">
            <Button variant="ghost" size="icon">
              <FaArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="font-cera text-3xl font-bold">
              {locale === "ko" ? "도구 수정" : "Edit Tool"}
            </h1>
            <p className="text-muted-foreground">{formData.name}</p>
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
          <Button onClick={handleSubmit} disabled={isSaving} className="gap-2">
            <FaFloppyDisk size={14} />
            {locale === "ko" ? "저장" : "Save"}
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
                <Label htmlFor="name">
                  {locale === "ko" ? "도구 이름" : "Tool Name"}
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder={
                    locale === "ko"
                      ? "도구 이름을 입력하세요"
                      : "Enter tool name"
                  }
                  required
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
                  placeholder="tool-url-slug"
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
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder={
                    locale === "ko"
                      ? "도구 설명을 입력하세요"
                      : "Enter description"
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
                  placeholder="Enter description in English"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link">
                  {locale === "ko" ? "링크" : "Link"}
                </Label>
                <Input
                  id="link"
                  type="url"
                  value={formData.link}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, link: e.target.value }))
                  }
                  placeholder="https://..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnailUrl">
                  {locale === "ko" ? "썸네일 URL" : "Thumbnail URL"}
                </Label>
                <Input
                  id="thumbnailUrl"
                  type="url"
                  value={formData.thumbnailUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      thumbnailUrl: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Pros & Cons */}
          <Card>
            <CardHeader>
              <CardTitle>{locale === "ko" ? "장점" : "Pros"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.pros.map((pro, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={pro}
                    onChange={(e) => handleProChange(index, e.target.value)}
                    placeholder={
                      locale === "ko" ? "장점을 입력하세요" : "Enter a pro"
                    }
                  />
                  {formData.pros.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePro(index)}
                    >
                      <FaTrash size={14} />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={handleAddPro}
                className="w-full"
              >
                {locale === "ko" ? "+ 장점 추가" : "+ Add Pro"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{locale === "ko" ? "단점" : "Cons"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.cons.map((con, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={con}
                    onChange={(e) => handleConChange(index, e.target.value)}
                    placeholder={
                      locale === "ko" ? "단점을 입력하세요" : "Enter a con"
                    }
                  />
                  {formData.cons.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCon(index)}
                    >
                      <FaTrash size={14} />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={handleAddCon}
                className="w-full"
              >
                {locale === "ko" ? "+ 단점 추가" : "+ Add Con"}
              </Button>
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
                <Label htmlFor="pricing">
                  {locale === "ko" ? "가격 정책" : "Pricing"}
                </Label>
                <select
                  id="pricing"
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={formData.pricing}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pricing: e.target.value,
                    }))
                  }
                >
                  {PRICING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {locale === "ko" ? option.labelKo : option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminRating">
                  {locale === "ko" ? "관리자 평점" : "Admin Rating"}
                </Label>
                <select
                  id="adminRating"
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={formData.adminRating}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      adminRating: parseInt(e.target.value),
                    }))
                  }
                >
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating} / 5
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isFeatured">
                  {locale === "ko" ? "추천 도구" : "Featured"}
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

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>{locale === "ko" ? "태그" : "Tags"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {TAGS.map((tag) => (
                <div key={tag} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`tag-${tag}`}
                    checked={formData.tags.includes(tag)}
                    onChange={() => handleTagToggle(tag)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={`tag-${tag}`} className="cursor-pointer">
                    {tag}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import RichTextEditor from "@/components/admin/rich-text-editor";

import { FaArrowLeft, FaFloppyDisk, FaEye } from "react-icons/fa6";
import { createClient } from "@/lib/supabase/client";

const CONTENT_TYPES = [
  { value: "article", label: "Article", labelKo: "아티클" },
  { value: "news", label: "News", labelKo: "뉴스" },
  { value: "video", label: "Video (YouTube)", labelKo: "비디오 (YouTube)" },
  { value: "open-source", label: "Open Source (GitHub)", labelKo: "오픈소스 (GitHub)" },
  { value: "x-thread", label: "X Thread", labelKo: "X 스레드" },
  { value: "linkedin", label: "LinkedIn", labelKo: "링크드인" },
  { value: "threads", label: "Threads", labelKo: "Threads" },
  { value: "reddit", label: "Reddit", labelKo: "Reddit" },
  { value: "newsletter", label: "Newsletter", labelKo: "뉴스레터" },
];

// SNS 타입 목록
const SNS_TYPES = ["video", "x-thread", "linkedin", "threads", "open-source", "reddit"];

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

export default function NewContentPage() {
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);

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
    // Author Info
    authorName: "",
    authorHandle: "",
    authorAvatar: "",
    authorTitle: "",
    // YouTube (video)
    videoId: "",
    channelName: "",
    channelAvatar: "",
    viewCount: "",
    likeCount: "",
    duration: "",
    // X/Twitter (x-thread)
    retweetCount: "",
    replyCount: "",
    mediaUrls: "",
    // GitHub (open-source)
    repoOwner: "",
    repoName: "",
    language: "",
    languageColor: "",
    stars: "",
    forks: "",
    issues: "",
    topics: "",
    readmeImageUrl: "",
    // Reddit
    subreddit: "",
    upvotes: "",
    downvotes: "",
    commentCount: "",
    awards: "",
    // LinkedIn/Threads
    repostCount: "",
  });

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }));
  };

  // SNS 타입별 social_metadata 구성
  const buildSocialMetadata = () => {
    const type = formData.type;
    const metadata = {};

    if (type === "video") {
      if (formData.videoId) metadata.videoId = formData.videoId;
      if (formData.channelName) metadata.channelName = formData.channelName;
      if (formData.channelAvatar) metadata.channelAvatar = formData.channelAvatar;
      if (formData.viewCount) metadata.viewCount = parseInt(formData.viewCount) || 0;
      if (formData.likeCount) metadata.likeCount = parseInt(formData.likeCount) || 0;
      if (formData.duration) metadata.duration = formData.duration;
    } else if (type === "x-thread") {
      if (formData.likeCount) metadata.likeCount = parseInt(formData.likeCount) || 0;
      if (formData.retweetCount) metadata.retweetCount = parseInt(formData.retweetCount) || 0;
      if (formData.replyCount) metadata.replyCount = parseInt(formData.replyCount) || 0;
      if (formData.mediaUrls) {
        metadata.mediaUrls = formData.mediaUrls.split(",").map((url) => url.trim()).filter(Boolean);
      }
    } else if (type === "linkedin") {
      if (formData.likeCount) metadata.likeCount = parseInt(formData.likeCount) || 0;
      if (formData.commentCount) metadata.commentCount = parseInt(formData.commentCount) || 0;
      if (formData.repostCount) metadata.repostCount = parseInt(formData.repostCount) || 0;
    } else if (type === "threads") {
      if (formData.likeCount) metadata.likeCount = parseInt(formData.likeCount) || 0;
      if (formData.replyCount) metadata.replyCount = parseInt(formData.replyCount) || 0;
      if (formData.repostCount) metadata.repostCount = parseInt(formData.repostCount) || 0;
      if (formData.mediaUrls) {
        metadata.mediaUrls = formData.mediaUrls.split(",").map((url) => url.trim()).filter(Boolean);
      }
    } else if (type === "open-source") {
      if (formData.repoOwner) metadata.repoOwner = formData.repoOwner;
      if (formData.repoName) metadata.repoName = formData.repoName;
      if (formData.language) metadata.language = formData.language;
      if (formData.languageColor) metadata.languageColor = formData.languageColor;
      if (formData.stars) metadata.stars = parseInt(formData.stars) || 0;
      if (formData.forks) metadata.forks = parseInt(formData.forks) || 0;
      if (formData.issues) metadata.issues = parseInt(formData.issues) || 0;
      if (formData.topics) {
        metadata.topics = formData.topics.split(",").map((t) => t.trim()).filter(Boolean);
      }
    } else if (type === "reddit") {
      if (formData.subreddit) metadata.subreddit = formData.subreddit;
      if (formData.upvotes) metadata.upvotes = parseInt(formData.upvotes) || 0;
      if (formData.downvotes) metadata.downvotes = parseInt(formData.downvotes) || 0;
      if (formData.commentCount) metadata.commentCount = parseInt(formData.commentCount) || 0;
      if (formData.awards) {
        metadata.awards = formData.awards.split(",").map((a) => a.trim()).filter(Boolean);
      }
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  };

  // author_info 구성
  const buildAuthorInfo = () => {
    const info = {};
    if (formData.authorName) info.name = formData.authorName;
    if (formData.authorHandle) info.handle = formData.authorHandle;
    if (formData.authorAvatar) info.avatar = formData.authorAvatar;
    if (formData.authorTitle) info.title = formData.authorTitle;
    return Object.keys(info).length > 0 ? info : null;
  };

  const handleSubmit = async (status) => {
    if (!formData.title || !formData.slug) {
      alert(locale === "ko" ? "제목과 슬러그는 필수입니다." : "Title and slug are required.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const socialMetadata = buildSocialMetadata();
      const authorInfo = buildAuthorInfo();

      const insertData = {
        slug: formData.slug,
        title: formData.title,
        title_en: formData.titleEn,
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
        published_at: status === "published" ? new Date().toISOString() : null,
      };

      // SNS 타입인 경우 추가 필드
      if (SNS_TYPES.includes(formData.type)) {
        if (socialMetadata) insertData.social_metadata = socialMetadata;
        if (authorInfo) insertData.author_info = authorInfo;
        if (formData.readmeImageUrl) insertData.readme_image_url = formData.readmeImageUrl;
      }

      const { data, error } = await supabase
        .from("content")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error saving content:", error);
        if (error.message.includes("duplicate")) {
          alert(locale === "ko" ? "이미 존재하는 슬러그입니다." : "This slug already exists.");
        } else {
          alert(locale === "ko" ? "저장에 실패했습니다." : "Failed to save.");
        }
        return;
      }

      router.push(`/${locale}/admin/content`);
    } catch (error) {
      console.error("Error saving content:", error);
      alert(locale === "ko" ? "저장에 실패했습니다." : "Failed to save.");
    } finally {
      setIsLoading(false);
    }
  };

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
              {locale === "ko" ? "새 콘텐츠" : "New Content"}
            </h1>
            <p className="text-muted-foreground">
              {locale === "ko"
                ? "새로운 콘텐츠를 작성합니다."
                : "Create a new content item."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleSubmit("draft")}
            disabled={isLoading}
          >
            {locale === "ko" ? "초안 저장" : "Save Draft"}
          </Button>
          <Button
            onClick={() => handleSubmit("published")}
            disabled={isLoading}
            className="gap-2"
          >
            <FaFloppyDisk size={14} />
            {locale === "ko" ? "게시" : "Publish"}
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
                  onChange={handleTitleChange}
                  placeholder={
                    locale === "ko" ? "콘텐츠 제목을 입력하세요" : "Enter content title"
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
                  placeholder="Enter title in English"
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
                  placeholder="content-url-slug"
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
                  placeholder={
                    locale === "ko" ? "콘텐츠 설명을 입력하세요" : "Enter description"
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
                placeholder={
                  locale === "ko" ? "내용을 입력하세요..." : "Start writing..."
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
                placeholder="Start writing in English..."
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
                  placeholder="AI, ChatGPT, Tutorial"
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
                  placeholder="https://..."
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
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* SNS Metadata - 타입에 따라 조건부 렌더링 */}
          {SNS_TYPES.includes(formData.type) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {locale === "ko" ? "SNS 메타데이터" : "SNS Metadata"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 공통: 작성자 정보 */}
                <div className="space-y-2">
                  <Label htmlFor="authorName">
                    {locale === "ko" ? "작성자 이름" : "Author Name"}
                  </Label>
                  <Input
                    id="authorName"
                    value={formData.authorName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, authorName: e.target.value }))
                    }
                    placeholder={locale === "ko" ? "홍길동" : "John Doe"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="authorHandle">
                    {locale === "ko" ? "작성자 핸들" : "Author Handle"}
                  </Label>
                  <Input
                    id="authorHandle"
                    value={formData.authorHandle}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, authorHandle: e.target.value }))
                    }
                    placeholder="@username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="authorAvatar">
                    {locale === "ko" ? "작성자 아바타 URL" : "Author Avatar URL"}
                  </Label>
                  <Input
                    id="authorAvatar"
                    value={formData.authorAvatar}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, authorAvatar: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                </div>

                {/* YouTube (video) 전용 필드 */}
                {formData.type === "video" && (
                  <>
                    <div className="border-t pt-4">
                      <p className="mb-3 text-sm font-medium text-muted-foreground">
                        YouTube
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="videoId">Video ID</Label>
                      <Input
                        id="videoId"
                        value={formData.videoId}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, videoId: e.target.value }))
                        }
                        placeholder="dQw4w9WgXcQ"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="channelName">
                        {locale === "ko" ? "채널 이름" : "Channel Name"}
                      </Label>
                      <Input
                        id="channelName"
                        value={formData.channelName}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, channelName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="viewCount">
                          {locale === "ko" ? "조회수" : "Views"}
                        </Label>
                        <Input
                          id="viewCount"
                          type="number"
                          value={formData.viewCount}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, viewCount: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="likeCount">
                          {locale === "ko" ? "좋아요" : "Likes"}
                        </Label>
                        <Input
                          id="likeCount"
                          type="number"
                          value={formData.likeCount}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, likeCount: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">
                        {locale === "ko" ? "영상 길이" : "Duration"}
                      </Label>
                      <Input
                        id="duration"
                        value={formData.duration}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, duration: e.target.value }))
                        }
                        placeholder="12:34"
                      />
                    </div>
                  </>
                )}

                {/* X/Twitter (x-thread) 전용 필드 */}
                {formData.type === "x-thread" && (
                  <>
                    <div className="border-t pt-4">
                      <p className="mb-3 text-sm font-medium text-muted-foreground">
                        X (Twitter)
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="likeCount">
                          {locale === "ko" ? "좋아요" : "Likes"}
                        </Label>
                        <Input
                          id="likeCount"
                          type="number"
                          value={formData.likeCount}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, likeCount: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="retweetCount">
                          {locale === "ko" ? "리트윗" : "Retweets"}
                        </Label>
                        <Input
                          id="retweetCount"
                          type="number"
                          value={formData.retweetCount}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, retweetCount: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="replyCount">
                          {locale === "ko" ? "답글" : "Replies"}
                        </Label>
                        <Input
                          id="replyCount"
                          type="number"
                          value={formData.replyCount}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, replyCount: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mediaUrls">
                        {locale === "ko" ? "미디어 URL (쉼표 구분)" : "Media URLs (comma separated)"}
                      </Label>
                      <Input
                        id="mediaUrls"
                        value={formData.mediaUrls}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, mediaUrls: e.target.value }))
                        }
                        placeholder="https://..., https://..."
                      />
                    </div>
                  </>
                )}

                {/* LinkedIn 전용 필드 */}
                {formData.type === "linkedin" && (
                  <>
                    <div className="border-t pt-4">
                      <p className="mb-3 text-sm font-medium text-muted-foreground">
                        LinkedIn
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="authorTitle">
                        {locale === "ko" ? "작성자 직함" : "Author Title"}
                      </Label>
                      <Input
                        id="authorTitle"
                        value={formData.authorTitle}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, authorTitle: e.target.value }))
                        }
                        placeholder="CEO at Company"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="likeCount">
                          {locale === "ko" ? "좋아요" : "Likes"}
                        </Label>
                        <Input
                          id="likeCount"
                          type="number"
                          value={formData.likeCount}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, likeCount: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="commentCount">
                          {locale === "ko" ? "댓글" : "Comments"}
                        </Label>
                        <Input
                          id="commentCount"
                          type="number"
                          value={formData.commentCount}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, commentCount: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="repostCount">
                          {locale === "ko" ? "리포스트" : "Reposts"}
                        </Label>
                        <Input
                          id="repostCount"
                          type="number"
                          value={formData.repostCount}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, repostCount: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Threads 전용 필드 */}
                {formData.type === "threads" && (
                  <>
                    <div className="border-t pt-4">
                      <p className="mb-3 text-sm font-medium text-muted-foreground">
                        Threads
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="likeCount">
                          {locale === "ko" ? "좋아요" : "Likes"}
                        </Label>
                        <Input
                          id="likeCount"
                          type="number"
                          value={formData.likeCount}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, likeCount: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="replyCount">
                          {locale === "ko" ? "답글" : "Replies"}
                        </Label>
                        <Input
                          id="replyCount"
                          type="number"
                          value={formData.replyCount}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, replyCount: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="repostCount">
                          {locale === "ko" ? "리포스트" : "Reposts"}
                        </Label>
                        <Input
                          id="repostCount"
                          type="number"
                          value={formData.repostCount}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, repostCount: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mediaUrls">
                        {locale === "ko" ? "미디어 URL (쉼표 구분)" : "Media URLs (comma separated)"}
                      </Label>
                      <Input
                        id="mediaUrls"
                        value={formData.mediaUrls}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, mediaUrls: e.target.value }))
                        }
                        placeholder="https://..., https://..."
                      />
                    </div>
                  </>
                )}

                {/* GitHub (open-source) 전용 필드 */}
                {formData.type === "open-source" && (
                  <>
                    <div className="border-t pt-4">
                      <p className="mb-3 text-sm font-medium text-muted-foreground">
                        GitHub
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="repoOwner">
                          {locale === "ko" ? "레포 소유자" : "Repo Owner"}
                        </Label>
                        <Input
                          id="repoOwner"
                          value={formData.repoOwner}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, repoOwner: e.target.value }))
                          }
                          placeholder="facebook"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="repoName">
                          {locale === "ko" ? "레포 이름" : "Repo Name"}
                        </Label>
                        <Input
                          id="repoName"
                          value={formData.repoName}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, repoName: e.target.value }))
                          }
                          placeholder="react"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="language">
                          {locale === "ko" ? "언어" : "Language"}
                        </Label>
                        <Input
                          id="language"
                          value={formData.language}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, language: e.target.value }))
                          }
                          placeholder="JavaScript"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="languageColor">
                          {locale === "ko" ? "언어 색상" : "Language Color"}
                        </Label>
                        <Input
                          id="languageColor"
                          value={formData.languageColor}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, languageColor: e.target.value }))
                          }
                          placeholder="#f1e05a"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="stars">Stars</Label>
                        <Input
                          id="stars"
                          type="number"
                          value={formData.stars}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, stars: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="forks">Forks</Label>
                        <Input
                          id="forks"
                          type="number"
                          value={formData.forks}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, forks: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="issues">Issues</Label>
                        <Input
                          id="issues"
                          type="number"
                          value={formData.issues}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, issues: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="topics">
                        {locale === "ko" ? "토픽 (쉼표 구분)" : "Topics (comma separated)"}
                      </Label>
                      <Input
                        id="topics"
                        value={formData.topics}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, topics: e.target.value }))
                        }
                        placeholder="react, javascript, ui"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="readmeImageUrl">
                        {locale === "ko" ? "README 이미지 URL" : "README Image URL"}
                      </Label>
                      <Input
                        id="readmeImageUrl"
                        value={formData.readmeImageUrl}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, readmeImageUrl: e.target.value }))
                        }
                        placeholder="https://..."
                      />
                    </div>
                  </>
                )}

                {/* Reddit 전용 필드 */}
                {formData.type === "reddit" && (
                  <>
                    <div className="border-t pt-4">
                      <p className="mb-3 text-sm font-medium text-muted-foreground">
                        Reddit
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subreddit">Subreddit</Label>
                      <Input
                        id="subreddit"
                        value={formData.subreddit}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, subreddit: e.target.value }))
                        }
                        placeholder="MachineLearning"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="upvotes">
                          {locale === "ko" ? "업보트" : "Upvotes"}
                        </Label>
                        <Input
                          id="upvotes"
                          type="number"
                          value={formData.upvotes}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, upvotes: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="downvotes">
                          {locale === "ko" ? "다운보트" : "Downvotes"}
                        </Label>
                        <Input
                          id="downvotes"
                          type="number"
                          value={formData.downvotes}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, downvotes: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="commentCount">
                          {locale === "ko" ? "댓글" : "Comments"}
                        </Label>
                        <Input
                          id="commentCount"
                          type="number"
                          value={formData.commentCount}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, commentCount: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="awards">
                        {locale === "ko" ? "어워드 (쉼표 구분)" : "Awards (comma separated)"}
                      </Label>
                      <Input
                        id="awards"
                        value={formData.awards}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, awards: e.target.value }))
                        }
                        placeholder="gold, silver, helpful"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

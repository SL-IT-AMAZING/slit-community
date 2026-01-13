"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { FaLanguage, FaSpinner, FaChevronDown, FaChevronUp } from "react-icons/fa6";
import { cn } from "@/lib/utils";

/**
 * TranslateButton - 콘텐츠 번역 버튼 컴포넌트
 *
 * @param {string} text - 번역할 원본 텍스트
 * @param {string} translatedText - 이미 저장된 번역 텍스트 (optional)
 * @param {string} contentId - DB 저장용 콘텐츠 ID (optional)
 * @param {string} field - 저장할 필드 ("title" | "content")
 * @param {string} className - 추가 스타일 클래스
 */
export default function TranslateButton({
  text,
  translatedText: initialTranslated,
  contentId,
  field = "content",
  className,
}) {
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [translated, setTranslated] = useState(initialTranslated || null);
  const [error, setError] = useState(null);

  const handleTranslate = async () => {
    if (translated) {
      // 이미 번역된 경우 토글
      setIsExpanded(!isExpanded);
      return;
    }

    if (!text || text.trim().length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          targetLang: "ko",
          contentId,
          field,
        }),
      });

      if (!response.ok) {
        throw new Error("Translation failed");
      }

      const data = await response.json();
      setTranslated(data.translated);
      setIsExpanded(true);
    } catch (err) {
      console.error("Translation error:", err);
      setError(locale === "ko" ? "번역 실패" : "Translation failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Translate Button */}
      <button
        onClick={handleTranslate}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
          "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          translated && "text-primary"
        )}
        title={locale === "ko" ? "한국어로 번역" : "Translate to Korean"}
      >
        {isLoading ? (
          <FaSpinner className="h-3 w-3 animate-spin" />
        ) : (
          <FaLanguage className="h-3 w-3" />
        )}
        <span>
          {isLoading
            ? locale === "ko"
              ? "번역 중..."
              : "Translating..."
            : translated
              ? locale === "ko"
                ? "번역 보기"
                : "View translation"
              : locale === "ko"
                ? "번역"
                : "Translate"}
        </span>
        {translated && (
          isExpanded ? (
            <FaChevronUp className="h-2.5 w-2.5" />
          ) : (
            <FaChevronDown className="h-2.5 w-2.5" />
          )
        )}
      </button>

      {/* Translation Result */}
      {isExpanded && translated && (
        <div className="mt-2 rounded-md bg-muted/50 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <FaLanguage className="h-3 w-3" />
            <span>{locale === "ko" ? "한국어 번역" : "Korean Translation"}</span>
          </div>
          <p className="whitespace-pre-wrap leading-relaxed">{translated}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

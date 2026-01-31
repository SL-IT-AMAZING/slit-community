"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FaStar,
  FaCheck,
  FaXmark,
  FaArrowUpRightFromSquare,
} from "react-icons/fa6";

const PRICING_STYLES = {
  free: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  paid: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  freemium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export default function ToolDetailModal({ isOpen, onClose, tool, locale }) {
  const t = useTranslations("ratings");

  if (!tool) return null;

  const handleVisit = async () => {
    try {
      await fetch("/api/tools/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId: tool.id }),
      });
    } catch (error) {
      console.error("Failed to record click:", error);
    }
    window.open(tool.link, "_blank", "noopener,noreferrer");
  };

  const description =
    locale === "en" && tool.descriptionEn
      ? tool.descriptionEn
      : tool.description;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            {tool.thumbnailUrl && (
              <img
                src={tool.thumbnailUrl}
                alt={tool.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
            )}
            {tool.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {tool.thumbnailUrl && (
            <div className="overflow-hidden rounded-lg">
              <img
                src={tool.thumbnailUrl}
                alt={tool.name}
                className="h-48 w-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <FaStar
                  key={i}
                  size={16}
                  className={
                    i < (tool.adminRating || 0)
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }
                />
              ))}
              <span className="ml-1 text-sm font-medium">
                {tool.adminRating || 0}/5
              </span>
            </div>

            {tool.pricing && (
              <Badge className={PRICING_STYLES[tool.pricing] || ""}>
                {t(`pricing.${tool.pricing}`)}
              </Badge>
            )}

            {tool.isFeatured && <Badge variant="default">Featured</Badge>}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(tool.tags || []).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {t(`tags.${tag}`) || tag}
              </Badge>
            ))}
          </div>

          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}

          {tool.pros && tool.pros.length > 0 && (
            <div>
              <h4 className="mb-2 font-semibold text-green-600 dark:text-green-400">
                {t("detail.pros")}
              </h4>
              <ul className="space-y-1">
                {tool.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <FaCheck
                      className="mt-0.5 shrink-0 text-green-500"
                      size={12}
                    />
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tool.cons && tool.cons.length > 0 && (
            <div>
              <h4 className="mb-2 font-semibold text-red-600 dark:text-red-400">
                {t("detail.cons")}
              </h4>
              <ul className="space-y-1">
                {tool.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <FaXmark
                      className="mt-0.5 shrink-0 text-red-500"
                      size={12}
                    />
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={handleVisit} className="w-full gap-2">
            {t("detail.visit")}
            <FaArrowUpRightFromSquare size={12} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

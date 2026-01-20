"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FaNewspaper, FaCalendar, FaChevronRight } from "react-icons/fa6";

export default function NewsletterArchive() {
  const locale = useLocale();
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const text = {
    ko: {
      title: "지난 뉴스레터",
      empty: "아직 발송된 뉴스레터가 없습니다",
      readMore: "자세히 보기",
    },
    en: {
      title: "Past Newsletters",
      empty: "No newsletters sent yet",
      readMore: "Read more",
    },
  };

  const t = text[locale] || text.en;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/newsletter/history?limit=6");
        const data = await res.json();
        setNewsletters(data.newsletters || []);
      } catch {
        setNewsletters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-center font-cera text-2xl font-bold">{t.title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="mb-2 h-5 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (newsletters.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-6">
        <h2 className="text-center font-cera text-2xl font-bold sm:text-3xl">
          {t.title}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {newsletters.map((newsletter) => (
            <Card
              key={newsletter.id}
              className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
              onClick={() => setSelected(newsletter)}
            >
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    #{newsletter.issue_number}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FaCalendar size={10} />
                    {formatDate(newsletter.sent_at)}
                  </span>
                </div>

                <h3 className="mb-2 line-clamp-2 font-medium leading-tight">
                  {newsletter.content?.greeting || newsletter.subject}
                </h3>

                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                  {newsletter.content?.intro}
                </p>

                <div className="flex items-center gap-1 text-sm font-medium text-primary">
                  {t.readMore}
                  <FaChevronRight size={12} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge>#{selected.issue_number}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(selected.sent_at)}
                  </span>
                </div>
                <DialogTitle className="text-xl">
                  {selected.content?.greeting}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <p className="text-muted-foreground">
                  {selected.content?.intro}
                </p>

                {selected.content?.sections?.map((section, idx) => (
                  <div key={idx} className="space-y-3">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <span>{section.emoji}</span>
                      {section.title}
                    </h3>

                    <div className="space-y-3">
                      {section.items?.map((item, itemIdx) => (
                        <a
                          key={itemIdx}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-medium">{item.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.platform}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.summary}
                          </p>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

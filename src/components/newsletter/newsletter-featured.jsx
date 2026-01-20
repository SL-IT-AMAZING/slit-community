"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FaEnvelope,
  FaArrowRight,
  FaCalendar,
  FaChevronRight,
} from "react-icons/fa6";

export default function NewsletterFeatured() {
  const locale = useLocale();
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const text = {
    ko: {
      title: "뉴스레터",
      subtitle: "매주 금요일, AI 트렌드를 정리해 드립니다",
      viewAll: "전체 보기",
      readMore: "자세히",
      subscribe: "구독하기",
    },
    en: {
      title: "Newsletter",
      subtitle: "AI trends delivered every Friday",
      viewAll: "View All",
      readMore: "Read",
      subscribe: "Subscribe",
    },
  };

  const t = text[locale] || text.en;

  useEffect(() => {
    const fetchNewsletters = async () => {
      try {
        const res = await fetch("/api/newsletter/history?limit=3");
        const data = await res.json();
        setNewsletters(data.newsletters || []);
      } catch {
        setNewsletters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNewsletters();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <section className="mb-8 sm:mb-12 md:mb-16">
        <div className="mb-4 flex items-center justify-between sm:mb-6">
          <div>
            <h2 className="font-cera text-xl font-bold sm:text-2xl">
              {t.title}
            </h2>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
        <div className="scrollbar-hide relative -mx-4 overflow-x-auto overscroll-x-contain sm:mx-0">
          <div className="flex w-max gap-3 px-4 pb-4 sm:gap-4 sm:px-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-[280px] flex-shrink-0 sm:w-80 md:w-96">
                <Card className="h-full animate-pulse">
                  <CardContent className="p-4">
                    <div className="mb-3 h-5 w-20 rounded bg-muted" />
                    <div className="mb-2 h-6 w-3/4 rounded bg-muted" />
                    <div className="h-4 w-full rounded bg-muted" />
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (newsletters.length === 0) {
    return null;
  }

  return (
    <>
      <section className="mb-8 sm:mb-12 md:mb-16">
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-cera text-xl font-bold sm:text-2xl">
              {t.title}
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              {t.subtitle}
            </p>
          </div>
          <Link href="/newsletter">
            <Button
              variant="link"
              className="justify-start p-0 sm:justify-center sm:p-2"
            >
              {t.viewAll}
              <FaArrowRight className="ml-2" size={12} />
            </Button>
          </Link>
        </div>

        <div className="scrollbar-hide relative -mx-4 overflow-x-auto overscroll-x-contain sm:mx-0">
          <div className="flex w-max gap-3 px-4 pb-4 sm:gap-4 sm:px-0">
            {newsletters.map((newsletter) => (
              <div
                key={newsletter.id}
                className="w-[280px] flex-shrink-0 sm:w-80 md:w-96"
              >
                <Card
                  className="h-full cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                  onClick={() => setSelected(newsletter)}
                >
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <FaEnvelope size={10} />#{newsletter.issue_number}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FaCalendar size={10} />
                        {formatDate(newsletter.sent_at)}
                      </span>
                    </div>

                    <h3 className="mb-2 line-clamp-1 font-semibold">
                      {newsletter.content?.greeting}
                    </h3>

                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {newsletter.content?.intro}
                    </p>

                    <span className="flex items-center gap-1 text-sm font-medium text-primary">
                      {t.readMore}
                      <FaChevronRight size={10} />
                    </span>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

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

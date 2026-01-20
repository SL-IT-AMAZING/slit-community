import { setRequestLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import NewsletterForm from "@/components/newsletter/newsletter-form";
import PremiumEarlyAccess from "@/components/newsletter/premium-early-access";
import NewsletterArchive from "@/components/newsletter/newsletter-archive";

import {
  FaClock,
  FaCalendar,
  FaCheck,
  FaNewspaper,
  FaBolt,
  FaLightbulb,
  FaCode,
} from "react-icons/fa6";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "newsletter" });

  return {
    title: t("pageTitle"),
    description: t("heroSubtitle"),
  };
}

export default async function NewsletterPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("newsletter");

  const features = [
    {
      icon: FaNewspaper,
      title: t("features.curated.title"),
      description: t("features.curated.description"),
    },
    {
      icon: FaBolt,
      title: t("features.digest.title"),
      description: t("features.digest.description"),
    },
    {
      icon: FaLightbulb,
      title: t("features.insights.title"),
      description: t("features.insights.description"),
    },
    {
      icon: FaCode,
      title: t("features.opensource.title"),
      description: t("features.opensource.description"),
    },
  ];

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <div className="container py-16 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                <FaClock size={12} />
                {t("valueProps.time")}
              </Badge>
              <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                <FaCalendar size={12} />
                {t("valueProps.frequency")}
              </Badge>
              <Badge
                variant="secondary"
                className="inline-flex gap-1.5 px-3 py-1"
              >
                <FaCheck size={12} />
                {t("valueProps.free")}
              </Badge>
            </div>

            <h1 className="mb-4 font-cera text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              {t("heroTitle")}
            </h1>

            <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground sm:text-xl">
              {t("heroSubtitle")}
            </p>

            <PremiumEarlyAccess />

            <div className="mx-auto max-w-md">
              <NewsletterForm />
              <p className="mt-3 text-sm text-muted-foreground">
                {t("form.privacyNote")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16 lg:py-24">
        <h2 className="mb-12 text-center font-cera text-2xl font-bold sm:text-3xl">
          {t("features.title")}
        </h2>

        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="border-2 transition-colors hover:border-primary/50"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="container py-16 lg:py-24">
        <NewsletterArchive />
      </section>

      <section className="border-t bg-muted/30">
        <div className="container py-16 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 font-cera text-2xl font-bold sm:text-3xl">
              {t("heroTitle")}
            </h2>
            <p className="mb-8 text-muted-foreground">{t("heroSubtitle")}</p>
            <PremiumEarlyAccess />
            <div className="mx-auto max-w-md">
              <NewsletterForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

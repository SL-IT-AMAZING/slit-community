import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Toaster } from "@/components/ui/toaster";
import NavigationBar from "@/components/sections/navigation";
import Footer from "@/components/sections/footer";
import SessionProvider from "@/components/providers/session-provider";
import { routing } from "@/i18n/routing";

import "../globals.css";
import { inter, roboto, ceraRoundPro } from "@/utils/fonts";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export async function generateMetadata({ params }) {
  const { locale } = await params;

  const titles = {
    ko: "AI Community - AI 입문자를 위한 큐레이션 플랫폼",
    en: "AI Community - Curated Platform for AI Beginners",
  };

  const descriptions = {
    ko: "AI에 관심있는 입문자들이 최신 AI 뉴스, 트렌드, 튜토리얼, 오픈소스 프로젝트를 한 곳에서 쉽게 접할 수 있는 큐레이션 커뮤니티 플랫폼",
    en: "A curated community platform where AI beginners can easily access the latest AI news, trends, tutorials, and open-source projects in one place",
  };

  const baseUrl = process.env.NEXTAUTH_URL || "https://ai-community.vercel.app";

  return {
    title: {
      default: titles[locale] || titles.ko,
      template: "%s | AI Community",
    },
    description: descriptions[locale] || descriptions.ko,
    keywords: [
      "AI",
      "Artificial Intelligence",
      "ChatGPT",
      "LLM",
      "Machine Learning",
      "AI News",
      "AI Tutorials",
      "Open Source",
      "인공지능",
      "머신러닝",
    ],
    authors: [{ name: "AI Community" }],
    creator: "AI Community",
    publisher: "AI Community",
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ko: "/ko",
        en: "/en",
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "ko" ? "ko_KR" : "en_US",
      url: baseUrl,
      siteName: "AI Community",
      title: titles[locale] || titles.ko,
      description: descriptions[locale] || descriptions.ko,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "AI Community",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titles[locale] || titles.ko,
      description: descriptions[locale] || descriptions.ko,
      images: ["/og-image.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      google: "your-google-verification-code",
    },
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  if (!routing.locales.includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body className={`${inter} ${roboto} ${ceraRoundPro}`}>
        <SessionProvider>
          <NextIntlClientProvider messages={messages}>
            <div className="grid min-h-[100dvh] grid-rows-[auto_1fr_auto]">
              <NavigationBar />
              <main>{children}</main>
              <Toaster />
              <Footer />
            </div>
          </NextIntlClientProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}

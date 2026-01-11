"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import confetti from "canvas-confetti";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { FaCrown, FaCheck, FaArrowRight } from "react-icons/fa6";

export default function PremiumSuccessPage() {
  const { data: session, update } = useSession();
  const locale = useLocale();

  useEffect(() => {
    // Trigger confetti animation
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#FFD700", "#FFA500", "#FF8C00"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#FFD700", "#FFA500", "#FF8C00"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    // Update session to reflect new premium status
    update();
  }, [update]);

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-8">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center py-12 text-center">
          {/* Success Icon */}
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500">
            <FaCrown size={40} className="text-white" />
          </div>

          {/* Title */}
          <h1 className="mb-2 font-cera text-3xl font-bold">
            {locale === "ko"
              ? "프리미엄 가입 완료!"
              : "Welcome to Premium!"}
          </h1>

          <p className="mb-8 text-muted-foreground">
            {locale === "ko"
              ? "이제 모든 프리미엄 콘텐츠를 이용하실 수 있습니다."
              : "You now have access to all premium content."}
          </p>

          {/* Benefits List */}
          <div className="mb-8 w-full rounded-lg border bg-muted/50 p-4 text-left">
            <h3 className="mb-3 font-semibold">
              {locale === "ko" ? "프리미엄 혜택" : "Premium Benefits"}
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <FaCheck className="text-green-500" size={12} />
                {locale === "ko"
                  ? "모든 프리미엄 콘텐츠 무제한 액세스"
                  : "Unlimited access to all premium content"}
              </li>
              <li className="flex items-center gap-2 text-sm">
                <FaCheck className="text-green-500" size={12} />
                {locale === "ko"
                  ? "광고 없는 깔끔한 환경"
                  : "Ad-free experience"}
              </li>
              <li className="flex items-center gap-2 text-sm">
                <FaCheck className="text-green-500" size={12} />
                {locale === "ko"
                  ? "신규 콘텐츠 조기 액세스"
                  : "Early access to new content"}
              </li>
              <li className="flex items-center gap-2 text-sm">
                <FaCheck className="text-green-500" size={12} />
                {locale === "ko"
                  ? "독점 리서치 리포트"
                  : "Exclusive research reports"}
              </li>
              <li className="flex items-center gap-2 text-sm">
                <FaCheck className="text-green-500" size={12} />
                {locale === "ko"
                  ? "우선 고객 지원"
                  : "Priority customer support"}
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/content">
              <Button size="lg" className="gap-2">
                {locale === "ko" ? "콘텐츠 둘러보기" : "Browse Content"}
                <FaArrowRight size={14} />
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" size="lg">
                {locale === "ko" ? "내 프로필" : "My Profile"}
              </Button>
            </Link>
          </div>

          {/* Receipt info */}
          <p className="mt-6 text-xs text-muted-foreground">
            {locale === "ko"
              ? "영수증이 이메일로 발송되었습니다."
              : "A receipt has been sent to your email."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

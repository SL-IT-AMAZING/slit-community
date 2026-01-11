"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  FaCheck,
  FaCrown,
  FaCreditCard,
  FaBitcoin,
  FaArrowRight,
  FaMugHot,
} from "react-icons/fa6";

const PLANS = {
  monthly: {
    id: "monthly",
    priceKRW: 9900,
    priceUSD: 7.99,
    stripePriceId: "price_monthly_xxx", // Replace with actual Stripe price ID
    tossPriceId: "monthly_9900",
  },
  yearly: {
    id: "yearly",
    priceKRW: 79000,
    priceUSD: 59.99,
    stripePriceId: "price_yearly_xxx", // Replace with actual Stripe price ID
    tossPriceId: "yearly_79000",
    discount: 33,
  },
};

const PAYMENT_METHODS = [
  {
    id: "kofi",
    name: "Ko-fi (Recommended)",
    nameKo: "Ko-fi (추천)",
    icon: FaMugHot,
    description: "PayPal, Credit/Debit Cards",
    descriptionKo: "PayPal, 카드 결제",
    recommended: true,
  },
  {
    id: "stripe",
    name: "International Cards",
    nameKo: "해외 카드 결제",
    icon: FaCreditCard,
    description: "Visa, Mastercard, Amex",
    descriptionKo: "Visa, Mastercard, Amex 등",
    disabled: true,
    disabledReason: "Coming soon",
    disabledReasonKo: "준비 중",
  },
  {
    id: "toss",
    name: "Korean Payment",
    nameKo: "국내 결제",
    icon: FaCreditCard,
    description: "Credit/Debit Cards, Bank Transfer",
    descriptionKo: "카드, 계좌이체, 간편결제",
    disabled: true,
    disabledReason: "Coming soon",
    disabledReasonKo: "준비 중",
  },
  {
    id: "coinbase",
    name: "Cryptocurrency",
    nameKo: "암호화폐",
    icon: FaBitcoin,
    description: "BTC, ETH, USDC, and more",
    descriptionKo: "비트코인, 이더리움, USDC 등",
    disabled: true,
    disabledReason: "Coming soon",
    disabledReasonKo: "준비 중",
  },
];

export default function PremiumPage() {
  const { data: session, status } = useSession();
  const t = useTranslations();
  const locale = useLocale();

  const [selectedPlan, setSelectedPlan] = useState("yearly");
  const [selectedPayment, setSelectedPayment] = useState("kofi");
  const [isLoading, setIsLoading] = useState(false);

  const isPremiumUser = session?.user?.isPremium;

  const features = [
    t("premium.features.allContent"),
    t("premium.features.noAds"),
    t("premium.features.earlyAccess"),
    t("premium.features.exclusiveReports"),
    t("premium.features.prioritySupport"),
  ];

  const handleCheckout = async () => {
    if (!session) {
      // Redirect to login with return URL
      window.location.href = `/${locale}/login?callbackUrl=/${locale}/premium`;
      return;
    }

    if (!selectedPayment) {
      return;
    }

    // Check if payment method is disabled
    const paymentMethod = PAYMENT_METHODS.find((m) => m.id === selectedPayment);
    if (paymentMethod?.disabled) {
      return;
    }

    setIsLoading(true);

    try {
      const plan = PLANS[selectedPlan];

      switch (selectedPayment) {
        case "kofi":
          // Redirect to Ko-fi membership page
          const kofiUrl = process.env.NEXT_PUBLIC_KOFI_PAGE_URL;
          if (kofiUrl) {
            // Add membership path to Ko-fi URL
            window.open(`${kofiUrl}/membership`, "_blank");
          } else {
            console.error("Ko-fi URL not configured");
          }
          break;

        case "stripe":
          // TODO: Call Stripe checkout API
          const stripeResponse = await fetch("/api/checkout/stripe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              priceId: plan.stripePriceId,
              userId: session.user.id,
              locale,
            }),
          });
          const stripeData = await stripeResponse.json();
          if (stripeData.url) {
            window.location.href = stripeData.url;
          }
          break;

        case "toss":
          // TODO: Call Toss Payments API
          const tossResponse = await fetch("/api/checkout/toss", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              planId: plan.tossPriceId,
              amount: plan.priceKRW,
              userId: session.user.id,
            }),
          });
          const tossData = await tossResponse.json();
          if (tossData.paymentKey) {
            // Redirect to Toss payment page
          }
          break;

        case "coinbase":
          // TODO: Call Coinbase Commerce API
          const coinbaseResponse = await fetch("/api/checkout/coinbase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              planId: selectedPlan,
              amount: plan.priceUSD,
              userId: session.user.id,
            }),
          });
          const coinbaseData = await coinbaseResponse.json();
          if (coinbaseData.hosted_url) {
            window.location.href = coinbaseData.hosted_url;
          }
          break;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // If user is already premium
  if (isPremiumUser) {
    return (
      <div className="container py-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10">
              <FaCrown size={40} className="text-yellow-500" />
            </div>
          </div>
          <h1 className="mb-4 font-cera text-3xl font-bold">
            {locale === "ko" ? "프리미엄 회원입니다!" : "You're a Premium Member!"}
          </h1>
          <p className="mb-8 text-muted-foreground">
            {locale === "ko"
              ? "모든 프리미엄 콘텐츠를 이용할 수 있습니다."
              : "You have access to all premium content."}
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/content">
              <Button>
                {locale === "ko" ? "콘텐츠 둘러보기" : "Browse Content"}
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline">
                {locale === "ko" ? "구독 관리" : "Manage Subscription"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <Badge className="mb-4 gap-1 bg-yellow-500 text-black">
          <FaCrown size={12} />
          Premium
        </Badge>
        <h1 className="mb-2 font-cera text-3xl font-bold md:text-4xl">
          {t("premium.title")}
        </h1>
        <p className="text-lg text-muted-foreground">{t("premium.subtitle")}</p>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Pricing Plans */}
          <div className="space-y-4">
            <h2 className="mb-4 font-semibold">
              {locale === "ko" ? "요금제 선택" : "Choose Your Plan"}
            </h2>

            {/* Monthly Plan */}
            <Card
              className={`cursor-pointer transition-all ${
                selectedPlan === "monthly"
                  ? "border-primary ring-2 ring-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setSelectedPlan("monthly")}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-semibold">
                    {t("premium.plans.monthly.name")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {locale === "ko" ? "매월 자동 결제" : "Billed monthly"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {locale === "ko"
                      ? `₩${PLANS.monthly.priceKRW.toLocaleString()}`
                      : `$${PLANS.monthly.priceUSD}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("premium.plans.monthly.period")}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Yearly Plan */}
            <Card
              className={`relative cursor-pointer transition-all ${
                selectedPlan === "yearly"
                  ? "border-primary ring-2 ring-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setSelectedPlan("yearly")}
            >
              <div className="absolute -top-3 right-4">
                <Badge className="bg-green-500 text-white">
                  {t("premium.plans.yearly.discount")}
                </Badge>
              </div>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-semibold">
                    {t("premium.plans.yearly.name")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {locale === "ko" ? "연간 결제 (33% 할인)" : "Billed annually (33% off)"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {locale === "ko"
                      ? `₩${PLANS.yearly.priceKRW.toLocaleString()}`
                      : `$${PLANS.yearly.priceUSD}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("premium.plans.yearly.period")}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features List */}
            <div className="mt-6 rounded-lg border bg-card p-4">
              <h3 className="mb-3 font-semibold">
                {locale === "ko" ? "포함된 혜택" : "What's included"}
              </h3>
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <FaCheck className="text-green-500" size={12} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: Payment Method */}
          <div className="space-y-4">
            <h2 className="mb-4 font-semibold">
              {locale === "ko" ? "결제 방법 선택" : "Choose Payment Method"}
            </h2>

            {PAYMENT_METHODS.map((method) => (
              <Card
                key={method.id}
                className={`relative transition-all ${
                  method.disabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                } ${
                  selectedPayment === method.id && !method.disabled
                    ? "border-primary ring-2 ring-primary"
                    : !method.disabled
                    ? "hover:border-primary/50"
                    : ""
                }`}
                onClick={() => !method.disabled && setSelectedPayment(method.id)}
              >
                {method.recommended && (
                  <div className="absolute -top-2 right-3">
                    <Badge className="bg-green-500 text-white text-xs">
                      {locale === "ko" ? "추천" : "Recommended"}
                    </Badge>
                  </div>
                )}
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    method.recommended ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <method.icon size={20} className={method.recommended ? "text-primary" : ""} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {locale === "ko" ? method.nameKo : method.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {method.disabled
                        ? locale === "ko"
                          ? method.disabledReasonKo
                          : method.disabledReason
                        : locale === "ko"
                        ? method.descriptionKo
                        : method.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Checkout Button */}
            <div className="mt-6">
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleCheckout}
                disabled={!selectedPayment || isLoading || PAYMENT_METHODS.find((m) => m.id === selectedPayment)?.disabled}
              >
                {isLoading ? (
                  locale === "ko" ? "처리중..." : "Processing..."
                ) : (
                  <>
                    {session
                      ? selectedPayment === "kofi"
                        ? locale === "ko"
                          ? "Ko-fi에서 구독하기"
                          : "Subscribe on Ko-fi"
                        : locale === "ko"
                        ? "결제 진행하기"
                        : "Proceed to Checkout"
                      : locale === "ko"
                      ? "로그인하고 구독하기"
                      : "Log in to Subscribe"}
                    <FaArrowRight size={14} />
                  </>
                )}
              </Button>

              {selectedPayment === "kofi" && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {locale === "ko"
                    ? "Ko-fi에서 동일한 이메일로 가입해주세요. 결제 완료 후 자동으로 프리미엄이 활성화됩니다."
                    : "Please sign up with the same email on Ko-fi. Premium will be activated automatically after payment."}
                </p>
              )}

              <p className="mt-3 text-center text-xs text-muted-foreground">
                {locale === "ko"
                  ? "언제든지 취소할 수 있습니다. 결제 후 7일 이내 환불 가능합니다."
                  : "Cancel anytime. Refund available within 7 days of payment."}
              </p>
            </div>
          </div>
        </div>

        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <h2 className="mb-4 font-cera text-2xl font-bold">
            {locale === "ko" ? "자주 묻는 질문" : "Frequently Asked Questions"}
          </h2>
          <div className="mx-auto max-w-2xl space-y-4 text-left">
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-2 font-semibold">
                  {locale === "ko"
                    ? "구독은 언제든 취소할 수 있나요?"
                    : "Can I cancel my subscription anytime?"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {locale === "ko"
                    ? "네, 언제든지 취소할 수 있습니다. 취소 후에도 결제 기간이 끝날 때까지 프리미엄 혜택을 이용할 수 있습니다."
                    : "Yes, you can cancel anytime. After cancellation, you'll retain premium access until the end of your billing period."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-2 font-semibold">
                  {locale === "ko"
                    ? "환불 정책은 어떻게 되나요?"
                    : "What's the refund policy?"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {locale === "ko"
                    ? "결제 후 7일 이내에 환불을 요청하시면 전액 환불해 드립니다."
                    : "We offer full refunds within 7 days of payment."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

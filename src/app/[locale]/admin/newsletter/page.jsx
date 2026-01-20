"use client";

import { useState } from "react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import {
  FaWandMagicSparkles,
  FaPaperPlane,
  FaSpinner,
  FaCheck,
  FaUsers,
  FaNewspaper,
  FaEnvelope,
} from "react-icons/fa6";

export default function NewsletterAdminPage() {
  const locale = useLocale();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [newsletter, setNewsletter] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [issueNumber, setIssueNumber] = useState(1);
  const [testEmail, setTestEmail] = useState("");
  const [sendResult, setSendResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setSendResult(null);

    try {
      const response = await fetch("/api/newsletter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7, limit: 20 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate newsletter");
      }

      setNewsletter(data.newsletter);
      setMetadata(data.metadata);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !newsletter) return;

    setIsSending(true);
    setError(null);
    setSendResult(null);

    try {
      const response = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newsletter,
          issueNumber,
          testEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send test email");
      }

      setSendResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAll = async () => {
    if (!newsletter) return;

    const confirmed = window.confirm(
      locale === "ko"
        ? `정말 ${metadata?.subscriberCount || 0}명의 구독자에게 뉴스레터를 발송하시겠습니까?`
        : `Are you sure you want to send the newsletter to ${metadata?.subscriberCount || 0} subscribers?`,
    );

    if (!confirmed) return;

    setIsSending(true);
    setError(null);
    setSendResult(null);

    try {
      const response = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newsletter,
          issueNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send newsletter");
      }

      setSendResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {locale === "ko" ? "뉴스레터 관리" : "Newsletter Management"}
        </h1>
        <p className="text-muted-foreground">
          {locale === "ko"
            ? "뉴스레터를 생성하고 구독자에게 발송합니다"
            : "Generate and send newsletters to subscribers"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaWandMagicSparkles />
              {locale === "ko" ? "뉴스레터 생성" : "Generate Newsletter"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {locale === "ko"
                ? "최근 7일간의 콘텐츠를 AI가 분석하여 뉴스레터를 생성합니다."
                : "AI analyzes content from the last 7 days to generate a newsletter."}
            </p>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full gap-2"
            >
              {isGenerating ? (
                <>
                  <FaSpinner className="animate-spin" />
                  {locale === "ko" ? "생성 중..." : "Generating..."}
                </>
              ) : (
                <>
                  <FaWandMagicSparkles />
                  {locale === "ko" ? "뉴스레터 생성" : "Generate Newsletter"}
                </>
              )}
            </Button>

            {metadata && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="secondary" className="gap-1">
                  <FaNewspaper size={12} />
                  {metadata.contentCount}{" "}
                  {locale === "ko" ? "콘텐츠" : "contents"}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <FaUsers size={12} />
                  {metadata.subscriberCount}{" "}
                  {locale === "ko" ? "구독자" : "subscribers"}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaPaperPlane />
              {locale === "ko" ? "발송 설정" : "Send Settings"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="issueNumber">
                {locale === "ko" ? "호수" : "Issue Number"}
              </Label>
              <Input
                id="issueNumber"
                type="number"
                min="1"
                value={issueNumber}
                onChange={(e) => setIssueNumber(Number(e.target.value))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="testEmail">
                {locale === "ko" ? "테스트 이메일" : "Test Email"}
              </Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSendTest}
                disabled={!newsletter || !testEmail || isSending}
                className="flex-1 gap-2"
              >
                {isSending ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaEnvelope />
                )}
                {locale === "ko" ? "테스트 발송" : "Send Test"}
              </Button>

              <Button
                onClick={handleSendAll}
                disabled={!newsletter || isSending}
                className="flex-1 gap-2"
              >
                {isSending ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaPaperPlane />
                )}
                {locale === "ko" ? "전체 발송" : "Send All"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {sendResult && (
        <Card className="border-green-500">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-green-600">
              <FaCheck />
              <span>
                {sendResult.isTest
                  ? locale === "ko"
                    ? "테스트 이메일이 발송되었습니다!"
                    : "Test email sent successfully!"
                  : locale === "ko"
                    ? `${sendResult.results.sent}명에게 발송 완료!`
                    : `Sent to ${sendResult.results.sent} subscribers!`}
              </span>
            </div>
            {sendResult.results.failed > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                {locale === "ko"
                  ? `${sendResult.results.failed}건 실패`
                  : `${sendResult.results.failed} failed`}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {newsletter && (
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "ko"
                ? "생성된 뉴스레터 미리보기"
                : "Newsletter Preview"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>{locale === "ko" ? "인사말" : "Greeting"}</Label>
              <Textarea
                value={newsletter.greeting}
                onChange={(e) =>
                  setNewsletter({ ...newsletter, greeting: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label>{locale === "ko" ? "소개" : "Intro"}</Label>
              <Textarea
                value={newsletter.intro}
                onChange={(e) =>
                  setNewsletter({ ...newsletter, intro: e.target.value })
                }
                className="mt-1"
                rows={3}
              />
            </div>

            {newsletter.sections?.map((section, sectionIndex) => (
              <div key={sectionIndex} className="rounded-lg border p-4">
                <h3 className="mb-4 font-semibold">
                  {section.emoji} {section.title}
                </h3>
                <div className="space-y-4">
                  {section.items?.map((item, itemIndex) => (
                    <div key={itemIndex} className="rounded-md bg-muted/50 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-medium">{item.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.platform}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

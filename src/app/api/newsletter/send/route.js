import { NextResponse } from "next/server";
import { getResend, NEWSLETTER_FROM } from "@/lib/resend/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function generateNewsletterHtml({
  previewText,
  issueNumber,
  date,
  greeting,
  intro,
  sections,
  unsubscribeUrl,
}) {
  const getDomain = (url) => {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  };

  const sectionsHtml = sections
    .map((section, index) => {
      const itemsHtml = section.items
        .map((item) => {
          const domain = getDomain(item.url);
          const domainHtml = domain
            ? `<p style="margin:0 0 8px 0;font-size:12px;line-height:16px;">
                <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=16" alt="" style="width:16px;height:16px;margin-right:6px;border-radius:2px;vertical-align:middle;display:inline;">
                <a href="${item.url}" style="color:#6b7280;font-size:12px;vertical-align:middle;text-decoration:none;">${item.url}</a>
              </p>`
            : "";
          return `
            <div style="margin-bottom:20px;background-color:#ffffff;border-radius:12px;border:1px solid #e6ebf1;overflow:hidden;">
              <div style="padding:16px;">
                ${domainHtml}
                <a href="${item.url}" style="color:#1a1a1a;font-size:16px;font-weight:600;text-decoration:none;display:block;margin-bottom:8px;line-height:1.4;">${item.title}</a>
                <p style="color:#4a4a4a;font-size:14px;line-height:1.5;margin:0 0 8px;">${item.summary}</p>
              </div>
            </div>`;
        })
        .join("");

      const divider =
        index < sections.length - 1
          ? '<hr style="border-color:#e6ebf1;margin:32px 0;">'
          : "";

      return `
        <div style="margin-bottom:24px;">
          <h2 style="color:#1a1a1a;font-size:18px;font-weight:600;margin:0 0 16px;">${section.emoji} ${section.title}</h2>
          ${itemsHtml}
          ${divider}
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
</head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;margin:0;padding:0;">
  <div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>
  <div style="background-color:#ffffff;margin:0 auto;padding:20px 0 48px;margin-bottom:64px;max-width:600px;">
    <div style="padding:32px 48px;text-align:center;border-bottom:1px solid #e6ebf1;">
      <h1 style="color:#1a1a1a;font-size:24px;font-weight:bold;margin:0 0 8px;">AI Community</h1>
      <p style="color:#666666;font-size:14px;margin:0;">#${issueNumber} · ${date}</p>
    </div>
    <div style="padding:32px 48px;">
      <p style="color:#1a1a1a;font-size:18px;font-weight:600;margin:0 0 16px;">${greeting}</p>
      <p style="color:#4a4a4a;font-size:16px;line-height:1.6;margin:0 0 32px;">${intro}</p>
      ${sectionsHtml}
    </div>
    <hr style="border-color:#e6ebf1;margin:32px 0;">
    <div style="padding:0 48px;text-align:center;">
      <p style="color:#8898aa;font-size:12px;line-height:1.5;margin:0 0 8px;">AI Community 뉴스레터를 구독해 주셔서 감사합니다.</p>
      <p style="color:#8898aa;font-size:12px;line-height:1.5;margin:0 0 8px;">
        <a href="${unsubscribeUrl}" style="color:#8898aa;text-decoration:underline;">구독 취소</a>
        · 
        <a href="https://west-monroe.vercel.app" style="color:#8898aa;text-decoration:underline;">웹사이트 방문</a>
      </p>
      <p style="color:#8898aa;font-size:12px;margin:16px 0 0;">© 2025 AI Community. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured" },
        { status: 503 },
      );
    }

    const { newsletter, issueNumber, testEmail } = await request.json();

    if (!newsletter || !newsletter.sections) {
      return NextResponse.json(
        { error: "Newsletter content is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    let recipients = [];

    if (testEmail) {
      recipients = [testEmail];
    } else {
      const { data: subscribers, error } = await supabase
        .from("newsletter_subscribers")
        .select("email")
        .eq("is_active", true);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      recipients = subscribers.map((s) => s.email);
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No subscribers found" },
        { status: 404 },
      );
    }

    const emailHtml = generateNewsletterHtml({
      previewText: `AI Community 뉴스레터 #${issueNumber || 1}`,
      issueNumber: issueNumber || 1,
      date: new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      greeting: newsletter.greeting,
      intro: newsletter.intro,
      sections: newsletter.sections,
      unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://west-monroe.vercel.app"}/unsubscribe`,
    });

    const results = {
      sent: 0,
      failed: 0,
      errors: [],
    };

    const BATCH_SIZE = 50;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      const resend = getResend();
      const promises = batch.map(async (email) => {
        try {
          await resend.emails.send({
            from: NEWSLETTER_FROM,
            to: email,
            subject: `[AI Community] ${newsletter.greeting || "이번 주 AI 트렌드"} #${issueNumber || 1}`,
            html: emailHtml,
          });
          results.sent++;
        } catch (error) {
          results.failed++;
          results.errors.push({ email, error: error.message });
        }
      });

      await Promise.all(promises);

      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      results,
      totalRecipients: recipients.length,
      isTest: !!testEmail,
    });
  } catch (error) {
    console.error("Newsletter send error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send newsletter" },
      { status: 500 },
    );
  }
}

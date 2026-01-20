import { NextResponse } from "next/server";
import { render } from "@react-email/components";
import { getResend, NEWSLETTER_FROM } from "@/lib/resend/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import NewsletterEmail from "@/emails/newsletter-template";

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

    const emailHtml = await render(
      NewsletterEmail({
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
      }),
    );

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

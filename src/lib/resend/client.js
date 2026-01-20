import { Resend } from "resend";

// Lazy initialization to avoid build-time errors when API key is not set
let resendInstance = null;

export const getResend = () => {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not set. Please add it to your environment variables.",
      );
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
};

export const NEWSLETTER_FROM = "AI Community <onboarding@resend.dev>";

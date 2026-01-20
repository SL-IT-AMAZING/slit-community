"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FaCheck, FaSpinner } from "react-icons/fa6";

export default function NewsletterForm({ className = "" }) {
  const t = useTranslations("newsletter.form");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !isValidEmail(email)) {
      setStatus("error");
      setMessage(t("error"));
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(t("success"));
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || t("error"));
      }
    } catch {
      setStatus("error");
      setMessage(t("error"));
    }
  };

  if (status === "success") {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-lg bg-green-500/10 p-4 text-green-600 dark:text-green-400 ${className}`}
      >
        <FaCheck size={16} />
        <span className="font-medium">{message}</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex w-full flex-col gap-2 sm:flex-row ${className}`}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("placeholder")}
        disabled={status === "loading"}
        className="min-h-[48px] flex-1 rounded-lg border border-input bg-background px-4 py-2 text-base shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
      />
      <Button
        type="submit"
        size="lg"
        disabled={status === "loading"}
        className="min-h-[48px] font-semibold"
      >
        {status === "loading" ? (
          <FaSpinner className="animate-spin" size={16} />
        ) : (
          t("button")
        )}
      </Button>
      {status === "error" && (
        <p className="absolute -bottom-6 left-0 text-sm text-red-500">
          {message}
        </p>
      )}
    </form>
  );
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { FaGoogle, FaGithub } from "react-icons/fa6";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setError(locale === "ko" ? "비밀번호가 일치하지 않습니다." : "Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError(locale === "ko" ? "비밀번호는 8자 이상이어야 합니다." : "Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();

      // Create auth user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError(locale === "ko" ? "이미 등록된 이메일입니다." : "This email is already registered.");
        } else {
          setError(locale === "ko" ? "회원가입에 실패했습니다." : "Registration failed.");
        }
        return;
      }

      if (authData.user) {
        // 트리거가 자동으로 users 테이블에 레코드 생성
        // Check if email confirmation is required
        if (authData.user.identities?.length === 0) {
          setSuccess(true);
          setError(locale === "ko"
            ? "이미 등록된 이메일입니다. 로그인 페이지로 이동하세요."
            : "This email is already registered. Please go to login page.");
        } else if (!authData.session) {
          // Email confirmation required
          setSuccess(true);
        } else {
          // Auto-confirmed, redirect to login
          router.push("/login");
        }
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(locale === "ko" ? "회원가입에 실패했습니다." : "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    try {
      await signIn(provider, {
        callbackUrl: `/${locale}`,
      });
    } catch (error) {
      console.error("Social login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-none hover:translate-x-0 hover:translate-y-0">
      <CardHeader className="text-center">
        <Link href="/" className="mb-4 inline-block">
          <span className="font-cera text-2xl font-bold">AI Community</span>
        </Link>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Social Login Buttons */}
        <div className="grid gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin("google")}
            disabled={isLoading}
          >
            <FaGoogle className="mr-2" />
            {locale === "ko" ? "Google로 계속하기" : "Continue with Google"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin("github")}
            disabled={isLoading}
          >
            <FaGithub className="mr-2" />
            {locale === "ko" ? "GitHub로 계속하기" : "Continue with GitHub"}
          </Button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {locale === "ko" ? "또는" : "or"}
            </span>
          </div>
        </div>

        {/* Success Message */}
        {success && !error && (
          <div className="rounded-md bg-green-500/10 p-4 text-center">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {locale === "ko"
                ? "회원가입이 완료되었습니다! 이메일을 확인해주세요."
                : "Registration successful! Please check your email."}
            </p>
            <Link href="/login" className="mt-2 inline-block text-sm font-medium hover:underline">
              {locale === "ko" ? "로그인 페이지로 이동" : "Go to login page"}
            </Link>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className={`space-y-4 ${success && !error ? "hidden" : ""}`}>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              type="text"
              placeholder={locale === "ko" ? "홍길동" : "John Doe"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "..." : t("button")}
          </Button>
        </form>

        {/* Login Link */}
        {!success && (
          <p className="text-center text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href="/login" className="font-medium hover:underline">
              {t("login")}
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

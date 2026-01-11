"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { useSession, signOut } from "next-auth/react";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/layout/theme-toggle";
import LanguageToggle from "@/components/layout/language-toggle";

import { FaBars, FaXmark, FaUser, FaRightFromBracket } from "react-icons/fa6";

const NavigationBar = () => {
  const t = useTranslations("nav");
  const locale = useLocale();
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navMenuRef = useRef(null);

  const isAuthenticated = status === "authenticated" && session?.user;

  const navLinks = [
    { name: t("home"), path: "/" },
    { name: t("content"), path: "/content" },
    { name: t("categories"), path: "/categories" },
    { name: t("homer"), path: "/homer" },
    { name: t("premium"), path: "/premium" },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      if (isMenuOpen && window.innerWidth >= 1024) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isMenuOpen &&
        navMenuRef.current &&
        !navMenuRef.current.contains(e.target)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <>
      <div className="container z-20 flex items-center justify-between gap-5 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-cera text-xl font-bold">AI Community</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((navLink, index) => (
            <Link
              key={index}
              href={navLink.path}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              {navLink.name}
            </Link>
          ))}
        </nav>

        {/* Right side - toggles and auth */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />

          {/* Desktop Auth Buttons */}
          <div className="hidden items-center gap-2 lg:flex">
            {isAuthenticated ? (
              <>
                <Link href="/profile" className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-accent">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <FaUser size={14} className="text-muted-foreground" />
                    )}
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: `/${locale}` })}
                >
                  <FaRightFromBracket className="mr-2" size={14} />
                  {t("logout")}
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    {t("login")}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">{t("register")}</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={toggleMenu}
          >
            {isMenuOpen ? <FaXmark size={20} /> : <FaBars size={20} />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            ref={navMenuRef}
            initial={{ translateX: "100%" }}
            animate={{ translateX: "0%" }}
            exit={{ translateX: "100%" }}
            transition={{
              duration: 0.3,
              type: "tween",
              ease: "easeInOut",
            }}
            className="fixed right-0 top-0 z-50 flex h-screen w-[70%] flex-col border-l bg-background p-6"
          >
            {/* Close button */}
            <div className="mb-8 flex justify-end">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                <FaXmark size={20} />
              </Button>
            </div>

            {/* Mobile Nav Links */}
            <ul className="flex flex-col gap-4">
              {navLinks.map((navLink, index) => (
                <li key={index}>
                  <Link
                    href={navLink.path}
                    className="text-lg font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {navLink.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Mobile Auth Buttons */}
            <div className="mt-8 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      <FaUser className="mr-2" size={14} />
                      {t("profile")}
                    </Button>
                  </Link>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setIsMenuOpen(false);
                      signOut({ callbackUrl: `/${locale}` });
                    }}
                  >
                    <FaRightFromBracket className="mr-2" size={14} />
                    {t("logout")}
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      {t("login")}
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full">{t("register")}</Button>
                  </Link>
                </>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black lg:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default NavigationBar;

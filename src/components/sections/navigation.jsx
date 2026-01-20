"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { useSession, signOut } from "next-auth/react";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/layout/theme-toggle";
import LanguageToggle from "@/components/layout/language-toggle";

import {
  FaBars,
  FaXmark,
  FaUser,
  FaRightFromBracket,
  FaGear,
} from "react-icons/fa6";

const NavigationBar = () => {
  const t = useTranslations("nav");
  const locale = useLocale();
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navMenuRef = useRef(null);

  const isAuthenticated = status === "authenticated" && session?.user;
  const isAdmin = isAuthenticated && session?.user?.role === "admin";

  const navLinks = [
    { name: t("home"), path: "/" },
    { name: t("content"), path: "/content" },
    { name: t("opensource"), path: "/opensource" },
    { name: t("newsletter"), path: "/newsletter" },
    { name: t("homer"), path: "/homer" },
    { name: t("premium"), path: "/premium", comingSoon: true },
  ];

  const handleNavClick = (e, navLink) => {
    if (navLink.comingSoon) {
      e.preventDefault();
      alert("준비중입니다");
    }
  };

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
      <div className="container z-20 flex items-center justify-between gap-2 py-4 sm:gap-5">
        {/* Logo */}
        <Link href="/" className="flex min-w-0 flex-shrink items-center gap-2">
          <span className="truncate font-cera text-lg font-bold sm:text-xl">
            AI Community
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((navLink, index) => (
            <Link
              key={index}
              href={navLink.path}
              className="text-sm font-medium transition-colors hover:text-primary"
              onClick={(e) => handleNavClick(e, navLink)}
            >
              {navLink.name}
            </Link>
          ))}
        </nav>

        {/* Right side - toggles and auth */}
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <LanguageToggle />

          {/* Desktop Auth Buttons */}
          <div className="hidden items-center gap-2 lg:flex">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm">
                      <FaGear className="mr-2" size={14} />
                      Admin
                    </Button>
                  </Link>
                )}
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
            className="min-h-[44px] min-w-[44px] lg:hidden"
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
            className="fixed right-0 top-0 z-50 flex h-dvh w-[85%] max-w-sm flex-col border-l bg-background p-4 sm:w-[70%] sm:p-6"
          >
            {/* Close button */}
            <div className="mb-6 flex justify-end sm:mb-8">
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                onClick={() => setIsMenuOpen(false)}
              >
                <FaXmark size={20} />
              </Button>
            </div>

            {/* Mobile Nav Links */}
            <ul className="flex flex-col gap-2 sm:gap-4">
              {navLinks.map((navLink, index) => (
                <li key={index}>
                  <Link
                    href={navLink.path}
                    className="block min-h-[44px] py-2 text-base font-medium sm:text-lg"
                    onClick={(e) => {
                      if (navLink.comingSoon) {
                        e.preventDefault();
                        alert("준비중입니다");
                      } else {
                        setIsMenuOpen(false);
                      }
                    }}
                  >
                    {navLink.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Mobile Auth Buttons */}
            <div className="mt-6 flex flex-col gap-2 sm:mt-8">
              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="min-h-[44px] w-full">
                        <FaGear className="mr-2" size={14} />
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="min-h-[44px] w-full">
                      <FaUser className="mr-2" size={14} />
                      {t("profile")}
                    </Button>
                  </Link>
                  <Button
                    className="min-h-[44px] w-full"
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
                    <Button variant="outline" className="min-h-[44px] w-full">
                      {t("login")}
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                    <Button className="min-h-[44px] w-full">
                      {t("register")}
                    </Button>
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

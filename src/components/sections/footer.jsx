"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

const Footer = () => {
  const t = useTranslations("footer");
  const [year, setYear] = useState(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const footerLinks = [
    { name: t("about"), path: "/about" },
    { name: t("terms"), path: "/terms" },
    { name: t("privacy"), path: "/privacy" },
    { name: t("contact"), path: "/contact" },
  ];

  return (
    <footer className="border-t">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
          <span className="font-cera text-lg font-bold">AI Community</span>
          <span className="text-xs text-muted-foreground">
            &copy; {year ?? new Date().getFullYear()} AI Community. All rights
            reserved.
          </span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
          {footerLinks.map((link, index) => (
            <Link
              key={index}
              href={link.path}
              className="flex min-h-[44px] items-center px-2 text-xs text-muted-foreground transition-colors hover:text-foreground sm:px-3"
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
};

export default Footer;

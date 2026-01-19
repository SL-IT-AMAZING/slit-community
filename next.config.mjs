import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  transpilePackages: ["next-auth"],
  experimental: {
    serverComponentsExternalPackages: ["cheerio", "@supabase/supabase-js"],
  },
};

export default withNextIntl(nextConfig);

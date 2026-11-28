import { BlaWebpackPlugin } from "bla-agents/bundler";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  },
  webpack(config, { dev, isServer }) {
    if (!dev && !isServer) {
      config.plugins.push(
        new BlaWebpackPlugin({
          intensity: "balanced",
          honeySourceMap: true,
          seed: "onepath-lab-lis-shield",
          exclude: /(?:^|\/)(?:webpack|framework|polyfills)-[^/]+\.js$/i,
        })
      );
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: "/dashboard/cases",
        destination: "/dashboard/doctors",
        permanent: false,
      },
      {
        source: "/dashboard/collection-centers",
        destination: "/dashboard/settings?tab=collection-centers",
        permanent: false,
      },
      {
        source: "/dashboard/referral",
        destination: "/dashboard/refer",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

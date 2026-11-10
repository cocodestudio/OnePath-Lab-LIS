/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
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

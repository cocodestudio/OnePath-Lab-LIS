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
};

export default nextConfig;

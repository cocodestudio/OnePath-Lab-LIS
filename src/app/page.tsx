"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    router.replace(token ? "/dashboard" : "/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

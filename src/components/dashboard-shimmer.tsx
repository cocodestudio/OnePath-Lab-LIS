import React from "react";

export function DashboardShimmer() {
  return (
    <div className="space-y-7 animate-fade-in select-none" aria-busy="true" aria-label="Loading dashboard overview">
      {/* Top Header Shimmer */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded shimmer-gradient" />
          <div className="h-8 w-64 rounded-lg shimmer-gradient" />
          <div className="h-4 w-72 rounded shimmer-gradient" />
        </div>
        <div className="h-10 w-28 rounded-lg shimmer-gradient shrink-0" />
      </div>

      {/* 4 Stat Cards Shimmer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { labelW: "w-28", valW: "w-16", trendW: "w-20" },
          { labelW: "w-32", valW: "w-20", trendW: "w-28" },
          { labelW: "w-36", valW: "w-20", trendW: "w-24" },
          { labelW: "w-32", valW: "w-28", trendW: "w-28" },
        ].map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between p-5 rounded-xl border border-border/70 bg-card shadow-card shimmer-card-pulse min-h-[140px]"
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-lg shimmer-gradient shrink-0" />
              <div className={`h-5 ${item.trendW} rounded-full shimmer-gradient`} />
            </div>
            <div className="mt-5 space-y-2">
              <div className={`h-3 ${item.labelW} rounded shimmer-gradient`} />
              <div className={`h-8 ${item.valW} rounded-md shimmer-gradient`} />
            </div>
          </div>
        ))}
      </div>

      {/* Middle Row Shimmer: Chart (8 col) + Quick Actions (4 col) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Weekly Trend Chart Skeleton */}
        <div className="col-span-12 lg:col-span-8 bg-card border border-border/70 rounded-xl p-6 shadow-card shimmer-card-pulse flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1.5">
              <div className="h-5 w-44 rounded-md shimmer-gradient" />
              <div className="h-3 w-28 rounded shimmer-gradient" />
            </div>
            <div className="h-7 w-20 rounded-lg shimmer-gradient" />
          </div>
          {/* Mock Bar Chart Columns with gradient shimmer */}
          <div className="h-56 flex items-end justify-between gap-3 px-3 pb-2 border-b border-border/40">
            {[45, 75, 55, 90, 60, 80, 65].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div
                  className="w-full max-w-[42px] rounded-t-md shimmer-gradient transition-all"
                  style={{ height: `${h}%` }}
                />
                <div className="h-2.5 w-6 rounded shimmer-gradient" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="col-span-12 lg:col-span-4 bg-card border border-border/70 rounded-xl p-6 shadow-card shimmer-card-pulse">
          <div className="h-5 w-32 rounded-md shimmer-gradient mb-5" />
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 p-3.5 rounded-lg border border-border/60 bg-background/50"
              >
                <div className="w-10 h-10 rounded-lg shimmer-gradient shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-28 rounded shimmer-gradient" />
                  <div className="h-3 w-40 rounded shimmer-gradient" />
                </div>
                <div className="w-4 h-4 rounded shimmer-gradient shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row Shimmer: Recent Patients (8 col) + Report Status Donut (4 col) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Recent Reports Table Skeleton */}
        <div className="col-span-12 lg:col-span-8 bg-card border border-border/70 rounded-xl shadow-card shimmer-card-pulse overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <div className="h-5 w-48 rounded-md shimmer-gradient" />
            <div className="h-4 w-16 rounded shimmer-gradient" />
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex items-center justify-between gap-4 py-2 border-b border-border/30 last:border-0">
                <div className="h-3.5 w-20 rounded shimmer-gradient shrink-0" />
                <div className="h-4 w-32 rounded shimmer-gradient flex-1" />
                <div className="h-3.5 w-28 rounded shimmer-gradient hidden sm:block flex-1" />
                <div className="h-6 w-20 rounded-full shimmer-gradient shrink-0" />
                <div className="h-3.5 w-10 rounded shimmer-gradient shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Report Status Donut Skeleton */}
        <div className="col-span-12 lg:col-span-4 bg-card border border-border/70 rounded-xl p-6 shadow-card shimmer-card-pulse flex flex-col">
          <div className="h-5 w-32 rounded-md shimmer-gradient" />
          <div className="h-3 w-36 rounded shimmer-gradient mt-1.5 mb-4" />
          <div className="relative flex-1 flex items-center justify-center min-h-[160px]">
            {/* Donut ring simulation */}
            <div className="w-36 h-36 rounded-full border-[14px] border-muted/50 relative flex items-center justify-center shimmer-gradient">
              <div className="w-20 h-20 rounded-full bg-card flex flex-col items-center justify-center space-y-1">
                <div className="h-5 w-10 rounded shimmer-gradient" />
                <div className="h-2 w-8 rounded shimmer-gradient" />
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2.5 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shimmer-gradient" />
                <div className="h-3 w-28 rounded shimmer-gradient" />
              </div>
              <div className="h-3.5 w-8 rounded shimmer-gradient" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shimmer-gradient" />
                <div className="h-3 w-20 rounded shimmer-gradient" />
              </div>
              <div className="h-3.5 w-8 rounded shimmer-gradient" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

      {/* Row 1 Shimmer: Analytics Trends & Performance (Two 6-column symmetrical charts) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Weekly Trend Chart Skeleton (6 cols) */}
        <div className="col-span-12 lg:col-span-6 bg-card border border-border/70 rounded-xl p-6 shadow-card shimmer-card-pulse flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1.5">
                <div className="h-5 w-44 rounded-md shimmer-gradient" />
                <div className="h-3 w-28 rounded shimmer-gradient" />
              </div>
              <div className="h-3.5 w-20 rounded shimmer-gradient shrink-0" />
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
          {/* 4 Diagnostic Metric Pill Skeletons */}
          <div className="mt-4 pt-3.5 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="h-2.5 w-16 rounded shimmer-gradient" />
                <div className="h-4 w-12 rounded shimmer-gradient" />
              </div>
            ))}
          </div>
        </div>

        {/* Total Sales Trend Skeleton (6 cols) */}
        <div className="col-span-12 lg:col-span-6 bg-card border border-border/70 rounded-xl p-6 shadow-card shimmer-card-pulse flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="space-y-1.5">
                <div className="h-5 w-52 rounded-md shimmer-gradient" />
                <div className="h-3 w-40 rounded shimmer-gradient" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-24 rounded-lg shimmer-gradient" />
                <div className="h-3.5 w-20 rounded shimmer-gradient shrink-0" />
              </div>
            </div>
            {/* Mock Area Chart Waves with gradient shimmer */}
            <div className="h-56 flex items-end justify-between gap-3 px-3 pb-2 border-b border-border/40">
              {[35, 60, 45, 85, 50, 75, 90].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    className="w-full max-w-[42px] rounded-t-md shimmer-gradient transition-all opacity-85"
                    style={{ height: `${h}%` }}
                  />
                  <div className="h-2.5 w-6 rounded shimmer-gradient" />
                </div>
              ))}
            </div>
          </div>
          {/* 4 Financial Metric Pill Skeletons */}
          <div className="mt-4 pt-3.5 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="h-2.5 w-16 rounded shimmer-gradient" />
                <div className="h-4 w-20 rounded shimmer-gradient" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2 Shimmer: Payments Due + Report Status (Two 6-column symmetrical cards) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Payments Due Skeleton (6 cols) */}
        <div className="col-span-12 lg:col-span-6 bg-card border border-border/70 rounded-xl p-5 sm:p-6 shadow-card shimmer-card-pulse flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="space-y-1.5 flex-1">
                <div className="h-5 w-36 rounded-md shimmer-gradient" />
                <div className="h-3 w-48 rounded shimmer-gradient" />
              </div>
              <div className="h-3.5 w-16 rounded shimmer-gradient shrink-0" />
            </div>
            <div className="space-y-3 mt-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/50 bg-background/40"
                >
                  <div className="space-y-1 flex-1">
                    <div className="h-3.5 w-24 rounded shimmer-gradient" />
                    <div className="h-2.5 w-32 rounded shimmer-gradient" />
                  </div>
                  <div className="h-4 w-14 rounded shimmer-gradient shrink-0" />
                  <div className="h-6 w-14 rounded-md shimmer-gradient shrink-0" />
                </div>
              ))}
            </div>
          </div>
          <div className="h-3.5 w-40 rounded shimmer-gradient mx-auto mt-4" />
        </div>

        {/* Report Status Donut Skeleton (6 cols) */}
        <div className="col-span-12 lg:col-span-6 bg-card border border-border/70 rounded-xl p-5 sm:p-6 shadow-card shimmer-card-pulse flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="space-y-1.5 flex-1">
                <div className="h-5 w-44 rounded-md shimmer-gradient" />
                <div className="h-3 w-40 rounded shimmer-gradient" />
              </div>
              <div className="h-3.5 w-24 rounded shimmer-gradient shrink-0" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mt-2">
              <div className="flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center w-full min-h-[160px]">
                  {/* Donut ring simulation */}
                  <div className="w-36 h-36 rounded-full border-[14px] border-muted/50 relative flex items-center justify-center shimmer-gradient">
                    <div className="w-20 h-20 rounded-full bg-card flex flex-col items-center justify-center space-y-1">
                      <div className="h-5 w-10 rounded shimmer-gradient" />
                      <div className="h-2 w-12 rounded shimmer-gradient" />
                    </div>
                  </div>
                </div>
                <div className="w-full max-w-[200px] mt-1 space-y-1">
                  <div className="h-2.5 w-full rounded shimmer-gradient" />
                  <div className="h-1.5 w-full rounded-full shimmer-gradient" />
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="h-8 w-full rounded-lg shimmer-gradient" />
                <div className="h-8 w-full rounded-lg shimmer-gradient" />
                <div className="h-8 w-full rounded-lg shimmer-gradient" />
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="h-8 rounded-lg shimmer-gradient" />
                  <div className="h-8 rounded-lg shimmer-gradient" />
                </div>
              </div>
            </div>
          </div>
          <div className="h-3.5 w-48 rounded shimmer-gradient mt-4" />
        </div>
      </div>
    </div>
  );
}

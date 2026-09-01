"use client";

import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeSVGProps {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
  className?: string;
}

export function BarcodeSVG({
  value,
  width = 1.1,
  height = 24,
  fontSize = 8.5,
  displayValue = true,
  className = "",
}: BarcodeSVGProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value && typeof value === "string" && value.trim() !== "") {
      try {
        // Clean value to alphanumeric / hyphens for standard Code 128
        const cleanValue = value.trim();
        JsBarcode(svgRef.current, cleanValue, {
          format: "CODE128",
          width,
          height,
          displayValue,
          font: "monospace",
          fontSize,
          textMargin: 1,
          margin: 0,
          background: "transparent",
          lineColor: "#000000",
        });
      } catch (err) {
        console.error("Barcode render error:", err);
      }
    }
  }, [value, width, height, fontSize, displayValue]);

  if (!value || typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return <svg ref={svgRef} className={className} style={{ display: "block" }} />;
}

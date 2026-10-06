"use client";

import React from "react";

export interface WorksheetPanel {
  panel_name: string;
  parameters: string[];
}

export interface WorksheetDepartment {
  department: string;
  panels: WorksheetPanel[];
}

export interface WorksheetPatient {
  report_id: string;
  patient_id: string;
  barcode: string;
  patient_name: string;
  age: string;
  gender: string;
  reg_date: string;
  center_heading: string;
  departments: WorksheetDepartment[];
}

export interface WorksheetData {
  generated_at: string;
  total_patients: number;
  patients: WorksheetPatient[];
  lab_name?: string;
}

interface WorksheetSheetProps {
  data: WorksheetData;
}

export function WorksheetSheet({ data }: WorksheetSheetProps) {
  if (!data || !data.patients || data.patients.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 font-mono text-sm bg-white">
        No patient reports match the selected criteria for worksheet generation.
      </div>
    );
  }

  return (
    <div
      className="worksheet-print-document bg-white text-black p-6 sm:p-8 font-sans max-w-[850px] mx-auto text-xs leading-tight print:p-4 print:max-w-none print:w-full"
      style={{
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: "#000000",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .worksheet-patient-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
        .dotted-leader {
          display: flex;
          align-items: baseline;
          width: 100%;
          overflow: hidden;
        }
        .dotted-leader-text {
          white-space: nowrap;
          padding-right: 4px;
          font-weight: 500;
          font-size: 11px;
        }
        .dotted-leader-line {
          flex: 1;
          border-bottom: 1.5px dotted #555555;
          margin-bottom: 3px;
        }
      `}} />

      <div className="space-y-6">
        {data.patients.map((pat, patIdx) => {
          // Check if previous patient had the same center heading
          const prevPat = patIdx > 0 ? data.patients[patIdx - 1] : null;
          const showCenterHeader = !prevPat || prevPat.center_heading !== pat.center_heading;

          return (
            <div
              key={`${pat.report_id}-${patIdx}`}
              className="worksheet-patient-block space-y-2 border-b border-zinc-400 pb-5 mb-5 last:border-b-0 last:pb-0"
            >
              {/* Center / Partner Header */}
              {showCenterHeader && (
                <div className="border-t-2 border-b-2 border-black py-1 px-1 flex items-center justify-between mb-2">
                  <div className="w-1/4"></div>
                  <div className="w-2/4 text-center font-bold text-sm uppercase tracking-wide underline">
                    {pat.center_heading || data.lab_name || "CENTRAL LABORATORY"}
                  </div>
                  <div className="w-1/4 text-right text-[10px] font-mono text-zinc-700">
                    {data.generated_at}
                  </div>
                </div>
              )}

              {/* Patient Demographics Bar */}
              <div className="flex items-center justify-between text-xs py-1 px-1 font-semibold border-b border-black">
                <div className="font-mono font-bold text-black min-w-[110px]">
                  {pat.report_id || pat.barcode || pat.patient_id}
                </div>
                <div className="font-bold text-black flex-1 px-2 truncate">
                  {pat.patient_name}
                </div>
                <div className="w-24 text-center">
                  {pat.age}
                </div>
                <div className="w-20 text-center capitalize">
                  {pat.gender}
                </div>
                <div className="w-24 text-right font-mono">
                  {pat.reg_date}
                </div>
              </div>

              {/* Departments & Test Panels */}
              <div className="space-y-3 pt-1">
                {pat.departments.map((dept, deptIdx) => (
                  <div key={deptIdx} className="space-y-1.5">
                    {/* Department Heading */}
                    <div className="font-extrabold text-[12px] uppercase tracking-wide underline text-black">
                      {dept.department}
                    </div>

                    {/* Panels */}
                    {dept.panels.map((panel, panelIdx) => (
                      <div key={panelIdx} className="space-y-1 pl-1">
                        <div className="font-bold text-[11px] uppercase text-black tracking-tight">
                          {panel.panel_name}
                        </div>

                        {/* 3-Column Parameters Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5 pt-0.5">
                          {panel.parameters.map((param, paramIdx) => (
                            <div key={paramIdx} className="dotted-leader">
                              <span className="dotted-leader-text">
                                {param}
                              </span>
                              <span className="dotted-leader-line" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

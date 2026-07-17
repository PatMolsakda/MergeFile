import React from "react";
import { MergeStats, DiscrepancyInfo } from "../types";
import { BarChart3, ShieldAlert, CheckCircle2, Table, Info } from "lucide-react";
import { motion } from "motion/react";

interface StatsDashboardProps {
  stats: MergeStats;
  discrepancies: DiscrepancyInfo[];
  filenameA: string;
  filenameB: string;
  joinType: string;
}

export default function StatsDashboard({
  stats,
  discrepancies,
  filenameA,
  filenameB,
  joinType,
}: StatsDashboardProps) {
  const totalKeys = stats.matched + stats.onlyA + stats.onlyB;
  const matchRate = totalKeys > 0 ? (stats.matched / totalKeys) * 100 : 0;

  // Render SVG Venn Diagram sizes based on proportions
  // We'll set elegant offsets and radius sizes based on stats
  const totalA = stats.matched + stats.onlyA;
  const totalB = stats.matched + stats.onlyB;

  // Scale circles gracefully
  const maxVal = Math.max(totalA, totalB, 1);
  const sizeA = 50 + (totalA / maxVal) * 30; // Radius between 50 and 80
  const sizeB = 50 + (totalB / maxVal) * 30;

  // Let's draw Venn circles
  const circleCX_A = 120;
  const circleCX_B = 200;
  const cy = 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4" id="stats-dashboard">
      {/* Bento Item 1: Venn Diagram overlap */}
      <div className="md:col-span-4 bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between h-[184px]">
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Dataset Overlap</span>
          <h4 className="text-[11px] font-bold text-slate-700">Venn Diagram</h4>
        </div>

        <div className="flex items-center justify-center h-28">
          <svg viewBox="0 0 320 200" className="w-full h-full max-h-[100px]">
            {/* Circle A (Primary) */}
            <circle
              cx={circleCX_A}
              cy={cy}
              r={sizeA}
              fill="rgba(16, 185, 129, 0.08)"
              stroke="rgb(16, 185, 129)"
              strokeWidth="1.5"
              strokeDasharray={joinType === "right" ? "3 3" : "none"}
            />
            {/* Circle B (Target) */}
            <circle
              cx={circleCX_B}
              cy={cy}
              r={sizeB}
              fill="rgba(79, 70, 229, 0.08)"
              stroke="rgb(79, 70, 229)"
              strokeWidth="1.5"
              strokeDasharray={joinType === "left" ? "3 3" : "none"}
            />

            {/* Texts */}
            <text x="55" y="102" className="text-[12px] font-bold fill-emerald-800" textAnchor="middle">
              A Only
            </text>
            <text x="55" y="118" className="text-[11px] font-mono fill-emerald-600" textAnchor="middle">
              {stats.onlyA}
            </text>

            <text x="265" y="102" className="text-[12px] font-bold fill-indigo-800" textAnchor="middle">
              B Only
            </text>
            <text x="265" y="118" className="text-[11px] font-mono fill-indigo-600" textAnchor="middle">
              {stats.onlyB}
            </text>

            <text x="160" y="102" className="text-[12px] font-bold fill-slate-800" textAnchor="middle">
              Matched
            </text>
            <text x="160" y="118" className="text-[11px] font-mono fill-slate-600" textAnchor="middle">
              {stats.matched}
            </text>
          </svg>
        </div>

        <div className="text-[9px] text-slate-400 text-center flex items-center justify-center space-x-1">
          <Info className="h-3 w-3 shrink-0" />
          <span className="truncate">Circle radii represent relative row counts.</span>
        </div>
      </div>

      {/* Bento Item 2: Overlap stats summary */}
      <div className="md:col-span-5 bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between h-[184px]">
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Origin Analysis</span>
          <h4 className="text-[11px] font-bold text-slate-700">Rows Origin Tracker</h4>
        </div>

        <div className="space-y-2 py-1">
          {/* Matched (Both) */}
          <div>
            <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-0.5">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-slate-800 shrink-0" />
                <span>Merged (Matched on Key)</span>
              </span>
              <span className="font-mono text-slate-900 font-bold">{stats.matched} rows</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-slate-800 h-full rounded-full transition-all duration-500"
                style={{ width: `${totalKeys > 0 ? (stats.matched / totalKeys) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Only A */}
          <div>
            <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-0.5">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate max-w-[160px]">Only in Sheet A ({filenameA})</span>
              </span>
              <span className="font-mono text-slate-900 font-bold">{stats.onlyA} rows</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${totalKeys > 0 ? (stats.onlyA / totalKeys) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Only B */}
          <div>
            <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-0.5">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                <span className="truncate max-w-[160px]">Only in Sheet B ({filenameB})</span>
              </span>
              <span className="font-mono text-slate-900 font-bold">{stats.onlyB} rows</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${totalKeys > 0 ? (stats.onlyB / totalKeys) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-md py-1 px-2 flex items-center justify-between text-[10px] text-slate-500 border border-slate-100">
          <span>Match Alignment Index:</span>
          <span className="font-bold text-slate-800 font-mono">{matchRate.toFixed(1)}%</span>
        </div>
      </div>

      {/* Bento Item 3: Direct Metrics & Discrepancies */}
      <div className="md:col-span-3 bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between h-[184px]">
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Dataset Health</span>
          <h4 className="text-[11px] font-bold text-slate-700">Summary Indicators</h4>
        </div>

        <div className="grid grid-cols-1 gap-1.5 my-auto">
          {/* Output Size Card */}
          <div className="bg-slate-50 border border-slate-100 rounded-md p-1.5 flex items-center space-x-2">
            <div className="p-1 bg-slate-100 text-slate-700 rounded-md shrink-0">
              <Table className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider">Output Size</p>
              <p className="text-xs font-bold text-slate-800 font-mono mt-0.5">{stats.total.toLocaleString()} rows</p>
            </div>
          </div>

          {/* Discrepancies Alert Card */}
          <div className={`border rounded-md p-1.5 flex items-center space-x-2 transition-colors ${
            discrepancies.length > 0 
              ? "bg-amber-50/40 border-amber-150" 
              : "bg-emerald-50/20 border-emerald-100"
          }`}>
            <div className={`p-1 rounded-md shrink-0 ${
              discrepancies.length > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            }`}>
              {discrepancies.length > 0 ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider">Discrepancies</p>
              <p className={`text-xs font-bold font-mono mt-0.5 ${discrepancies.length > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                {discrepancies.length} Conflicts
              </p>
            </div>
          </div>
        </div>

        <div className="text-[8px] text-slate-400 text-center uppercase tracking-wider font-semibold">
          Realtime Processing
        </div>
      </div>
    </div>
  );
}

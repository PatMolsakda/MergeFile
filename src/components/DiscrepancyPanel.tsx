import React from "react";
import { DiscrepancyInfo } from "../types";
import { ShieldAlert, ArrowRight, Search, ZoomIn, Check, RotateCcw } from "lucide-react";

interface DiscrepancyPanelProps {
  discrepancies: DiscrepancyInfo[];
  filenameA: string;
  filenameB: string;
  onSelectConflict: (key: string) => void;
  selectedConflictKey: string | null;
  resolvedConflicts: Record<string, "A" | "B">;
  onResolveConflict: (key: string, column: string, choice: "A" | "B" | null) => void;
}

export default function DiscrepancyPanel({
  discrepancies,
  filenameA,
  filenameB,
  onSelectConflict,
  selectedConflictKey,
  resolvedConflicts,
  onResolveConflict,
}: DiscrepancyPanelProps) {
  if (discrepancies.length === 0) {
    return null;
  }

  // Abbreviate filenames
  const shortA = filenameA.length > 25 ? `${filenameA.substring(0, 22)}...` : filenameA;
  const shortB = filenameB.length > 25 ? `${filenameB.substring(0, 22)}...` : filenameB;

  const resolvedCount = Object.keys(resolvedConflicts).length;

  return (
    <div className="bg-white rounded-lg border border-amber-200 p-3.5 mb-4" id="discrepancy-panel">
      <div className="flex items-center justify-between border-b border-amber-100 pb-2 mb-2">
        <div className="flex items-center space-x-1.5">
          <div className="p-1 bg-amber-50 text-amber-700 rounded">
            <ShieldAlert className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-xs">Conflict Resolver</h3>
            <p className="text-[10px] text-slate-400">Values differ on matching keys for these cells.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[9px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
            {resolvedCount} / {discrepancies.length} Resolved
          </span>
          <span className="text-[9px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
            {discrepancies.length - resolvedCount} Unresolved
          </span>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mb-2 bg-amber-50/30 p-2 rounded border border-amber-50 leading-relaxed">
        💡 <strong>Direct Resolver:</strong> Reconcile conflicts by selecting which dataset value is correct. The selected value will be written back to the merged table.
      </p>

      {/* Grid List of conflicts */}
      <div className="max-h-56 overflow-y-auto border border-slate-100 rounded divide-y divide-slate-100 pr-1">
        {discrepancies.map((d, index) => {
          const isSelected = selectedConflictKey === d.key;
          const conflictId = `${d.key}::${d.column}`;
          const resolution = resolvedConflicts[conflictId];

          return (
            <div
              key={`${d.key}-${d.column}-${index}`}
              className={`p-2 text-[11px] flex flex-col md:flex-row md:items-center md:justify-between gap-2 transition-colors ${
                resolution 
                  ? "bg-slate-50/40 opacity-75 hover:opacity-100" 
                  : isSelected 
                    ? "bg-amber-50/50" 
                    : "hover:bg-slate-50"
              }`}
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="font-mono bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[9px] font-bold">
                    Key: {d.key}
                  </span>
                  <span className="font-bold text-slate-600">
                    Column: <span className="text-amber-800 font-mono text-[10px] bg-amber-50 px-1 rounded border border-amber-100">{d.column}</span>
                  </span>
                  {resolution && (
                    <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-bold flex items-center space-x-0.5">
                      <Check className="h-2 w-2" />
                      <span>Kept Sheet {resolution}</span>
                    </span>
                  )}
                </div>

                {/* Values Comparison */}
                <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                  <div className="flex items-center space-x-1">
                    <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded border border-emerald-100">Sheet A:</span>
                    <span className={`font-mono truncate max-w-[120px] inline-block ${resolution === "A" ? "text-slate-900 font-bold" : "text-slate-600"}`} title={String(d.valA)}>
                      {String(d.valA) || <em className="text-slate-400">empty</em>}
                    </span>
                  </div>
                  <ArrowRight className="h-2.5 w-2.5 text-slate-400" />
                  <div className="flex items-center space-x-1">
                    <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1 rounded border border-indigo-100">Sheet B:</span>
                    <span className={`font-mono truncate max-w-[120px] inline-block ${resolution === "B" ? "text-slate-900 font-bold" : "text-slate-600"}`} title={String(d.valB)}>
                      {String(d.valB) || <em className="text-slate-400">empty</em>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1 shrink-0 self-end md:self-auto">
                {resolution ? (
                  <button
                    onClick={() => onResolveConflict(d.key, d.column, null)}
                    className="px-2 py-1 rounded text-[9px] font-bold text-slate-500 border border-slate-200 hover:border-slate-300 hover:bg-white bg-slate-50 transition-all flex items-center space-x-1 cursor-pointer"
                    title="Change resolution"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    <span>Undo</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onResolveConflict(d.key, d.column, "A")}
                      className="px-2 py-1 rounded text-[9px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 bg-white transition-all cursor-pointer"
                    >
                      Use A
                    </button>
                    <button
                      onClick={() => onResolveConflict(d.key, d.column, "B")}
                      className="px-2 py-1 rounded text-[9px] font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 bg-white transition-all cursor-pointer"
                    >
                      Use B
                    </button>
                  </>
                )}

                <button
                  onClick={() => onSelectConflict(isSelected ? "" : d.key)}
                  className={`px-2 py-1 rounded text-[9px] font-bold transition-all flex items-center space-x-1 border cursor-pointer ${
                    isSelected
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <ZoomIn className="h-3 w-3" />
                  <span>{isSelected ? "Inspecting" : "Inspect"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

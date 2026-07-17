import React, { useState, useEffect } from "react";
import { FileState, MergeConfig } from "../types";
import { Settings, HelpCircle, Columns, Filter, Check, RefreshCw, Layers } from "lucide-react";
import { motion } from "motion/react";

interface MergeConfiguratorProps {
  fileA: FileState;
  fileB: FileState;
  config: MergeConfig;
  onChangeConfig: (newConfig: MergeConfig) => void;
  onRunMerge: () => void;
}

export default function MergeConfigurator({
  fileA,
  fileB,
  config,
  onChangeConfig,
  onRunMerge,
}: MergeConfiguratorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-initialize selected columns when files change or keys change
  useEffect(() => {
    if (fileA.headers.length > 0 && fileB.headers.length > 0) {
      // By default, keep all columns from both sheets
      onChangeConfig({
        ...config,
        selectedColumnsA: [...fileA.headers],
        selectedColumnsB: [...fileB.headers],
      });
    }
  }, [fileA.name, fileB.name]);

  const handleKeyAChange = (col: string) => {
    // Make sure match keys are always included in selected columns
    const selectedA = config.selectedColumnsA.includes(col)
      ? config.selectedColumnsA
      : [...config.selectedColumnsA, col];
    onChangeConfig({
      ...config,
      columnA: col,
      selectedColumnsA: selectedA,
    });
  };

  const handleKeyBChange = (col: string) => {
    const selectedB = config.selectedColumnsB.includes(col)
      ? config.selectedColumnsB
      : [...config.selectedColumnsB, col];
    onChangeConfig({
      ...config,
      columnB: col,
      selectedColumnsB: selectedB,
    });
  };

  const toggleColumnA = (col: string) => {
    // Do not allow deselecting the match key
    if (col === config.columnA) return;

    const newCols = config.selectedColumnsA.includes(col)
      ? config.selectedColumnsA.filter((c) => c !== col)
      : [...config.selectedColumnsA, col];
    onChangeConfig({ ...config, selectedColumnsA: newCols });
  };

  const toggleColumnB = (col: string) => {
    // Do not allow deselecting the match key
    if (col === config.columnB) return;

    const newCols = config.selectedColumnsB.includes(col)
      ? config.selectedColumnsB.filter((c) => c !== col)
      : [...config.selectedColumnsB, col];
    onChangeConfig({ ...config, selectedColumnsB: newCols });
  };

  const selectAllA = () => {
    onChangeConfig({ ...config, selectedColumnsA: [...fileA.headers] });
  };

  const selectAllB = () => {
    onChangeConfig({ ...config, selectedColumnsB: [...fileB.headers] });
  };

  const deselectAllA = () => {
    // Keep only match key
    onChangeConfig({ ...config, selectedColumnsA: [config.columnA] });
  };

  const deselectAllB = () => {
    // Keep only match key
    onChangeConfig({ ...config, selectedColumnsB: [config.columnB] });
  };

  const joinTypes = [
    {
      id: "left" as const,
      name: "Left Join (Keep A)",
      desc: "Keeps Sheet A. Matches with Sheet B.",
      color: "border-slate-200 hover:border-emerald-300 bg-slate-50/20",
      activeColor: "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/20 text-emerald-900",
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
    {
      id: "inner" as const,
      name: "Inner Join (Overlap)",
      desc: "Keeps only matching records.",
      color: "border-slate-200 hover:border-slate-400 bg-slate-50/20",
      activeColor: "border-slate-800 bg-slate-100 ring-1 ring-slate-800/20 text-slate-900",
      badgeColor: "bg-slate-200 text-slate-800",
    },
    {
      id: "outer" as const,
      name: "Outer Join (All Data)",
      desc: "Keeps all rows from both sheets.",
      color: "border-slate-200 hover:border-indigo-300 bg-slate-50/20",
      activeColor: "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/20 text-indigo-900",
      badgeColor: "bg-indigo-100 text-indigo-800",
    },
    {
      id: "right" as const,
      name: "Right Join (Keep B)",
      desc: "Keeps Sheet B. Matches with Sheet A.",
      color: "border-slate-200 hover:border-purple-300 bg-slate-50/20",
      activeColor: "border-purple-500 bg-purple-50/50 ring-1 ring-purple-500/20 text-purple-900",
      badgeColor: "bg-purple-100 text-purple-800",
    },
  ];

  return (
    <div className="space-y-4" id="merge-configurator-section">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-2 mb-2">
        <Settings className="h-4 w-4 text-indigo-600" />
        <div>
          <h2 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Align & Match Settings</h2>
          <p className="text-[10px] text-slate-400">Define keys and parameters.</p>
        </div>
      </div>

      <div className="space-y-3.5">
        {/* Step 1: Dropdown Column Matching */}
        <div className="space-y-2.5">
          <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-200/60 space-y-2.5">
            <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span>1. Match Keys</span>
            </h4>

            <div>
              <label className="block text-[10px] font-medium text-slate-600 mb-1 flex items-center justify-between">
                <span>Key Column in Sheet A</span>
                <span className="text-[9px] text-slate-400 font-mono">Primary</span>
              </label>
              <select
                value={config.columnA}
                onChange={(e) => handleKeyAChange(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white focus:outline-hidden focus:border-indigo-500 cursor-pointer text-slate-800 font-medium"
              >
                <option value="" disabled>-- Choose Key A --</option>
                {fileA.headers.map((h) => (
                  <option key={h} value={h}>
                    🔑 {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-600 mb-1 flex items-center justify-between">
                <span>Key Column in Sheet B</span>
                <span className="text-[9px] text-indigo-500 font-mono">Target</span>
              </label>
              <select
                value={config.columnB}
                onChange={(e) => handleKeyBChange(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white focus:outline-hidden focus:border-indigo-500 cursor-pointer text-slate-800 font-medium"
              >
                <option value="" disabled>-- Choose Key B --</option>
                {fileB.headers.map((h) => (
                  <option key={h} value={h}>
                    🔑 {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Smart Matching Options */}
          <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-200/60 space-y-2">
            <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Smart Normalizers
            </h4>

            <div className="space-y-2">
              <label className="flex items-start space-x-2 text-[11px] text-slate-600 hover:text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!config.caseSensitive}
                  onChange={(e) => onChangeConfig({ ...config, caseSensitive: !e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer h-3.5 w-3.5"
                />
                <div>
                  <span className="font-semibold text-slate-700">Case-Insensitive</span>
                  <p className="text-[9px] text-slate-400">Ignores casing (A=a).</p>
                </div>
              </label>

              <label className="flex items-start space-x-2 text-[11px] text-slate-600 hover:text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.trimWhitespace}
                  onChange={(e) => onChangeConfig({ ...config, trimWhitespace: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer h-3.5 w-3.5"
                />
                <div>
                  <span className="font-semibold text-slate-700">Trim Whitespace</span>
                  <p className="text-[9px] text-slate-400">Removes padding spaces.</p>
                </div>
              </label>

              <label className="flex items-start space-x-2 text-[11px] text-slate-600 hover:text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.cleanKeys}
                  onChange={(e) => onChangeConfig({ ...config, cleanKeys: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer h-3.5 w-3.5"
                />
                <div>
                  <span className="font-semibold text-slate-700">Clean Symbols</span>
                  <p className="text-[9px] text-slate-400">Strips punctuation and hyphens.</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Step 2: Merge Type Selection */}
        <div className="space-y-3">
          <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-200/60 flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between mb-2">
                <span className="flex items-center space-x-1">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <span>2. Merging Method</span>
                </span>
              </h4>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {joinTypes.map((t) => {
                  const isActive = config.joinType === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => onChangeConfig({ ...config, joinType: t.id })}
                      className={`p-1.5 rounded border text-left cursor-pointer transition-all flex flex-col justify-between h-[64px] ${
                        isActive ? t.activeColor : t.color
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-800 truncate">{t.id.toUpperCase()}</span>
                          {isActive && (
                            <div className="w-3 h-3 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                              <Check className="h-2 w-2 stroke-3" />
                            </div>
                          )}
                        </div>
                        <p className="text-[8px] text-slate-400 leading-tight line-clamp-2 mt-0.5">{t.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column customizer button */}
            <div className="border-t border-slate-200/60 pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[10px] text-slate-600 hover:text-indigo-600 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Columns className="h-3.5 w-3.5" />
                <span>Columns ({showAdvanced ? "Hide" : "Show"})</span>
              </button>

              <button
                onClick={onRunMerge}
                disabled={!config.columnA || !config.columnB}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow-sm transition-all flex items-center space-x-1 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>EXECUTE MERGE</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Drawer: Column Picker Checkboxes */}
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-slate-100 pt-3 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-[10px] font-bold text-slate-700 flex items-center space-x-1">
                <Columns className="h-3.5 w-3.5 text-indigo-500" />
                <span>Keep Columns</span>
              </h4>
              <p className="text-[8px] text-slate-400 mt-0.5">Clashing headers get _A / _B suffixes.</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Sheet A Columns Checkboxes */}
            <div className="bg-slate-50/50 p-2 rounded border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 mb-1.5">
                <span className="text-[10px] font-semibold text-slate-600">Sheet A ({fileA.headers.length})</span>
                <div className="flex space-x-1.5 text-[9px]">
                  <button onClick={selectAllA} className="text-indigo-600 hover:underline font-medium cursor-pointer">All</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={deselectAllA} className="text-slate-500 hover:underline font-medium cursor-pointer">Clear</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {fileA.headers.map((h) => {
                  const isKey = h === config.columnA;
                  const isChecked = config.selectedColumnsA.includes(h);
                  return (
                    <label
                      key={h}
                      className={`flex items-center space-x-1.5 text-[10px] p-1 rounded border transition-all cursor-pointer ${
                        isKey 
                          ? "bg-amber-50/50 border-amber-100 text-amber-800" 
                          : isChecked 
                            ? "bg-white border-indigo-100 text-slate-700 font-medium" 
                            : "bg-white border-slate-200 text-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked || isKey}
                        disabled={isKey}
                        onChange={() => toggleColumnA(h)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer h-3 w-3"
                      />
                      <span className="truncate" title={h}>
                        {isKey ? "🔑 " : ""}{h}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Sheet B Columns Checkboxes */}
            <div className="bg-slate-50/50 p-2 rounded border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 mb-1.5">
                <span className="text-[10px] font-semibold text-slate-600">Sheet B ({fileB.headers.length})</span>
                <div className="flex space-x-1.5 text-[9px]">
                  <button onClick={selectAllB} className="text-indigo-600 hover:underline font-medium cursor-pointer">All</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={deselectAllB} className="text-slate-500 hover:underline font-medium cursor-pointer">Clear</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {fileB.headers.map((h) => {
                  const isKey = h === config.columnB;
                  const isChecked = config.selectedColumnsB.includes(h);
                  return (
                    <label
                      key={h}
                      className={`flex items-center space-x-1.5 text-[10px] p-1 rounded border transition-all cursor-pointer ${
                        isKey 
                          ? "bg-amber-50/50 border-amber-100 text-amber-800" 
                          : isChecked 
                            ? "bg-white border-indigo-100 text-slate-700 font-medium" 
                            : "bg-white border-slate-200 text-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked || isKey}
                        disabled={isKey}
                        onChange={() => toggleColumnB(h)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer h-3 w-3"
                      />
                      <span className="truncate" title={h}>
                        {isKey ? "🔑 " : ""}{h}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Data Merger & Analyzer - Client Application Component
import React, { useState, useEffect, useMemo } from "react";
import { FileState, MergeConfig, MergeResult } from "./types";
import { mergeDatasets } from "./utils/dataEngine";
import FileUploader from "./components/FileUploader";
import MergeConfigurator from "./components/MergeConfigurator";
import StatsDashboard from "./components/StatsDashboard";
import DiscrepancyPanel from "./components/DiscrepancyPanel";
import DataPreviewTable from "./components/DataPreviewTable";
import { Database, Sparkles, RefreshCw, Layers, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [fileA, setFileA] = useState<FileState | null>(null);
  const [fileB, setFileB] = useState<FileState | null>(null);

  const [mergeConfig, setMergeConfig] = useState<MergeConfig>({
    columnA: "",
    columnB: "",
    joinType: "outer", // Keeps everyone by default to track sources
    caseSensitive: false,
    trimWhitespace: true,
    cleanKeys: true,
    selectedColumnsA: [],
    selectedColumnsB: [],
  });

  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [selectedConflictKey, setSelectedConflictKey] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"merged" | "sheetA" | "sheetB">("merged");
  const [resolvedConflicts, setResolvedConflicts] = useState<Record<string, "A" | "B">>({});

  const handleResolveConflict = (key: string, column: string, choice: "A" | "B" | null) => {
    const conflictId = `${key}::${column}`;
    setResolvedConflicts((prev) => {
      const copy = { ...prev };
      if (choice === null) {
        delete copy[conflictId];
      } else {
        copy[conflictId] = choice;
      }
      return copy;
    });
  };

  // Set default active tab based on available files
  useEffect(() => {
    if (fileA && fileB) {
      setActiveTab("merged");
    } else if (fileA) {
      setActiveTab("sheetA");
    } else if (fileB) {
      setActiveTab("sheetB");
    }
  }, [fileA === null, fileB === null]);

  // Auto-run merge in background for instant responsiveness when config or files change
  useEffect(() => {
    if (
      fileA && 
      !fileA.isLoading && 
      fileA.headers.length > 0 && 
      fileB && 
      !fileB.isLoading && 
      fileB.headers.length > 0 && 
      mergeConfig.columnA && 
      mergeConfig.columnB
    ) {
      try {
        const result = mergeDatasets(fileA, fileB, mergeConfig);
        setMergeResult(result);
        setMergeSuccess(true);
      } catch (err) {
        console.error("Auto-merge error:", err);
      }
    } else {
      if (!fileA || !fileB) {
        setMergeResult(null);
        setMergeSuccess(false);
      }
    }
  }, [
    fileA,
    fileB,
    mergeConfig.columnA,
    mergeConfig.columnB,
    mergeConfig.joinType,
    mergeConfig.caseSensitive,
    mergeConfig.trimWhitespace,
    mergeConfig.cleanKeys,
    mergeConfig.selectedColumnsA,
    mergeConfig.selectedColumnsB
  ]);

  // Apply manual conflict resolution overrides
  const processedMergeResult = useMemo(() => {
    if (!mergeResult) return null;
    if (Object.keys(resolvedConflicts).length === 0) return mergeResult;

    const copiedData = mergeResult.data.map((row) => ({ ...row }));

    Object.entries(resolvedConflicts).forEach(([conflictId, choice]) => {
      const lastIndex = conflictId.lastIndexOf("::");
      if (lastIndex === -1) return;
      const key = conflictId.substring(0, lastIndex);
      const col = conflictId.substring(lastIndex + 2);

      const pkCol = mergeConfig.columnA;
      copiedData.forEach((row) => {
        if (String(row[pkCol]) === key) {
          const colA = `${col}_A`;
          const colB = `${col}_B`;
          if (row[colA] !== undefined && row[colB] !== undefined) {
            const resolvedVal = choice === "A" ? row[colA] : row[colB];
            row[colA] = resolvedVal;
            row[colB] = resolvedVal;
            // Store flags so preview table can style resolved cells nicely
            row[`_resolved_${col}`] = choice;
          }
        }
      });
    });

    return {
      ...mergeResult,
      data: copiedData,
    };
  }, [mergeResult, resolvedConflicts, mergeConfig.columnA]);

  // Construct temporary mergeResult views for individual sheet previews
  const mergeResultForA: MergeResult | null = fileA
    ? {
        headers: fileA.headers,
        data: fileA.data.map((row) => ({ ...row, Origin: "Only in Sheet A" })),
        stats: { total: fileA.rowCount, matched: 0, onlyA: fileA.rowCount, onlyB: 0 },
        discrepancies: [],
        originalFilenameA: fileA.name,
        originalFilenameB: "",
      }
    : null;

  const mergeResultForB: MergeResult | null = fileB
    ? {
        headers: fileB.headers,
        data: fileB.data.map((row) => ({ ...row, Origin: "Only in Sheet B" })),
        stats: { total: fileB.rowCount, matched: 0, onlyA: 0, onlyB: fileB.rowCount },
        discrepancies: [],
        originalFilenameA: "",
        originalFilenameB: fileB.name,
      }
    : null;

  // Auto-fill primary columns when files load
  useEffect(() => {
    if (fileA && fileA.headers.length > 0 && !mergeConfig.columnA) {
      // Find a likely ID column or take the first header
      const likelyId = fileA.headers.find(h => 
        h.toLowerCase() === "id" || 
        h.toLowerCase() === "email" || 
        h.toLowerCase() === "key" || 
        h.toLowerCase().includes("name")
      ) || fileA.headers[0];
      
      setMergeConfig(prev => ({
        ...prev,
        columnA: likelyId,
        selectedColumnsA: [...fileA.headers]
      }));
    }
  }, [fileA]);

  useEffect(() => {
    if (fileB && fileB.headers.length > 0 && !mergeConfig.columnB) {
      // Find a likely ID column or take the first header
      const likelyId = fileB.headers.find(h => 
        h.toLowerCase() === "id" || 
        h.toLowerCase() === "email" || 
        h.toLowerCase() === "key" || 
        h.toLowerCase().includes("name")
      ) || fileB.headers[0];
      
      setMergeConfig(prev => ({
        ...prev,
        columnB: likelyId,
        selectedColumnsB: [...fileB.headers]
      }));
    }
  }, [fileB]);

  // Handle resetting sheets
  const handleResetFile = (target: "A" | "B") => {
    if (target === "A") {
      setFileA(null);
      setMergeConfig(prev => ({ ...prev, columnA: "", selectedColumnsA: [] }));
    } else {
      setFileB(null);
      setMergeConfig(prev => ({ ...prev, columnB: "", selectedColumnsB: [] }));
    }
    setMergeResult(null);
    setSelectedConflictKey(null);
    setMergeSuccess(false);
    setResolvedConflicts({});
  };

  // Run matching merge
  const handleRunMerge = () => {
    if (!fileA || !fileB || !mergeConfig.columnA || !mergeConfig.columnB) return;

    setIsMerging(true);
    setMergeSuccess(false);

    // Simulate small computational delay for nice feedback
    setTimeout(() => {
      try {
        const result = mergeDatasets(fileA, fileB, mergeConfig);
        setMergeResult(result);
        setSelectedConflictKey(null);
        setMergeSuccess(true);
        setResolvedConflicts({});
        
        // Auto-scroll to results viewport
        setTimeout(() => {
          document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
        }, 150);
      } catch (err) {
        console.error("Merge error:", err);
      } finally {
        setIsMerging(false);
      }
    }, 450);
  };

  // Loads a realistic mock dataset to test-drive features instantly
  const handleLoadSampleData = () => {
    const sampleA: FileState = {
      name: "Customer_Directory_A.xlsx",
      headers: ["Email", "Full_Name", "Role", "Phone", "Last_Active"],
      data: [
        { Email: "bruce.wayne@wayne.co", Full_Name: "Bruce Wayne", Role: "Lead Developer", Phone: "+1 (123) 456-7890", Last_Active: "2026-07-01" },
        { Email: "john.smith@yahoo.com", Full_Name: "John Smith", Role: "UI Designer", Phone: "234-567-8901", Last_Active: "2026-07-05" },
        { Email: "sarah.connor@gmail.com", Full_Name: "Sarah Connor", Role: "Project PM", Phone: "345-678-9012", Last_Active: "2026-07-10" },
        { Email: "tony.stark@stark.com", Full_Name: "Tony Stark", Role: "CEO & Iron Man", Phone: "999-999-9999", Last_Active: "2026-07-14" },
        { Email: "steve.rogers@shield.gov", Full_Name: "Steve Rogers", Role: "Director", Phone: "111-222-3333", Last_Active: "2026-06-25" }
      ],
      rowCount: 5,
      isLoading: false,
    };

    const sampleB: FileState = {
      name: "CRM_Mailing_List_B.csv",
      headers: ["Email", "Phone", "Company", "Country", "Subscribed"],
      data: [
        { Email: "bruce.wayne@wayne.co", Phone: "1234567890", Company: "Stark Labs", Country: "USA", Subscribed: "Yes" },
        { Email: "john.smith@yahoo.com", Phone: "234-567-8901", Company: "Design Co", Country: "Canada", Subscribed: "Yes" },
        { Email: "sarah.connor@gmail.com", Phone: "345-678-9999", Company: "Cyberdyne Systems", Country: "USA", Subscribed: "No" }, // conflict on Phone value
        { Email: "bruce.banner@avengers.org", Phone: "555-444-3322", Company: "S.H.I.E.L.D.", Country: "Global", Subscribed: "Yes" }, // Only in B
        { Email: "natasha.romanoff@shield.gov", Phone: "444-555-6666", Company: "KGB Intel", Country: "Russia", Subscribed: "No" } // Only in B
      ],
      rowCount: 5,
      isLoading: false,
    };

    setFileA(sampleA);
    setFileB(sampleB);
    
    setMergeConfig({
      columnA: "Email",
      columnB: "Email",
      joinType: "outer",
      caseSensitive: false,
      trimWhitespace: true,
      cleanKeys: true,
      selectedColumnsA: ["Email", "Full_Name", "Role", "Phone", "Last_Active"],
      selectedColumnsB: ["Email", "Phone", "Company", "Country", "Subscribed"]
    });

    setMergeResult(null);
    setSelectedConflictKey(null);
    setMergeSuccess(false);
    setResolvedConflicts({});
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col" id="root-layout">
      {/* Dynamic Grid Background Panel */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-600 text-white rounded">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-bold text-slate-950 text-xs tracking-tight">Data Merger & Analyzer</h1>
              <p className="text-[10px] text-slate-400 font-semibold">Match lists, analyze overlaps, and reconcile differences locally.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Seed Demo Button */}
            <button
              onClick={handleLoadSampleData}
              className="px-2.5 py-1 border border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 text-indigo-700 rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer hover:bg-indigo-50/50 transition-all"
            >
              <Sparkles className="h-3 w-3" />
              <span>Load Demo Sheets</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl w-full mx-auto px-4 py-4 flex-1 flex flex-col">
        {/* Initial Empty State Helper */}
        {!fileA && !fileB ? (
          <div className="my-auto py-12 bg-white border border-slate-200 rounded-lg max-w-md w-full mx-auto flex flex-col items-center justify-center p-5 text-center space-y-3 shadow-xs">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-950 text-sm">Upload files to start merging</h2>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                Import two sheets or CSV lists, set relational keys, analyze overlaps, and export perfect spreadsheets.
              </p>
            </div>
            <button
              onClick={handleLoadSampleData}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              🚀 Explore with Demo Sheets
            </button>
          </div>
        ) : (
          /* High-Density Workstation Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Sidebar Pane: File slot lists & alignments */}
            <div className="lg:col-span-4 space-y-4 bg-white border border-slate-200 rounded-lg p-3">
              {/* Slot upload card */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dataset Slots</h3>
                <FileUploader
                  fileA={fileA}
                  fileB={fileB}
                  onFileALoaded={setFileA}
                  onFileBLoaded={setFileB}
                  onResetFile={handleResetFile}
                />
              </div>

              {/* Match rules configurator */}
              {fileA && !fileA.error && fileB && !fileB.error && (
                <div className="border-t border-slate-100 pt-3">
                  <MergeConfigurator
                    fileA={fileA}
                    fileB={fileB}
                    config={mergeConfig}
                    onChangeConfig={setMergeConfig}
                    onRunMerge={handleRunMerge}
                  />
                </div>
              )}
            </div>

            {/* Right Main Panel: Overlap diagrams, discrepancies & preview table */}
            <div className="lg:col-span-8 space-y-4">
              {/* Tabs selector */}
              <div className="flex border-b border-slate-200 bg-white p-1 rounded-lg space-x-1 shadow-xs">
                {fileA && fileB && (
                  <button
                    onClick={() => setActiveTab("merged")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                      activeTab === "merged"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>🤝 Merged Dataset</span>
                  </button>
                )}
                {fileA && (
                  <button
                    onClick={() => setActiveTab("sheetA")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                      activeTab === "sheetA"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="truncate max-w-[150px]">🟢 {fileA.name}</span>
                  </button>
                )}
                {fileB && (
                  <button
                    onClick={() => setActiveTab("sheetB")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                      activeTab === "sheetB"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span className="truncate max-w-[150px]">🔵 {fileB.name}</span>
                  </button>
                )}
              </div>

              {/* Merge Loader Overlay */}
              {isMerging && (
                <div className="flex flex-col items-center justify-center py-10 space-y-2 bg-white border border-slate-200 rounded-lg">
                  <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-600">Merging data sources and aligning columns...</p>
                </div>
              )}

              {/* Success Result Viewport */}
              <AnimatePresence mode="wait">
                {activeTab === "merged" && mergeSuccess && mergeResult && !isMerging && (
                  <motion.div
                    key="merged-view"
                    id="results-section"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 px-3 py-2 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="text-[10px] font-bold">
                        Datasets aligned via A.{mergeConfig.columnA} ↔ B.{mergeConfig.columnB} using a {mergeConfig.joinType} join!
                      </span>
                    </div>

                    {/* Bento Box Dashboard Metrics */}
                    <StatsDashboard
                      stats={mergeResult.stats}
                      discrepancies={mergeResult.discrepancies}
                      filenameA={fileA?.name || "Sheet A"}
                      filenameB={fileB?.name || "Sheet B"}
                      joinType={mergeConfig.joinType}
                    />

                    {/* Conflict List Resolver */}
                    {mergeResult.discrepancies.length > 0 && (
                      <DiscrepancyPanel
                        discrepancies={mergeResult.discrepancies}
                        filenameA={fileA?.name || "Sheet A"}
                        filenameB={fileB?.name || "Sheet B"}
                        onSelectConflict={setSelectedConflictKey}
                        selectedConflictKey={selectedConflictKey}
                        resolvedConflicts={resolvedConflicts}
                        onResolveConflict={handleResolveConflict}
                      />
                    )}

                    {/* Real-time preview spreadsheet */}
                    <DataPreviewTable
                      mergeResult={processedMergeResult!}
                      selectedConflictKey={selectedConflictKey}
                      onClearConflictFilter={() => setSelectedConflictKey(null)}
                    />
                  </motion.div>
                )}

                {activeTab === "sheetA" && mergeResultForA && (
                  <motion.div
                    key="sheeta-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-emerald-50/50 border border-emerald-100 text-emerald-800 px-3.5 py-2.5 rounded-lg">
                      <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        Sheet A Raw Data Preview
                      </p>
                      <p className="text-[10px] text-emerald-700/85 mt-0.5 font-medium">
                        Showing rows loaded from {fileA?.name}. Use the headers and record values to define your mapping keys.
                      </p>
                    </div>

                    <DataPreviewTable
                      mergeResult={mergeResultForA}
                      selectedConflictKey={null}
                      onClearConflictFilter={() => {}}
                    />
                  </motion.div>
                )}

                {activeTab === "sheetB" && mergeResultForB && (
                  <motion.div
                    key="sheetb-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-indigo-50/50 border border-indigo-100 text-indigo-800 px-3.5 py-2.5 rounded-lg">
                      <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                        Sheet B Raw Data Preview
                      </p>
                      <p className="text-[10px] text-indigo-700/85 mt-0.5 font-medium">
                        Showing rows loaded from {fileB?.name}. Use the headers and record values to define your mapping keys.
                      </p>
                    </div>

                    <DataPreviewTable
                      mergeResult={mergeResultForB}
                      selectedConflictKey={null}
                      onClearConflictFilter={() => {}}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Humble, clean footer */}
      <footer className="bg-white border-t border-slate-150 py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-400 font-medium">
          <p>© 2026 Data Merger & Analyzer. Local client processing.</p>
        </div>
      </footer>
    </div>
  );
}

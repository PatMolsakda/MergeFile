import React, { useState, useMemo } from "react";
import { MergeResult, DiscrepancyInfo } from "../types";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Download, FileSpreadsheet, FileJson, Layers } from "lucide-react";
import { exportToExcel, exportToCSV } from "../utils/dataEngine";

interface DataPreviewTableProps {
  mergeResult: MergeResult;
  selectedConflictKey: string | null;
  onClearConflictFilter: () => void;
}

export default function DataPreviewTable({
  mergeResult,
  selectedConflictKey,
  onClearConflictFilter,
}: DataPreviewTableProps) {
  const { headers, data, discrepancies, originalFilenameA, originalFilenameB } = mergeResult;

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [originFilter, setOriginFilter] = useState<"all" | "both" | "onlyA" | "onlyB">("all");
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | "none" }>({
    key: "",
    direction: "none",
  });

  // Reset to first page when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, originFilter, selectedConflictKey]);

  // Handle column header click for sorting
  const handleSort = (columnName: string) => {
    let direction: "asc" | "desc" | "none" = "asc";
    if (sortConfig.key === columnName) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = "none";
      }
    }
    setSortConfig({ key: columnName, direction });
  };

  // Helper: check if a specific key and column has a discrepancy
  const discrepancyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    discrepancies.forEach((d) => {
      const keyStr = String(d.key);
      if (!map.has(keyStr)) {
        map.set(keyStr, new Set());
      }
      map.get(keyStr)!.add(d.column);
      
      // Also add with suffix mappings to match final merged headers
      map.get(keyStr)!.add(`${d.column}_A`);
      map.get(keyStr)!.add(`${d.column}_B`);
    });
    return map;
  }, [discrepancies]);

  const hasCellDiscrepancy = (rowKeyVal: any, colName: string) => {
    const keyStr = String(rowKeyVal);
    const colSet = discrepancyMap.get(keyStr);
    return colSet ? colSet.has(colName) : false;
  };

  // 1. Process data: Apply Search, Origin filter, and Discrepancy selection
  const processedData = useMemo(() => {
    let result = [...data];

    // Case 1: If user clicked inspect on a specific discrepancy conflict key
    if (selectedConflictKey) {
      const primaryKeyCol = headers[0];
      result = result.filter((row) => String(row[primaryKeyCol]) === selectedConflictKey);
    }

    // Case 2: Origin Source Filtering
    if (originFilter !== "all") {
      result = result.filter((row) => {
        const origin = row["Origin"];
        if (originFilter === "both") return origin === "Merged (A & B)";
        if (originFilter === "onlyA") return origin === "Only in Sheet A";
        if (originFilter === "onlyB") return origin === "Only in Sheet B";
        return true;
      });
    }

    // Case 3: Fuzzy Searching across all values
    if (searchTerm.trim() !== "") {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(lowerSearch)
        )
      );
    }

    // Case 4: Sorting
    if (sortConfig.direction !== "none" && sortConfig.key) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const valA = a[key] === undefined ? "" : String(a[key]);
        const valB = b[key] === undefined ? "" : String(b[key]);
        
        // Try numeric sort first if applicable
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return direction === "asc" ? numA - numB : numB - numA;
        }

        return direction === "asc"
          ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: "base" })
          : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: "base" });
      });
    }

    return result;
  }, [data, selectedConflictKey, originFilter, searchTerm, sortConfig, headers]);

  // Pagination bounds
  const totalRows = processedData.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize]);

  // Export handlers
  const handleExportCSV = () => {
    const timeLabel = new Date().toISOString().slice(0, 10);
    exportToCSV(processedData, `merged_data_${timeLabel}`);
  };

  const handleExportExcel = () => {
    const timeLabel = new Date().toISOString().slice(0, 10);
    exportToExcel(processedData, `merged_data_${timeLabel}`);
  };

  const primaryKeyCol = headers[0];

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" id="preview-table-container">
      {/* Search and Filters Header */}
      <div className="p-3 border-b border-slate-150 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center space-x-1.5">
          <Layers className="h-4 w-4 text-indigo-600" />
          <div>
            <h3 className="font-bold text-slate-800 text-xs">Data Sheet Preview</h3>
            <p className="text-[10px] text-slate-400">
              {totalRows.toLocaleString()} of {data.length.toLocaleString()} rows filtered
            </p>
          </div>
        </div>

        {/* Filters control bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Specific Key Lock Banner */}
          {selectedConflictKey && (
            <div className="flex items-center space-x-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded px-2 py-1 text-[10px] font-semibold">
              <span>Locked: <strong>{selectedConflictKey}</strong></span>
              <button
                onClick={onClearConflictFilter}
                className="hover:text-rose-600 underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-2 py-1 border border-slate-200 rounded text-[10px] bg-white focus:outline-hidden focus:border-indigo-500 w-36 md:w-44"
            />
          </div>

          {/* Origin filter dropdown */}
          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value as any)}
            className="text-[10px] px-2 py-1 border border-slate-200 rounded bg-white focus:outline-hidden focus:border-indigo-500 cursor-pointer text-slate-700 font-semibold"
          >
            <option value="all">🔍 All Records</option>
            <option value="both">🤝 Merged (A & B)</option>
            <option value="onlyA">🟢 Only Sheet A</option>
            <option value="onlyB">🔵 Only Sheet B</option>
          </select>

          {/* Page size dropdown */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-[10px] px-2 py-1 border border-slate-200 rounded bg-white focus:outline-hidden focus:border-indigo-500 cursor-pointer text-slate-700 font-semibold"
          >
            <option value={10}>10 rows</option>
            <option value={15}>15 rows</option>
            <option value={30}>30 rows</option>
            <option value={50}>50 rows</option>
          </select>

          {/* Export button group */}
          <div className="flex items-center border border-slate-200 rounded bg-white overflow-hidden text-[10px] font-bold">
            <button
              onClick={handleExportExcel}
              disabled={data.length === 0}
              className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-r border-slate-100 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Download Excel"
            >
              <FileSpreadsheet className="h-3 w-3" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={data.length === 0}
              className="flex items-center space-x-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Download CSV"
            >
              <Download className="h-3 w-3" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Spreadsheet viewport */}
      <div className="overflow-x-auto max-h-[380px]">
        {data.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center justify-center space-y-1.5">
            <Layers className="h-6 w-6 text-slate-300" />
            <p>No merged data loaded. Select files above and execute merge.</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center justify-center space-y-1">
            <p>No records match your filters or search keywords.</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setOriginFilter("all");
                if (onClearConflictFilter) onClearConflictFilter();
              }}
              className="text-indigo-600 hover:underline font-semibold cursor-pointer text-[11px]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700 sticky top-0 z-10 select-none">
                {/* Visual origin border header spacer */}
                <th className="w-1.5 p-0"></th>
                {headers.map((colName) => {
                  const isSorted = sortConfig.key === colName;
                  const sortDirection = sortConfig.direction;
                  
                  return (
                    <th
                      key={colName}
                      onClick={() => handleSort(colName)}
                      className="px-3 py-1.5 cursor-pointer hover:bg-slate-200/60 font-mono transition-colors whitespace-nowrap border-r border-slate-200/60"
                    >
                      <div className="flex items-center space-x-1">
                        <span className="font-bold text-[10px] text-slate-800">{colName}</span>
                        <ArrowUpDown className={`h-2.5 w-2.5 shrink-0 transition-colors ${
                          isSorted && sortDirection !== "none" ? "text-indigo-600" : "text-slate-400"
                        }`} />
                        {colName.endsWith("_A") && (
                          <span className="text-[8px] bg-emerald-50 text-emerald-700 px-1 rounded-sm uppercase tracking-wider font-bold">A</span>
                        )}
                        {colName.endsWith("_B") && (
                          <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1 rounded-sm uppercase tracking-wider font-bold">B</span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-mono">
              {paginatedData.map((row, rowIdx) => {
                const origin = row["Origin"];
                const keyVal = row[primaryKeyCol];

                // Design visually crisp origin indicators
                let borderTheme = "bg-slate-200";
                let rowBgTheme = "bg-white hover:bg-slate-50/50";
                
                if (origin === "Only in Sheet A") {
                  borderTheme = "bg-emerald-500";
                  rowBgTheme = "bg-emerald-50/10 hover:bg-emerald-50/20";
                } else if (origin === "Only in Sheet B") {
                  borderTheme = "bg-indigo-500";
                  rowBgTheme = "bg-indigo-50/10 hover:bg-indigo-50/20";
                } else if (origin === "Merged (A & B)") {
                  borderTheme = "bg-slate-550 bg-slate-500";
                  rowBgTheme = "bg-white hover:bg-slate-50";
                }

                return (
                  <tr key={rowIdx} className={`transition-colors ${rowBgTheme}`}>
                    {/* Tiny Left Border Color Strip */}
                    <td className={`w-1.5 p-0 ${borderTheme}`}></td>
                    
                    {headers.map((colName) => {
                      const cellVal = row[colName];
                      
                      let isResolved = false;
                      let resolvedChoice: "A" | "B" | null = null;
                      if (colName.endsWith("_A") || colName.endsWith("_B")) {
                        const baseColName = colName.substring(0, colName.length - 2);
                        if (row[`_resolved_${baseColName}`]) {
                          isResolved = true;
                          resolvedChoice = row[`_resolved_${baseColName}`];
                        }
                      }
                      
                      const isDiscrepancy = colName !== "Origin" && hasCellDiscrepancy(keyVal, colName) && !isResolved;

                      return (
                        <td
                          key={colName}
                          className={`px-3 py-1.5 border-r border-slate-150 truncate max-w-[150px] text-[10px] text-slate-700 leading-tight ${
                            isDiscrepancy 
                              ? "bg-amber-100/40 text-amber-900 font-semibold ring-1 ring-amber-200/60 ring-inset" 
                              : isResolved
                                ? "bg-emerald-50/60 text-slate-800 ring-1 ring-emerald-200/40 ring-inset"
                                : ""
                          }`}
                          title={cellVal === undefined ? "" : String(cellVal)}
                        >
                          {colName === "Origin" ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase font-sans ${
                              origin === "Merged (A & B)"
                                ? "bg-slate-100 text-slate-800 border border-slate-200"
                                : origin === "Only in Sheet A"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                  : "bg-indigo-50 text-indigo-800 border border-indigo-100"
                            }`}>
                              {origin}
                            </span>
                          ) : cellVal === undefined || cellVal === "" ? (
                            <span className="text-[9px] text-slate-300 italic">n/a</span>
                          ) : (
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={isResolved ? "font-semibold text-emerald-950" : ""}>{String(cellVal)}</span>
                              {isResolved && (
                                <span className="text-[7px] font-sans bg-emerald-100 text-emerald-800 border border-emerald-200 px-1 rounded-sm uppercase tracking-wider font-bold shrink-0">
                                  Kept {resolvedChoice}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {data.length > 0 && (
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[10px] font-medium text-slate-600">
          <div>
            Showing <span className="text-slate-800 font-bold font-mono">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="text-slate-800 font-bold font-mono">
              {Math.min(currentPage * pageSize, totalRows)}
            </span>{" "}
            of <span className="text-slate-800 font-bold font-mono">{totalRows.toLocaleString()}</span> entries
          </div>

          <div className="flex items-center justify-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Render a limited subset of page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Center the active page if we have many pages
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 3 + i;
                if (pageNum + (4 - i) > totalPages) {
                  pageNum = totalPages - 4 + i;
                }
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-2.5 py-1 rounded border text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

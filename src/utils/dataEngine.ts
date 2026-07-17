import Papa from "papaparse";
import * as XLSX from "xlsx";
import { FileState, MergeConfig, MergeResult, DiscrepancyInfo, MergeStats } from "../types";

/**
 * Parses a local file (CSV or Excel) into headers and JSON data rows.
 */
export function parseLocalFile(file: File): Promise<{ headers: string[]; data: Record<string, any>[] }> {
  return new Promise((resolve, reject) => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "xlsx" || extension === "xls") {
      // Parse Excel
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            throw new Error("The Excel file has no worksheets.");
          }
          const worksheet = workbook.Sheets[firstSheetName];
          // Get JSON
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, any>[];
          
          // Compute all headers across all rows to be safe
          const headersSet = new Set<string>();
          rawRows.forEach((row) => {
            Object.keys(row).forEach((k) => headersSet.add(k));
          });
          const headers = Array.from(headersSet);

          resolve({ headers, data: rawRows });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsArrayBuffer(file);
    } else {
      // Parse CSV (Default fallback)
      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy",
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            reject(new Error(results.errors[0].message));
          } else {
            resolve({
              headers: results.meta.fields || [],
              data: results.data as Record<string, any>[],
            });
          }
        },
        error: (error) => {
          reject(error);
        },
      });
    }
  });
}

/**
 * Normalizes a key according to smart matching options
 */
export function normalizeKey(
  val: any,
  options: { caseSensitive: boolean; trimWhitespace: boolean; cleanKeys: boolean }
): string {
  if (val === undefined || val === null) return "";
  let s = String(val);
  
  if (options.trimWhitespace) {
    s = s.trim();
  }
  if (!options.caseSensitive) {
    s = s.toLowerCase();
  }
  if (options.cleanKeys) {
    // Strip all non-alphanumeric characters (keeps only a-z, 0-9)
    // Helps match "allensak" with "(allen.sak)" or phone number variants
    s = s.replace(/[^a-zA-Z0-9]/g, "");
  }
  return s;
}

/**
 * Core Data Merge Engine
 * Performs relational joins on File A and File B using designated match keys.
 * Correctly handles duplicates (cartesian product of matching keys),
 * formats output columns, resolves name collisions, and lists discrepancies.
 */
export function mergeDatasets(
  fileA: FileState,
  fileB: FileState,
  config: MergeConfig
): MergeResult {
  const { columnA, columnB, joinType, caseSensitive, trimWhitespace, cleanKeys } = config;

  // 1. Resolve column headers & collisions
  // Identify overlapping columns between A and B (excluding the match keys)
  const overlappingCols: string[] = [];
  const bHeadersNormalized = fileB.headers.map(h => h.trim());
  
  fileA.headers.forEach((hA) => {
    const trimmedA = hA.trim();
    if (trimmedA !== columnA.trim()) {
      // If it exists in B and is not B's match key, it's overlapping
      const isOverlapping = bHeadersNormalized.some(
        (hB) => hB === trimmedA && hB !== columnB.trim()
      );
      if (isOverlapping) {
        overlappingCols.push(trimmedA);
      }
    }
  });

  // Decide headers in final table
  // The primary key column will be named based on columnA
  const primaryKeyHeader = columnA;
  
  // Columns unique to A or selected
  const aHeadersToKeep = config.selectedColumnsA.filter(h => h !== columnA);
  const bHeadersToKeep = config.selectedColumnsB.filter(h => h !== columnB);

  // We need to build final headers list
  // Colliding headers will be suffixed with _A and _B
  const finalHeadersMapA: Record<string, string> = {};
  const finalHeadersMapB: Record<string, string> = {};

  const finalHeaders: string[] = [primaryKeyHeader];

  // Map columns of A
  aHeadersToKeep.forEach((h) => {
    if (overlappingCols.includes(h)) {
      finalHeadersMapA[h] = `${h}_A`;
      finalHeaders.push(`${h}_A`);
    } else {
      finalHeadersMapA[h] = h;
      finalHeaders.push(h);
    }
  });

  // Map columns of B
  bHeadersToKeep.forEach((h) => {
    if (overlappingCols.includes(h)) {
      finalHeadersMapB[h] = `${h}_B`;
      finalHeaders.push(`${h}_B`);
    } else {
      // Prevent duplicates in finalHeaders if already added by some other path
      if (!finalHeaders.includes(h)) {
        finalHeadersMapB[h] = h;
        finalHeaders.push(h);
      } else {
        // If it got in here and was somehow overlapping but not listed, suffix it to be safe
        finalHeadersMapB[h] = `${h}_B`;
        finalHeaders.push(`${h}_B`);
      }
    }
  });

  // Add the Origin tracking column
  finalHeaders.push("Origin");

  // 2. Index datasets by key
  const indexA: Record<string, Record<string, any>[]> = {};
  const indexB: Record<string, Record<string, any>[]> = {};

  fileA.data.forEach((row) => {
    const rawVal = row[columnA];
    const normKey = normalizeKey(rawVal, { caseSensitive, trimWhitespace, cleanKeys });
    if (!indexA[normKey]) {
      indexA[normKey] = [];
    }
    indexA[normKey].push(row);
  });

  fileB.data.forEach((row) => {
    const rawVal = row[columnB];
    const normKey = normalizeKey(rawVal, { caseSensitive, trimWhitespace, cleanKeys });
    if (!indexB[normKey]) {
      indexB[normKey] = [];
    }
    indexB[normKey].push(row);
  });

  // 3. Determine set of keys based on join type
  const keysA = Object.keys(indexA);
  const keysB = Object.keys(indexB);
  let activeKeys: Set<string> = new Set();

  if (joinType === "left") {
    activeKeys = new Set(keysA);
  } else if (joinType === "right") {
    activeKeys = new Set(keysB);
  } else if (joinType === "inner") {
    // Intersection
    keysA.forEach((k) => {
      if (indexB[k]) activeKeys.add(k);
    });
  } else if (joinType === "outer") {
    // Union
    activeKeys = new Set([...keysA, ...keysB]);
  }

  // 4. Perform Join and Track Stats
  const mergedRows: Record<string, any>[] = [];
  const discrepancies: DiscrepancyInfo[] = [];

  let matchedKeysCount = 0;
  let onlyAKeysCount = 0;
  let onlyBKeysCount = 0;

  activeKeys.forEach((key) => {
    const rowsA = indexA[key];
    const rowsB = indexB[key];

    if (rowsA && rowsB) {
      matchedKeysCount++;
      // Cartesian product merge
      rowsA.forEach((rA, idxA) => {
        rowsB.forEach((rB, idxB) => {
          const mergedRow: Record<string, any> = {};
          
          // Match key value (prefer A, fallback to B)
          mergedRow[primaryKeyHeader] = rA[columnA] !== undefined ? rA[columnA] : rB[columnB];

          // Populate from A
          aHeadersToKeep.forEach((col) => {
            const finalColName = finalHeadersMapA[col];
            mergedRow[finalColName] = rA[col] !== undefined ? rA[col] : "";
          });

          // Populate from B
          bHeadersToKeep.forEach((col) => {
            const finalColName = finalHeadersMapB[col];
            // If it is already populated and not overlapping, we don't overwrite, but since it's unique or mapped, it works
            mergedRow[finalColName] = rB[col] !== undefined ? rB[col] : "";
          });

          // Set Origin
          mergedRow["Origin"] = "Merged (A & B)";

          // Discrepancy checks: find values in overlapping columns that don't match
          overlappingCols.forEach((col) => {
            const valA = rA[col];
            const valB = rB[col];
            
            // If both columns are kept, let's track discrepancy
            const keepsA = config.selectedColumnsA.includes(col);
            const keepsB = config.selectedColumnsB.includes(col);

            if (keepsA && keepsB && valA !== undefined && valB !== undefined) {
              const valAStr = String(valA).trim();
              const valBStr = String(valB).trim();
              
              const isDiff = caseSensitive 
                ? valAStr !== valBStr 
                : valAStr.toLowerCase() !== valBStr.toLowerCase();

              if (isDiff && valAStr !== "" && valBStr !== "") {
                discrepancies.push({
                  rowIdx: mergedRows.length,
                  key: String(mergedRow[primaryKeyHeader]),
                  column: col,
                  valA,
                  valB
                });
              }
            }
          });

          mergedRows.push(mergedRow);
        });
      });
    } else if (rowsA) {
      onlyAKeysCount++;
      // Key exists only in Sheet A
      rowsA.forEach((rA) => {
        const mergedRow: Record<string, any> = {};
        mergedRow[primaryKeyHeader] = rA[columnA];

        // Populate from A
        aHeadersToKeep.forEach((col) => {
          const finalColName = finalHeadersMapA[col];
          mergedRow[finalColName] = rA[col] !== undefined ? rA[col] : "";
        });

        // Fill B columns with blanks
        bHeadersToKeep.forEach((col) => {
          const finalColName = finalHeadersMapB[col] || col;
          mergedRow[finalColName] = "";
        });

        mergedRow["Origin"] = "Only in Sheet A";
        mergedRows.push(mergedRow);
      });
    } else if (rowsB) {
      onlyBKeysCount++;
      // Key exists only in Sheet B
      rowsB.forEach((rB) => {
        const mergedRow: Record<string, any> = {};
        mergedRow[primaryKeyHeader] = rB[columnB];

        // Fill A columns with blanks
        aHeadersToKeep.forEach((col) => {
          const finalColName = finalHeadersMapA[col] || col;
          mergedRow[finalColName] = "";
        });

        // Populate from B
        bHeadersToKeep.forEach((col) => {
          const finalColName = finalHeadersMapB[col];
          mergedRow[finalColName] = rB[col] !== undefined ? rB[col] : "";
        });

        mergedRow["Origin"] = "Only in Sheet B";
        mergedRows.push(mergedRow);
      });
    }
  });

  // Compile final summary stats
  const stats: MergeStats = {
    total: mergedRows.length,
    matched: matchedKeysCount,
    onlyA: onlyAKeysCount,
    onlyB: onlyBKeysCount
  };

  return {
    headers: finalHeaders,
    data: mergedRows,
    stats,
    discrepancies,
    originalFilenameA: fileA.name,
    originalFilenameB: fileB.name
  };
}

/**
 * Download functions for export formats
 */

function cleanExportData(data: any[]) {
  return data.map((row) => {
    const cleanRow: Record<string, any> = {};
    Object.keys(row).forEach((key) => {
      if (!key.startsWith("_")) {
        cleanRow[key] = row[key];
      }
    });
    return cleanRow;
  });
}

export function exportToExcel(data: any[], filename: string) {
  const cleaned = cleanExportData(data);
  const worksheet = XLSX.utils.json_to_sheet(cleaned);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Merged Data");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToCSV(data: any[], filename: string) {
  const cleaned = cleanExportData(data);
  const csv = Papa.unparse(cleaned);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

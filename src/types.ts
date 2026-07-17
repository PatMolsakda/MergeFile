export type OriginType = "both" | "left_only" | "right_only";

export interface FileState {
  name: string;
  headers: string[];
  data: Record<string, any>[];
  rowCount: number;
  isLoading: boolean;
  error?: string | null;
}

export interface MergeConfig {
  columnA: string;
  columnB: string;
  joinType: "inner" | "outer" | "left" | "right";
  caseSensitive: boolean;
  trimWhitespace: boolean;
  cleanKeys: boolean; // Ignore punctuation, spaces, and symbols for key matching
  selectedColumnsA: string[]; // Columns from Sheet A to keep
  selectedColumnsB: string[]; // Columns from Sheet B to keep
}

export interface MergeStats {
  total: number;
  matched: number;
  onlyA: number;
  onlyB: number;
}

export interface DiscrepancyInfo {
  rowIdx: number;
  key: string;
  column: string;
  valA: any;
  valB: any;
}

export interface MergeResult {
  headers: string[];
  data: Record<string, any>[];
  stats: MergeStats;
  discrepancies: DiscrepancyInfo[];
  originalFilenameA: string;
  originalFilenameB: string;
}

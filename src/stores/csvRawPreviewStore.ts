import { create } from 'zustand';
import type { RawFieldPair } from '@/types/extraction';

// UI-only handoff for csv-review.tsx -> csv-raw-preview.tsx. Rows already live in
// csv-review's local state; this just carries the slice the preview screen needs
// across the route boundary instead of re-serializing everything into URL params.
export interface CsvRawPreviewRow {
  id: string;
  merchant: string;
  amount: number;
  type: 'expense' | 'income';
  categoryLabel: string;
  categoryTone: 'resolved' | 'failed' | 'uncategorized';
  rawFields?: RawFieldPair[];
}

interface CsvRawPreviewState {
  rows: CsvRawPreviewRow[];
  setRows: (rows: CsvRawPreviewRow[]) => void;
  clear: () => void;
}

export const useCsvRawPreviewStore = create<CsvRawPreviewState>((set) => ({
  rows: [],
  setRows: (rows) => set({ rows }),
  clear: () => set({ rows: [] }),
}));

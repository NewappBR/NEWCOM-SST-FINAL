
import React from 'react';

export interface CellData {
  value: string;
  formula: string;
  computedValue: string;
  style?: React.CSSProperties;
}

export type GridData = Record<string, CellData>;

export interface AppState {
  grid: GridData;
  selectedCell: string | null;
  editingCell: string | null;
  rowCount: number;
  colCount: number;
}

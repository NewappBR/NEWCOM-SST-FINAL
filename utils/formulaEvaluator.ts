
import { GridData } from "../types";

export const evaluateFormula = (formula: string, grid: GridData): string => {
  if (!formula.startsWith('=')) return formula;

  const upperFormula = formula.toUpperCase().replace(/\s/g, '');
  
  const getVal = (cellRef: string) => {
    const cell = grid[cellRef];
    if (!cell) return 0;
    const val = parseFloat(cell.computedValue || cell.value);
    return isNaN(val) ? 0 : val;
  };

  const getRangeValues = (rangeStr: string): number[] => {
    const [start, end] = rangeStr.split(':');
    if (!end) return [getVal(start)];

    const startColMatch = start.match(/[A-Z]+/);
    const startRowMatch = start.match(/\d+/);
    const endColMatch = end.match(/[A-Z]+/);
    const endRowMatch = end.match(/\d+/);

    if (!startColMatch || !startRowMatch || !endColMatch || !endRowMatch) return [];

    const startCol = startColMatch[0];
    const startRow = parseInt(startRowMatch[0]);
    const endCol = endColMatch[0];
    const endRow = parseInt(endRowMatch[0]);

    const values: number[] = [];
    for (let c = startCol.charCodeAt(0); c <= endCol.charCodeAt(0); c++) {
      for (let r = startRow; r <= endRow; r++) {
        const cellId = String.fromCharCode(c) + r;
        values.push(getVal(cellId));
      }
    }
    return values;
  };

  try {
    // Funções (SUM, AVG, COUNT)
    if (upperFormula.startsWith('=SUM(')) {
      const range = upperFormula.match(/\((.*?)\)/)?.[1] || '';
      return getRangeValues(range).reduce((a, b) => a + b, 0).toString();
    }
    if (upperFormula.startsWith('=AVG(')) {
      const range = upperFormula.match(/\((.*?)\)/)?.[1] || '';
      const vals = getRangeValues(range);
      return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
    }

    // Operação simples A1-B1 (Saldo Atual)
    const subtractMatch = upperFormula.match(/^=([A-Z]+\d+)-([A-Z]+\d+)$/);
    if (subtractMatch) {
      const val1 = getVal(subtractMatch[1]);
      const val2 = getVal(subtractMatch[2]);
      return (val1 - val2).toString();
    }

    return "#ERRO!";
  } catch (e) {
    return "#ERRO!";
  }
};

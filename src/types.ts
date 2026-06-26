export interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string; // ISO string for persistence
}

export type Operation = '+' | '-' | '×' | '÷' | '^' | null;

export interface CalculatorState {
  displayValue: string;
  expression: string;
  isScientific: boolean;
  soundEnabled: boolean;
  history: HistoryItem[];
}

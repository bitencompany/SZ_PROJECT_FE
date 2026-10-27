export type Element = "목" | "화" | "토" | "금" | "수";
export interface Hanja {
  id: string;
  reading: string;
  character: string;
  meaning: string;
  strokes: number;
  element: Element | null;
  isBulyong: boolean | null;
}
export interface Fortune {
  title: string;
  fortune: string;
  description: string;
}
export interface NameGrid extends Fortune {
  label: string;
  period: string;
  total: number;
  number: number;
}
export interface NameResult {
  name: string;
  hanja: Hanja[];
  grids: NameGrid[];
  sounds: { syllable: string; element: Element | null }[];
  relations: string[];
}
export interface SazuResult {
  sample: boolean;
  pillars: { label: string; value: string | null }[];
  elements: { name: string; count: number }[];
}

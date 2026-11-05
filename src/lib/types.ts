import type { DetailedPillar, SazuDetails, ProviderData } from "./sazu-details";
export type Element = "목" | "화" | "토" | "금" | "수";
export interface Hanja {
  id: string;
  reading: string;
  character: string;
  meaning: string;
  meanings?: string[];
  meaningStatus?: "sourced" | "unavailable";
  meaningSource?: string | null;
  readingSource?: string;
  strokeBasis?: "written";
  searchAliases?: string[];
  strokes: number;
  element: Element | null;
  isBulyong: boolean | null;
  dictionaryStrokes: number | null;
  strokeReview: "unreviewed" | "reference-checked";
  strokeSources: {
    title: string;
    url: string;
    basis: "dictionary" | "naming-original";
  }[];
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
  analysisNotice?: string;
  name: string;
  hanja: (Hanja | null)[];
  grids: NameGrid[];
  sounds: { syllable: string; element: Element | null }[];
  relations: string[];
}
export interface SazuResult {
  sample: boolean;
  previewId?: string;
  expiresAt?: string;
  providerVersion?: string;
  strength?: { strength: string; analysis?: string };
  decadeFortune?: {
    direction: string;
    list: { startAge: number; full: string }[];
  };
  details?: SazuDetails;
  providerData?: ProviderData;
  pillars: ({
    label: string;
    value: string | null;
  } & Partial<DetailedPillar>)[];
  elements: { name: string; count: number }[];
}

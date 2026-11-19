// Domínio da Central de Inteligência de Buscas.
// Domínio de dados de mercado: sem indicadores fictícios ou geradores de demonstração.

export type Competition = "Baixa" | "Média" | "Alta" | "Indisponível" | string;

export interface Signal {
  id: string;
  uf: string;
  term: string;
  category: string;
  periodDays: number;
  growthPct: number | null;
  trendIndex: number | null;
  avgMonthlySearches: number | null;
  avgCpc: number | null;
  competition: Competition;
  source: "api";
}

export type SourceStatus = {
  google_ads: "limited_explorer" | "connected" | "disabled";
  google_trends: "pending_alpha" | "connected" | "disabled";
};

export const UF_NAMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export const UFS = Object.keys(UF_NAMES).sort((a, b) =>
  (UF_NAMES[a] ?? "").localeCompare(UF_NAMES[b] ?? "", "pt-BR"),
);

export const REGION: Record<string, string> = {
  AC: "Norte",
  AM: "Norte",
  AP: "Norte",
  PA: "Norte",
  RO: "Norte",
  RR: "Norte",
  TO: "Norte",
  AL: "Nordeste",
  BA: "Nordeste",
  CE: "Nordeste",
  MA: "Nordeste",
  PB: "Nordeste",
  PE: "Nordeste",
  PI: "Nordeste",
  RN: "Nordeste",
  SE: "Nordeste",
  DF: "Centro-Oeste",
  GO: "Centro-Oeste",
  MT: "Centro-Oeste",
  MS: "Centro-Oeste",
  ES: "Sudeste",
  MG: "Sudeste",
  RJ: "Sudeste",
  SP: "Sudeste",
  PR: "Sul",
  RS: "Sul",
  SC: "Sul",
};

export const REGION_BASE: Record<string, string> = {
  Norte: "#C8ACFA",
  Nordeste: "#A477F5",
  "Centro-Oeste": "#7B42D1",
  Sudeste: "#1E1238",
  Sul: "#4E2582",
};

export const CATEGORIES = [
  "Renda Fixa",
  "Fundos e Bolsa",
  "Agro",
  "Cripto",
  "Educação",
  "Assessoria",
];

/** Valida e normaliza uma linha recebida do backend; descarta valores fora de faixa. */
export function normalizeAPIRow(s: unknown): Signal | null {
  if (!s || typeof s !== "object") return null;
  const r = s as Record<string, unknown>;
  const st = String(r["uf"] || "").toUpperCase();
  const term = String(r["term"] || "").trim();
  const cat = String(r["category"] || "").trim();
  const p = Number(r["periodDays"]);
  if (!UF_NAMES[st] || !term || term.length > 140 || !cat || ![7, 30, 90].includes(p)) return null;
  const numeric = (v: unknown, min: number, max: number) =>
    v === null || v === undefined || v === ""
      ? null
      : Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max
        ? Number(v)
        : null;
  return {
    id: `api-${st}-${term}-${p}`,
    uf: st,
    term,
    category: cat,
    periodDays: p,
    growthPct: numeric(r["growthPct"], -100, 1e6),
    trendIndex: numeric(r["trendIndex"], 0, 100),
    avgMonthlySearches: numeric(r["avgMonthlySearches"], 0, 1e10),
    avgCpc: numeric(r["avgCpc"], 0, 1e6),
    competition: String(r["competition"] || "Indisponível").slice(0, 28),
    source: "api",
  };
}

export const fmtNum = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
export const fmtMoney = (n: number | null | undefined) =>
  n == null
    ? "Indisponível"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
export const fmtGrowth = (n: number | null | undefined) =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${fmtNum(n)}%`;
export const norm = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export type SortKey = "growth" | "volume" | "cpc";
export const sortField = (k: SortKey): keyof Signal =>
  k === "volume" ? "avgMonthlySearches" : k === "cpc" ? "avgCpc" : "growthPct";
export const sorter = (key: keyof Signal) => (a: Signal, b: Signal) =>
  ((b[key] as number | null) ?? -Infinity) - ((a[key] as number | null) ?? -Infinity);

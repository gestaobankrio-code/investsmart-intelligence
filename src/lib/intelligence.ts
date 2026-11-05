// Domínio da Central de Inteligência de Buscas.
// DADOS DE EXEMPLO: os sinais "demo" NÃO representam dados reais do Google.

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
  source: "demo" | "api";
}

export type SourceStatus = {
  google_ads: "limited_explorer" | "connected" | "disabled";
  google_trends: "pending_alpha" | "connected" | "disabled";
};

export const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso",
  MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina",
  SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

export const UFS = Object.keys(UF_NAMES).sort((a, b) =>
  (UF_NAMES[a] ?? "").localeCompare(UF_NAMES[b] ?? "", "pt-BR"),
);

export const REGION: Record<string, string> = {
  AC: "Norte", AM: "Norte", AP: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste", PE: "Nordeste",
  PI: "Nordeste", RN: "Nordeste", SE: "Nordeste", DF: "Centro-Oeste", GO: "Centro-Oeste",
  MT: "Centro-Oeste", MS: "Centro-Oeste", ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste",
  SP: "Sudeste", PR: "Sul", RS: "Sul", SC: "Sul",
};

export const REGION_BASE: Record<string, string> = {
  Norte: "#C8ACFA", Nordeste: "#A477F5", "Centro-Oeste": "#7B42D1", Sudeste: "#1E1238", Sul: "#4E2582",
};

export const CATEGORIES = ["Renda Fixa", "Fundos e Bolsa", "Agro", "Cripto", "Educação", "Assessoria"];

const TOPICS = [
  { category: "Renda Fixa", term: "quanto rende CDB", vol: 6400, cpc: 2.94 },
  { category: "Renda Fixa", term: "Tesouro Selic", vol: 9200, cpc: 2.18 },
  { category: "Renda Fixa", term: "Tesouro IPCA", vol: 5000, cpc: 2.78 },
  { category: "Fundos e Bolsa", term: "fundos imobiliários", vol: 4700, cpc: 3.32 },
  { category: "Fundos e Bolsa", term: "dividendos", vol: 5200, cpc: 3.86 },
  { category: "Agro", term: "FIAGRO rentabilidade", vol: 2200, cpc: 4.28 },
  { category: "Agro", term: "CRA investimentos", vol: 1700, cpc: 3.74 },
  { category: "Cripto", term: "comprar bitcoin", vol: 7800, cpc: 4.59 },
  { category: "Educação", term: "como começar a investir", vol: 8900, cpc: 2.15 },
  { category: "Assessoria", term: "assessoria de investimentos", vol: 6100, cpc: 6.34 },
  { category: "Renda Fixa", term: "LCI LCA", vol: 3600, cpc: 2.82 },
  { category: "Educação", term: "investir com 100 reais", vol: 3200, cpc: 1.96 },
];

/** Dados demonstrativos determinísticos (sem aleatoriedade). */
function demoSignals(): Signal[] {
  const out: Signal[] = [];
  UFS.forEach((uf, i) => {
    const picks = [i % TOPICS.length, (i + 4) % TOPICS.length, (i + 8) % TOPICS.length, 0, 9];
    [...new Set(picks)].forEach((idx, j) => {
      const t = TOPICS[idx]!;
      const n = i * 47 + j * 31 + 13;
      out.push({
        id: `demo-${uf}-${idx}`,
        uf,
        term: t.term,
        category: t.category,
        growthPct: Math.round(26 + ((n * 13) % 238)),
        trendIndex: Math.max(20, Math.min(99, 46 + ((n * 7) % 52))),
        avgMonthlySearches: Math.round((t.vol * (0.38 + ((i * 17) % 49) / 100) + j * 167) / 100) * 100,
        avgCpc: Number((t.cpc * (0.76 + (i % 8) * 0.07)).toFixed(2)),
        competition: ["Baixa", "Média", "Alta"][(i + j) % 3]!,
        periodDays: 30,
        source: "demo",
      });
    });
  });
  return out;
}

export const BASE_DEMO = demoSignals();

export function demoForPeriod(period: number): Signal[] {
  const mul = period === 7 ? 1.28 : period === 90 ? 0.67 : 1;
  return BASE_DEMO.map((s) => ({
    ...s,
    id: `${s.id}-${period}`,
    growthPct: s.growthPct == null ? null : Math.round(s.growthPct * mul),
    periodDays: period,
  }));
}

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
  n == null ? "Indisponível" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
export const fmtGrowth = (n: number | null | undefined) =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${fmtNum(n)}%`;
export const norm = (s: string) =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export type SortKey = "growth" | "volume" | "cpc";
export const sortField = (k: SortKey): keyof Signal =>
  k === "volume" ? "avgMonthlySearches" : k === "cpc" ? "avgCpc" : "growthPct";
export const sorter = (key: keyof Signal) => (a: Signal, b: Signal) =>
  ((b[key] as number | null) ?? -Infinity) - ((a[key] as number | null) ?? -Infinity);

// Conector somente leitura do feed público Google Trends (GitHub Pages).
// Sem credenciais, sem APIs Google no navegador: apenas leitura de dois JSON públicos.
import { UF_NAMES } from "./intelligence";

export const FEED_BASE = "https://gestaobankrio-code.github.io/investsmart-trends-feed/data";
export const FEED_URLS = { trends: `${FEED_BASE}/trends.json`, status: `${FEED_BASE}/status.json` };
export const POLL_MS = 30 * 60 * 1000;
export const STALE_DAYS = 14;

export interface TrendRecord {
  id: string;
  uf: string;
  term: string;
  source: string; // "Mais buscados" | "Em ascensão"
  week: string;
  sourceDate: string | null;
  indexNow: number | null;
  indexPrev: number | null;
  /** Variação em PONTOS de índice; null quando não há semana anterior. */
  deltaPts: number | null;
  rankTop25: number | null;
  /** Tendência informada pela fonte ou derivada apenas da variação em pontos. */
  trend: Trend;
}

export type Trend = "Em alta" | "Em queda" | "Estável" | "Sem comparação";
export const trendOf = (deltaPts: number | null, given?: unknown): Trend => {
  if (deltaPts == null) return "Sem comparação";
  const g = typeof given === "string" ? given.trim().toLowerCase() : "";
  if (g.includes("alta") || g.includes("subida")) return "Em alta";
  if (g.includes("queda")) return "Em queda";
  if (g.includes("est")) return "Estável";
  return deltaPts > 0 ? "Em alta" : deltaPts < 0 ? "Em queda" : "Estável";
};
/** Agrupa registros por UF (todas as 27, vazias incluídas, nunca preenchidas com zero). */
export function groupByUF(records: TrendRecord[], ufs: string[]): { uf: string; records: TrendRecord[] }[] {
  return ufs.map((uf) => ({ uf, records: records.filter((r) => r.uf === uf) }));
}

export interface TrendsFeed {
  records: TrendRecord[];
  terms: string[];
  weekStart: string | null;
  weekEnd: string | null;
  sourceDate: string | null;
  generatedAt: string | null;
  lastCheck: string | null;
  extraction: string | null;
  isStaticSample: boolean;
}

const idx = (v: unknown): number | null =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null
    : Number(v) >= 0 && Number(v) <= 100 ? Number(v) : null;
const isoDate = (v: unknown): string | null =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;

/** Valida o JSON do feed. Registros inválidos são descartados (nunca convertidos em zero). */
export function parseFeed(trends: unknown, status: unknown): TrendsFeed {
  if (!trends || typeof trends !== "object") throw new Error("trends.json inválido");
  const t = trends as Record<string, unknown>;
  const s = (status && typeof status === "object" ? status : {}) as Record<string, unknown>;
  if (t["status"] !== "ok") throw new Error(`Feed reporta status "${String(t["status"])}"`);
  if (!Array.isArray(t["registros"])) throw new Error("trends.json sem registros");
  const seen = new Set<string>();
  const records: TrendRecord[] = [];
  for (const raw of t["registros"] as unknown[]) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const uf = String(r["uf"] ?? "").toUpperCase();
    const term = String(r["termo"] ?? "").trim();
    if (!UF_NAMES[uf] || !term || term.length > 140) continue;
    const id = `${uf}|${term}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const now = idx(r["indiceAtual"]);
    const prev = idx(r["indiceAnterior"]);
    const deltaPts = now != null && prev != null ? now - prev : null;
    records.push({
      id, uf, term,
      source: String(r["fonte"] ?? "").replace("ascensao", "ascensão").slice(0, 40) || "—",
      week: isoDate(r["semana"]) ?? "",
      sourceDate: isoDate(r["dataFonte"]),
      indexNow: now,
      indexPrev: prev,
      deltaPts,
      rankTop25: Number.isInteger(r["rankNacionalTop25"]) ? (r["rankNacionalTop25"] as number) : null,
      trend: trendOf(deltaPts, r["tendencia"]),
    });
  }
  const dates = records.map((r) => r.sourceDate).filter(Boolean) as string[];
  const extraction = typeof t["origemExtracao"] === "string" ? t["origemExtracao"] : null;
  return {
    records,
    terms: [...new Set(records.map((r) => r.term))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    weekStart: isoDate(t["semanaInicio"]),
    weekEnd: isoDate(t["semanaFim"]),
    sourceDate: dates.sort().at(-1) ?? null,
    generatedAt: isoDate(t["geradoEm"]),
    lastCheck: isoDate(s["ultimaVerificacao"]),
    extraction,
    isStaticSample: extraction !== "bigquery_live" && extraction !== "bigquery",
  };
}

/** Dados com mais de 14 dias (pela data da fonte mais recente, ou fim da semana). */
export function isStale(feed: TrendsFeed, now = new Date()): boolean {
  const ref = feed.sourceDate ?? feed.weekEnd;
  if (!ref) return true;
  return now.getTime() - Date.parse(ref) > STALE_DAYS * 86400000;
}

export async function fetchFeed(): Promise<TrendsFeed> {
  // The same fresh read identifier is used for both files, bypassing stale CDN/browser entries.
  const revision = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const get = async (u: string) => {
    const url = new URL(u);
    url.searchParams.set("revalidate", revision);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${u.split("/").pop()}`);
    return res.json() as Promise<unknown>;
  };
  const [trends, status] = await Promise.all([get(FEED_URLS.trends), get(FEED_URLS.status)]);
  return parseFeed(trends, status);
}

export const fmtPts = (n: number | null) =>
  n == null ? "Sem comparação" : `${n > 0 ? "+" : ""}${n} pts`;
export const fmtIdx = (n: number | null) => (n == null ? "Sem dados" : `${n}/100`);
export const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(new Date(iso)) : "—";
export const fmtDateTime = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso)) : "—";

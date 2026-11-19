// Conector somente leitura do feed público Google Trends (GitHub Pages).
// Sem credenciais, sem APIs Google no navegador: apenas leitura de dois JSON públicos.
import { UF_NAMES } from "./intelligence";

export const FEED_ORIGINS = [
  {
    name: "GitHub Pages",
    base: "https://gestaobankrio-code.github.io/investsmart-trends-feed/data",
  },
  {
    name: "GitHub Raw",
    base: "https://raw.githubusercontent.com/gestaobankrio-code/investsmart-trends-feed/main/docs/data",
  },
] as const;

export const FEED_BASE = FEED_ORIGINS[0].base;
export const FEED_URLS = { trends: `${FEED_BASE}/trends.json`, status: `${FEED_BASE}/status.json` };
export const POLL_MS = 30 * 60 * 1000;
export const STALE_DAYS = 3;
export const FEED_TIMEOUT_MS = 8_000;

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

/** Temperatura da EVOLUÇÃO, não do volume absoluto nem de oportunidade comercial. */
export type HeatLevel = "Quente" | "Morno" | "Frio" | "Sem comparação";

export function heatOfDelta(deltaPts: number | null): HeatLevel {
  if (deltaPts == null || !Number.isFinite(deltaPts)) return "Sem comparação";
  return deltaPts > 0 ? "Quente" : deltaPts < 0 ? "Frio" : "Morno";
}

export function heatOfRegionalSummary(summary: {
  risingUFs: number;
  fallingUFs: number;
  stableUFs: number;
}): HeatLevel | "Misto" {
  const { risingUFs, fallingUFs, stableUFs } = summary;
  if (risingUFs + fallingUFs + stableUFs === 0) return "Sem comparação";
  if (risingUFs > fallingUFs + stableUFs) return "Quente";
  if (fallingUFs > risingUFs + stableUFs) return "Frio";
  if (stableUFs > risingUFs + fallingUFs) return "Morno";
  return "Misto";
}

export interface NationalTermSummary {
  term: string;
  source: string;
  ufs: number;
  risingUFs: number;
  fallingUFs: number;
  stableUFs: number;
  unknownUFs: number;
  latestDate: string | null;
  records: TrendRecord[];
}

/** O termo nacional é exibido UMA VEZ; as UFs são apenas séries daquele termo. */
export function summarizeNationalTerms(rows: TrendRecord[]): NationalTermSummary[] {
  const grouped = new Map<string, TrendRecord[]>();
  for (const record of rows) {
    const previous = grouped.get(record.term) ?? [];
    previous.push(record);
    grouped.set(record.term, previous);
  }
  return [...grouped.entries()]
    .map(([term, records]) => ({
      term,
      source: records[0]?.source ?? "—",
      ufs: new Set(records.map((r) => r.uf)).size,
      risingUFs: records.filter((r) => r.trend === "Em alta").length,
      fallingUFs: records.filter((r) => r.trend === "Em queda").length,
      stableUFs: records.filter((r) => r.trend === "Estável").length,
      unknownUFs: records.filter((r) => r.trend === "Sem comparação").length,
      latestDate:
        records
          .map((r) => r.sourceDate)
          .filter((v): v is string => Boolean(v))
          .sort()
          .at(-1) ?? null,
      records,
    }))
    .sort((a, b) => b.risingUFs - a.risingUFs || a.term.localeCompare(b.term, "pt-BR"));
}

/**
 * Seleciona os movimentos regionais que realmente diferem do comportamento do
 * MESMO termo, na MESMA semana, nas demais UFs disponíveis.
 * Não inventa palavras-chave estaduais, volumes ou métricas do Google Ads.
 */
export interface RegionalDifferential {
  record: TrendRecord;
  direction: "Acima da mediana" | "Abaixo da mediana";
  difference: number;
}

function median(numbers: number[]): number | null {
  if (!numbers.length) return null;
  const ordered = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[mid] : (ordered[mid - 1] + ordered[mid]) / 2;
}

export function regionalDifferentials(records: TrendRecord[], uf: string): RegionalDifferential[] {
  const weeklyByTerm = new Map<string, number[]>();
  for (const record of records) {
    if (record.deltaPts == null || !Number.isFinite(record.deltaPts) || !record.week) continue;
    const key = `${record.term}|${record.week}`;
    const list = weeklyByTerm.get(key) ?? [];
    list.push(record.deltaPts);
    weeklyByTerm.set(key, list);
  }
  return records
    .filter((record) => record.uf === uf && record.deltaPts != null && record.week)
    .flatMap((record) => {
      const sample = weeklyByTerm.get(`${record.term}|${record.week}`) ?? [];
      // Um único registro não permite afirmar que o estado se distingue dos demais.
      if (sample.length < 3) return [];
      const reference = median(sample);
      if (reference == null || record.deltaPts == null) return [];
      const difference = record.deltaPts - reference;
      if (difference === 0) return [];
      return [
        {
          record,
          direction:
            difference > 0 ? ("Acima da mediana" as const) : ("Abaixo da mediana" as const),
          difference,
        },
      ];
    })
    .sort(
      (a, b) =>
        Math.abs(b.difference) - Math.abs(a.difference) ||
        a.record.term.localeCompare(b.record.term, "pt-BR"),
    );
}

export const trendOf = (deltaPts: number | null, given?: unknown): Trend => {
  if (deltaPts == null) return "Sem comparação";
  const g = typeof given === "string" ? given.trim().toLowerCase() : "";
  if (g.includes("alta") || g.includes("subida")) return "Em alta";
  if (g.includes("queda")) return "Em queda";
  if (g.includes("est")) return "Estável";
  return deltaPts > 0 ? "Em alta" : deltaPts < 0 ? "Em queda" : "Estável";
};
/** Agrupa registros por UF (todas as 27, vazias incluídas, nunca preenchidas com zero). */
export function groupByUF(
  records: TrendRecord[],
  ufs: string[],
): { uf: string; records: TrendRecord[] }[] {
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
  discovery: string | null;
  classification: string | null;
  isStaticSample: boolean;
  origin: string | null;
}

const idx = (v: unknown): number | null =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v))
    ? null
    : Number(v) >= 0 && Number(v) <= 100
      ? Number(v)
      : null;
const isoDate = (v: unknown): string | null =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;

/** Valida o JSON do feed. Registros inválidos são descartados (nunca convertidos em zero). */
export function parseFeed(trends: unknown, status: unknown): TrendsFeed {
  if (!trends || typeof trends !== "object") throw new Error("trends.json inválido");
  const t = trends as Record<string, unknown>;
  const s = (status && typeof status === "object" ? status : {}) as Record<string, unknown>;
  if (t["status"] !== "ok") throw new Error(`Feed reporta status "${String(t["status"])}"`);
  // Quando o backend publica dados e status, ambos devem se referir ao
  // mesmo snapshot. Arquivos antigos (sem versão) continuam compatíveis.
  const trendVersion = t["versaoDados"];
  const statusVersion = s["versaoDados"];
  if (
    (trendVersion != null || statusVersion != null) &&
    (typeof trendVersion !== "string" ||
      typeof statusVersion !== "string" ||
      trendVersion !== statusVersion)
  ) {
    throw new Error("Feed inconsistente: versões de trends.json e status.json diferentes");
  }
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
      id,
      uf,
      term,
      source:
        String(r["fonte"] ?? "")
          .replace("ascensao", "ascensão")
          .slice(0, 40) || "—",
      week: isoDate(r["semana"]) ?? "",
      sourceDate: isoDate(r["dataFonte"]),
      indexNow: now,
      indexPrev: prev,
      deltaPts,
      rankTop25: Number.isInteger(r["rankNacionalTop25"])
        ? (r["rankNacionalTop25"] as number)
        : null,
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
    discovery: typeof t["descoberta"] === "string" ? t["descoberta"] : null,
    classification: typeof t["classificacao"] === "string" ? t["classificacao"] : null,
    isStaticSample: extraction !== "bigquery_live" && extraction !== "bigquery",
    origin: null,
  };
}

/** Idade da fonte no fim do dia UTC, com o limite de 3 dias do monitoramento. */
export function feedAgeDays(feed: TrendsFeed, now = new Date()): number | null {
  const ref = feed.sourceDate ?? feed.weekEnd;
  if (!ref) return null;
  const age = now.getTime() - Date.parse(`${ref.slice(0, 10)}T23:59:59Z`);
  return Number.isFinite(age) ? Math.max(0, Math.floor(age / 86400000)) : null;
}

export function isStale(feed: TrendsFeed, now = new Date()): boolean {
  const ageDays = feedAgeDays(feed, now);
  return ageDays == null || ageDays > STALE_DAYS;
}

export async function fetchFeed(): Promise<TrendsFeed> {
  // Cada leitura usa o mesmo identificador nos dois arquivos para evitar mistura de versões.
  const revision = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const failures: string[] = [];

  for (const origin of FEED_ORIGINS) {
    const get = async (file: "trends.json" | "status.json") => {
      const url = new URL(`${origin.base}/${file}`);
      url.searchParams.set("revalidate", revision);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

      try {
        const res = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} em ${file}`);
        return (await res.json()) as unknown;
      } finally {
        clearTimeout(timeout);
      }
    };

    try {
      const [trends, status] = await Promise.all([get("trends.json"), get("status.json")]);
      const parsed = parseFeed(trends, status);
      if (parsed.isStaticSample || parsed.extraction !== "bigquery_live") {
        throw new Error(
          "Origem de dados não verificada. A interface aceita apenas extração real do BigQuery.",
        );
      }
      if (
        parsed.discovery !== "termos_reais_com_classificacao_financeira" ||
        parsed.classification !== "regras_de_dominio_v1"
      ) {
        throw new Error("Feed rejeitado: classificação financeira ou procedência não verificadas");
      }
      if (!parsed.records.length) throw new Error("Feed real sem registros válidos");
      return { ...parsed, origin: origin.name };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${origin.name}: ${message}`);
    }
  }

  throw new Error(`Feed indisponível em todas as origens. ${failures.join(" | ")}`);
}

export const fmtPts = (n: number | null) =>
  n == null ? "Sem comparação" : `${n > 0 ? "+" : ""}${n} pts`;
export const fmtIdx = (n: number | null) => (n == null ? "Sem dados" : `${n}/100`);
export const fmtDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(
        new Date(iso),
      )
    : "—";
export const fmtDateTime = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(iso),
      )
    : "—";

// Feed separado: somente tendências efetivamente descobertas para cada UF.
// Nunca complementa estados sem resultados usando os termos nacionais do BigQuery.
import { UF_NAMES } from "./intelligence";
import { FEED_ORIGINS, FEED_TIMEOUT_MS, POLL_MS } from "./trends-feed";

export const STATE_POLL_MS = POLL_MS;

export interface StateTrendRecord {
  uf: string;
  term: string;
  source: "Google Trends Trending Now";
  publishedAt: string | null;
  sourceURL: string;
  geo: string;
}

export type StateCoverageStatus =
  | "com_termos_financeiros"
  | "sem_tendencia_financeira"
  | "sem_termos_financeiros_no_recorte"
  | "falha_consulta";
export interface StateCoverage {
  uf: string;
  status: StateCoverageStatus;
  records: number | null;
  checkedAt: string | null;
}

export interface StateTrendsFeed {
  records: StateTrendRecord[];
  coverage: StateCoverage[];
  generatedAt: string;
  withFinance: number;
  responded: number;
  origin: string | null;
  availability: "com_resultados" | "sem_termos_no_recorte";
}

const dateOrNull = (raw: unknown): string | null =>
  typeof raw === "string" && Number.isFinite(Date.parse(raw)) ? raw : null;

export function parseStateFeed(payload: unknown, stateStatus: unknown): StateTrendsFeed {
  if (!payload || typeof payload !== "object") throw new Error("Feed estadual inválido");
  const f = payload as Record<string, unknown>;
  const s = (stateStatus && typeof stateStatus === "object" ? stateStatus : {}) as Record<
    string,
    unknown
  >;
  if (!["ok", "parcial", "sem_dados_financeiros"].includes(String(f["status"]))) {
    throw new Error("Feed estadual sem status verificável");
  }
  if (
    f["origemExtracao"] !== "google_trends_rss_regional" ||
    f["escopoTermos"] !== "descoberta_estadual_por_geo"
  ) {
    throw new Error("Fonte não comprova descoberta estadual");
  }
  if (
    typeof f["versaoDados"] !== "string" ||
    !f["versaoDados"] ||
    f["versaoDados"] !== s["versaoDados"]
  ) {
    throw new Error("Arquivos estaduais não pertencem à mesma versão");
  }
  if (!Array.isArray(f["cobertura"]) || !Array.isArray(f["registros"])) {
    throw new Error("Feed estadual sem registros ou cobertura");
  }
  const coverage: StateCoverage[] = [];
  const covered = new Set<string>();
  for (const raw of f["cobertura"] as unknown[]) {
    if (!raw || typeof raw !== "object") throw new Error("Cobertura regional inválida");
    const c = raw as Record<string, unknown>;
    const uf = String(c["uf"] ?? "");
    const status = String(c["status"] ?? "") as StateCoverageStatus;
    if (
      !UF_NAMES[uf] ||
      covered.has(uf) ||
      ![
        "com_termos_financeiros",
        "sem_tendencia_financeira",
        "sem_termos_financeiros_no_recorte",
        "falha_consulta",
      ].includes(status)
    ) {
      throw new Error("Cobertura por UF inconsistente");
    }
    covered.add(uf);
    coverage.push({
      uf,
      status,
      records: typeof c["termosFinanceiros"] === "number" ? c["termosFinanceiros"] : null,
      checkedAt: dateOrNull(c["consultadoEm"]),
    });
  }
  if (covered.size !== 27) throw new Error("Feed não informa a situação das 27 UFs");
  const records: StateTrendRecord[] = [];
  const seen = new Set<string>();
  for (const raw of f["registros"] as unknown[]) {
    if (!raw || typeof raw !== "object") throw new Error("Termo estadual inválido");
    const r = raw as Record<string, unknown>;
    const uf = String(r["uf"] ?? "");
    const term = String(r["termo"] ?? "").trim();
    const geo = String(r["geoConsultado"] ?? "");
    const url = String(r["urlFonte"] ?? "");
    const key = uf + "|" + term.toLocaleLowerCase("pt-BR");
    if (
      !UF_NAMES[uf] ||
      !term ||
      term.length > 150 ||
      geo !== "BR-" + uf ||
      r["escopo"] !== "tendencia_descoberta_na_uf" ||
      r["fonte"] !== "Google Trends Trending Now" ||
      !url.startsWith("https://trends.google.com/") ||
      covered.has(uf) === false ||
      seen.has(key)
    ) {
      throw new Error("Termo sem comprovação de origem estadual");
    }
    seen.add(key);
    records.push({
      uf,
      term,
      geo,
      source: "Google Trends Trending Now",
      publishedAt: dateOrNull(r["dataFonte"]),
      sourceURL: url,
    });
  }
  if (f["totalRegistros"] !== records.length) throw new Error("Contagem estadual divergente");
  // Não aceitar 0 registros sob o status verde "ok".
  if (records.length === 0 && f["status"] === "ok") {
    throw new Error("Feed estadual declarou sucesso de dados sem tendências financeiras");
  }
  if (records.length > 0 && f["status"] === "sem_dados_financeiros") {
    throw new Error("Feed informa ausência de dados, mas contém tendências");
  }
  const generatedAt = dateOrNull(f["geradoEm"]);
  if (!generatedAt) throw new Error("Data de atualização estadual inválida");
  return {
    records,
    coverage,
    generatedAt,
    withFinance: coverage.filter((v) => v.status === "com_termos_financeiros").length,
    responded: coverage.filter((v) => v.status !== "falha_consulta").length,
    origin: null,
    availability: records.length ? "com_resultados" : "sem_termos_no_recorte",
  };
}

export function recordsForState(feed: StateTrendsFeed, uf: string): StateTrendRecord[] {
  return feed.records
    .filter((r) => r.uf === uf)
    .sort(
      (a, b) =>
        (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0) ||
        a.term.localeCompare(b.term, "pt-BR"),
    );
}

export async function fetchStateFeed(): Promise<StateTrendsFeed> {
  const revision = String(Date.now());
  const failures: string[] = [];
  for (const origin of FEED_ORIGINS) {
    const get = async (file: "state-trends.json" | "state-status.json") => {
      const url = new URL(origin.base + "/" + file);
      url.searchParams.set("revalidate", revision);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        return (await response.json()) as unknown;
      } finally {
        clearTimeout(timeout);
      }
    };
    try {
      const [feed, status] = await Promise.all([
        get("state-trends.json"),
        get("state-status.json"),
      ]);
      return { ...parseStateFeed(feed, status), origin: origin.name };
    } catch (error) {
      failures.push(origin.name + ": " + String(error instanceof Error ? error.message : error));
    }
  }
  throw new Error("Feed estadual indisponível. " + failures.join(" | "));
}

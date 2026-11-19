import { afterEach, describe, expect, it, vi } from "vitest";
import {
  feedAgeDays,
  fetchFeed,
  fmtPts,
  heatOfDelta,
  heatOfRegionalSummary,
  isStale,
  parseFeed,
  POLL_MS,
  regionalDifferentials,
  summarizeNationalTerms,
} from "@/lib/trends-feed";

const base = (registros: unknown[]) => ({
  status: "ok",
  semanaInicio: "2026-10-25",
  semanaFim: "2026-10-31",
  origemExtracao: "fixture_csv",
  descoberta: "termos_reais_com_classificacao_financeira",
  classificacao: "regras_de_dominio_v1",
  registros,
});
const rec = (o: object) => ({
  fonte: "Em ascensao",
  termo: "selic",
  uf: "SP",
  semana: "2026-10-25",
  dataFonte: "2026-10-30",
  indiceAnterior: 40,
  indiceAtual: 55,
  ...o,
});

describe("trends feed rules", () => {
  it("variation is in index points, not percent", () => {
    const f = parseFeed(base([rec({})]), {});
    expect(f.records[0]?.deltaPts).toBe(15);
    expect(fmtPts(15)).toBe("+15 pts");
  });
  it("temperature uses observed direction only, not search volume", () => {
    expect(heatOfDelta(12)).toBe("Quente");
    expect(heatOfDelta(0)).toBe("Morno");
    expect(heatOfDelta(-4)).toBe("Frio");
    expect(heatOfDelta(null)).toBe("Sem comparação");
  });
  it("national temperature distinguishes predominant signs and mixed regions", () => {
    expect(heatOfRegionalSummary({ risingUFs: 17, fallingUFs: 4, stableUFs: 3 })).toBe("Quente");
    expect(heatOfRegionalSummary({ risingUFs: 2, fallingUFs: 19, stableUFs: 0 })).toBe("Frio");
    expect(heatOfRegionalSummary({ risingUFs: 0, fallingUFs: 0, stableUFs: 5 })).toBe("Morno");
    expect(heatOfRegionalSummary({ risingUFs: 3, fallingUFs: 3, stableUFs: 0 })).toBe("Misto");
    expect(heatOfRegionalSummary({ risingUFs: 0, fallingUFs: 0, stableUFs: 0 })).toBe(
      "Sem comparação",
    );
  });
  it("null previous index means 'Sem comparação'", () => {
    const f = parseFeed(base([rec({ indiceAnterior: null })]), {});
    expect(f.records[0]?.deltaPts).toBeNull();
    expect(fmtPts(f.records[0]?.deltaPts ?? null)).toBe("Sem comparação");
  });
  it("missing UF is absent (no data), never zero", () => {
    const f = parseFeed(base([rec({}), rec({ uf: "XX" })]), {});
    expect(f.records.map((r) => r.uf)).toEqual(["SP"]);
  });
  it("data older than 3 days is stale (UTC end-of-source-day)", () => {
    const f = parseFeed(base([rec({})]), {});
    expect(feedAgeDays(f, new Date("2026-11-03T00:00:00Z"))).toBe(3);
    expect(isStale(f, new Date("2026-11-03T00:00:00Z"))).toBe(false);
    expect(isStale(f, new Date("2026-11-04T00:00:00Z"))).toBe(true);
  });
  it("rejects trends and status from different published snapshots", () => {
    const trends = { ...base([rec({})]), versaoDados: "a1" };
    expect(() => parseFeed(trends, { versaoDados: "b2" })).toThrow("versões");
    expect(() => parseFeed(trends, {})).toThrow("versões");
    expect(parseFeed(trends, { versaoDados: "a1" }).records).toHaveLength(1);
  });
  it("fixture extraction is flagged as static sample", () => {
    expect(parseFeed(base([rec({})]), {}).isStaticSample).toBe(true);
  });
  it("bigquery_live is real even if status.json says fixture", () => {
    const feed = parseFeed(
      { ...base([rec({})]), origemExtracao: "bigquery_live" },
      { origemExtracao: "fixture_csv" },
    );
    expect(feed.isStaticSample).toBe(false);
    expect(feed.extraction).toBe("bigquery_live");
  });
  it("status.json cannot relabel a static trends extraction as live", () => {
    expect(parseFeed(base([rec({})]), { origemExtracao: "bigquery_live" }).isStaticSample).toBe(
      true,
    );
  });
  it("preserves the reference week and original source date", () => {
    const feed = parseFeed(
      { ...base([rec({})]), origemExtracao: "bigquery_live" },
      { ultimaVerificacao: "2026-11-05T20:20:39.600Z" },
    );
    expect(feed.weekStart).toBe("2026-10-25");
    expect(feed.weekEnd).toBe("2026-10-31");
    expect(feed.sourceDate).toBe("2026-10-30");
  });
  it("rejects a feed whose status is not ok", () => {
    expect(() => parseFeed({ status: "error", registros: [] }, {})).toThrow();
  });
});

describe("public feed revalidation", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("revalidates every 30 minutes", () => expect(POLL_MS).toBe(1800000));
  it("uses no-store and a new shared identifier for each two-file read", async () => {
    const urls: URL[] = [];
    const options: RequestInit[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL, init: RequestInit) => {
        urls.push(url);
        options.push(init);
        return {
          ok: true,
          json: async () =>
            url.pathname.endsWith("trends.json")
              ? { ...base([rec({})]), origemExtracao: "bigquery_live" }
              : {},
        };
      }),
    );
    await fetchFeed();
    await fetchFeed();
    expect(urls).toHaveLength(4);
    expect(options.every((option) => option.cache === "no-store")).toBe(true);
    const identifiers = urls.map((url) => url.searchParams.get("revalidate"));
    expect(identifiers[0]).toBeTruthy();
    expect(identifiers[0]).toBe(identifiers[1]);
    expect(identifiers[2]).toBe(identifiers[3]);
    expect(identifiers[0]).not.toBe(identifiers[2]);
  });
  it("falls back to the raw GitHub origin when GitHub Pages fails", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | string) => {
        const url = String(input);
        urls.push(url);
        if (url.includes("github.io")) return { ok: false, status: 503 };
        return {
          ok: true,
          json: async () =>
            url.includes("trends.json")
              ? { ...base([rec({})]), origemExtracao: "bigquery_live" }
              : {},
        };
      }),
    );
    const feed = await fetchFeed();
    expect(feed.origin).toBe("GitHub Raw");
    expect(urls.some((url) => url.includes("raw.githubusercontent.com"))).toBe(true);
  });

  it("never renders fixture or unverified data returned by the feed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL) => ({
        ok: true,
        json: async () => (url.pathname.endsWith("trends.json") ? base([rec({})]) : {}),
      })),
    );
    await expect(fetchFeed()).rejects.toThrow("Feed indisponível em todas as origens");
  });
  it("rejects a live source that still uses preselected terms", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL) => ({
        ok: true,
        json: async () =>
          url.pathname.endsWith("trends.json")
            ? {
                ...base([rec({})]),
                origemExtracao: "bigquery_live",
                descoberta: "sem_termos_predefinidos",
              }
            : {},
      })),
    );
    await expect(fetchFeed()).rejects.toThrow("Feed rejeitado");
  });

  it("rejects an unverified feed without valid regional records", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL) => ({
        ok: true,
        json: async () =>
          url.pathname.endsWith("trends.json")
            ? { ...base([]), origemExtracao: "bigquery_live" }
            : {},
      })),
    );
    await expect(fetchFeed()).rejects.toThrow("sem registros válidos");
  });

  it("rejects failed reads instead of returning fictional records", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503 })),
    );
    await expect(fetchFeed()).rejects.toThrow("Feed indisponível em todas as origens");
  });
});

describe("V12.3 state grouping and trend", () => {
  it("trend comes from points; null previous is 'Sem comparação'", () => {
    const f = parseFeed(
      base([rec({}), rec({ uf: "RJ", indiceAnterior: null }), rec({ uf: "MG", indiceAtual: 40 })]),
      {},
    );
    expect(f.records.map((r) => r.trend)).toEqual(["Em alta", "Sem comparação", "Estável"]);
  });
  it("groups all requested UFs, leaving empty ones empty (no zero records)", async () => {
    const { groupByUF } = await import("@/lib/trends-feed");
    const f = parseFeed(base([rec({}), rec({ termo: "ibovespa" })]), {});
    const g = groupByUF(f.records, ["SP", "AC"]);
    expect(g[0]?.records.map((r) => r.term)).toEqual(["selic", "ibovespa"]);
    expect(g[1]?.records).toEqual([]);
  });
  it("groups a repeated national term into one unique topic", () => {
    const f = parseFeed(
      base([
        rec({ uf: "SP", termo: "selic", indiceAnterior: 30, indiceAtual: 55 }),
        rec({ uf: "RJ", termo: "selic", indiceAnterior: 80, indiceAtual: 20 }),
        rec({ uf: "MG", termo: "ibovespa" }),
      ]),
      {},
    );
    const summaries = summarizeNationalTerms(f.records);
    expect(summaries).toHaveLength(2);
    const selic = summaries.find((s) => s.term === "selic");
    expect(selic?.ufs).toBe(2);
    expect(selic?.risingUFs).toBe(1);
    expect(selic?.fallingUFs).toBe(1);
  });

  it("highlights different movements for MG, BA and AM from regional records only", () => {
    const feed = parseFeed(
      base([
        rec({ uf: "MG", termo: "bitcoin hoje", indiceAnterior: 17, indiceAtual: 22 }),
        rec({ uf: "BA", termo: "bitcoin hoje", indiceAnterior: 16, indiceAtual: 19 }),
        rec({ uf: "AM", termo: "bitcoin hoje", indiceAnterior: 9, indiceAtual: 9 }),
        rec({ uf: "MG", termo: "débito", indiceAnterior: 47, indiceAtual: 60 }),
        rec({ uf: "BA", termo: "débito", indiceAnterior: 61, indiceAtual: 75 }),
        rec({ uf: "AM", termo: "débito", indiceAnterior: 40, indiceAtual: 61 }),
        rec({ uf: "MG", termo: "bolsa de valores", indiceAnterior: 3, indiceAtual: 100 }),
        rec({ uf: "BA", termo: "bolsa de valores", indiceAnterior: 3, indiceAtual: 100 }),
        rec({ uf: "AM", termo: "bolsa de valores", indiceAnterior: 3, indiceAtual: 100 }),
      ]),
      {},
    );
    const mg = regionalDifferentials(feed.records, "MG");
    const ba = regionalDifferentials(feed.records, "BA");
    const am = regionalDifferentials(feed.records, "AM");
    expect(mg.map((row) => row.record.term)).toEqual(["bitcoin hoje", "débito"]);
    expect(ba.map((row) => row.record.term)).toEqual(["bitcoin hoje"]);
    expect(am.map((row) => row.record.term)).toEqual(["débito", "bitcoin hoje"]);
    expect(am[0]?.direction).toBe("Acima da mediana");
    expect(am[1]?.direction).toBe("Abaixo da mediana");
    expect([...mg, ...ba, ...am].some((row) => row.record.term === "bolsa de valores")).toBe(
      false,
    );
  });
  it("does not invent a regional difference without enough comparable states", () => {
    const f = parseFeed(base([rec({ uf: "SP" }), rec({ uf: "RJ" })]), {});
    expect(regionalDifferentials(f.records, "SP")).toEqual([]);
    expect(regionalDifferentials(f.records, "AC")).toEqual([]);
  });

  it("terms come only from the feed, never from a fixed list", () => {
    const f = parseFeed(base([rec({ termo: "termo qualquer" })]), {});
    expect(f.terms).toEqual(["termo qualquer"]);
  });
});

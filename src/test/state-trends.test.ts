import { describe, expect, it } from "vitest";
import { UFS } from "@/lib/intelligence";
import { parseStateFeed, recordsForState } from "@/lib/state-trends";

const coverage = UFS.map((uf) => ({
  uf,
  status: uf === "AM" ? "com_termos_financeiros" : "sem_tendencia_financeira",
  termosFinanceiros: uf === "AM" ? 1 : 0,
  consultadoEm: "2026-11-19T21:00:00Z",
}));
const records = [
  {
    uf: "AM",
    termo: "dolar hoje",
    fonte: "Google Trends Trending Now",
    escopo: "tendencia_descoberta_na_uf",
    geoConsultado: "BR-AM",
    dataFonte: "2026-11-19T11:40:00Z",
    urlFonte: "https://trends.google.com/trending/rss?geo=BR-AM",
  },
];
const fixture = () => ({
  schemaVersion: 1,
  status: "ok",
  versaoDados: "state123",
  origemExtracao: "google_trends_rss_regional",
  escopoTermos: "descoberta_estadual_por_geo",
  geradoEm: "2026-11-19T21:01:00Z",
  cobertura,
  totalRegistros: records.length,
  registros: records,
});
const status = { versaoDados: "state123" };

describe("estado por estado, sem resultados nacionais copiados", () => {
  it("apresenta somente termos capturados para a UF pesquisada", () => {
    const feed = parseStateFeed(fixture(), status);
    expect(recordsForState(feed, "AM").map((r) => r.term)).toEqual(["dolar hoje"]);
    expect(recordsForState(feed, "MG")).toEqual([]);
    expect(recordsForState(feed, "BA")).toEqual([]);
    expect(feed.withFinance).toBe(1);
    expect(feed.responded).toBe(27);
  });
  it("não aceita registrar termos de Amazonas como se fossem de Minas", () => {
    const invalid = fixture();
    invalid.registros[0] = { ...records[0], uf: "MG" };
    expect(() => parseStateFeed(invalid, status)).toThrow("Termo sem comprovação");
  });
  it("rejeita o feed nacional mesmo que possua 27 UFs", () => {
    const invalid = { ...fixture(), escopoTermos: "destaques_nacionais_com_series_por_uf" };
    expect(() => parseStateFeed(invalid, status)).toThrow("Fonte não comprova");
  });
  it("não mistura feeds publicados em versões diferentes", () => {
    expect(() => parseStateFeed(fixture(), { versaoDados: "outro" })).toThrow("mesma versão");
  });
  it("sem tendência financeira não é preenchido com termos nacionais", () => {
    const zero = { ...fixture(), registros: [], totalRegistros: 0 };
    expect(recordsForState(parseStateFeed(zero, status), "MG")).toEqual([]);
  });
});

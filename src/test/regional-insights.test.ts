import { describe, expect, it } from "vitest";
import { compareRegionalStates, groupRegionalTopics, stateTopics, topicKey } from "@/lib/regional-insights";
import type { StateTrendRecord } from "@/lib/state-trends";

const row = (term: string, uf: string, when = "2026-11-23T08:00:00Z"): StateTrendRecord => ({
  term,
  uf,
  geo: "BR-" + uf,
  source: "Google Trends Trending Now",
  sourceURL: "https://trends.google.com/trending?geo=BR-" + uf + "&hours=168",
  publishedAt: when,
});

describe("exploração e comparação de termos realmente encontrados por UF", () => {
  it("normaliza grafia sem criar assuntos de pesquisa", () => {
    expect(topicKey("  Dólar Hoje ")).toBe("dolar hoje");
    const terms = groupRegionalTopics([
      row("dólar hoje", "SP"),
      row("Dolar Hoje", "RJ"),
      row("Ibovespa", "SP"),
    ]);
    expect(terms).toHaveLength(2);
    const dolar = terms.find((term) => term.key === "dolar hoje");
    expect(dolar?.states).toEqual(["SP", "RJ"]);
    expect(dolar?.records.map((record) => record.uf)).toEqual(["SP", "RJ"]);
  });

  it("mantém a ocorrência mais recente quando um termo é repetido na própria UF", () => {
    const all = groupRegionalTopics([
      row("ibovespa", "MG", "2026-11-20T12:00:00Z"),
      row("Ibovespa", "MG", "2026-11-22T12:00:00Z"),
    ]);
    expect(all).toHaveLength(1);
    expect(all[0]?.records).toHaveLength(1);
    expect(all[0]?.latestAt).toBe("2026-11-22T12:00:00Z");
  });

  it("compara compartilhados e exclusivos somente dentro das UFs selecionadas", () => {
    const records = [
      row("dólar hoje", "SP"),
      row("dólar hoje", "RJ"),
      row("dólar hoje", "MG"),
      row("ibovespa", "SP"),
      row("selic", "RJ"),
      row("ações", "BA"),
    ];
    const two = compareRegionalStates(records, ["SP", "RJ"]);
    expect(two.ufs).toEqual(["SP", "RJ"]);
    expect(two.unionCount).toBe(3);
    expect(two.sharedAcrossAll).toBe(1);
    expect(two.exclusiveWithinSelection).toBe(2);
    const three = compareRegionalStates(records, ["SP", "RJ", "MG"]);
    expect(three.sharedAcrossAll).toBe(1);
    expect(three.unionCount).toBe(3);
    expect(three.exclusiveWithinSelection).toBe(2);
    expect(three.topics.some((topic) => topic.label === "ações")).toBe(false);
  });

  it("não preenche dados de uma UF com termos de outros estados", () => {
    const source = groupRegionalTopics([row("dólar", "SP"), row("bolsa de valores", "MG")]);
    expect(stateTopics(source, "RJ")).toEqual([]);
    expect(stateTopics(source, "SP").map((item) => item.label)).toEqual(["dólar"]);
    const comparison = compareRegionalStates([row("dólar", "SP")], ["SP", "RJ"]);
    expect(comparison.sharedAcrossAll).toBe(0);
    expect(comparison.exclusiveWithinSelection).toBe(1);
    expect(comparison.topics[0]?.states).toEqual(["SP"]);
  });
});

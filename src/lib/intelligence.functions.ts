import { createServerFn } from "@tanstack/react-start";
import type { SourceStatus } from "./intelligence";

/**
 * Atualização de fontes — roda somente no servidor.
 * Nenhuma credencial Google é lida ou exposta no navegador.
 *
 * Google Ads: acesso Explorer aprovado; KeywordPlanIdeaService exige nível BASIC (pendente).
 *   Por isso o adaptador NÃO chama o serviço de ideias de palavras-chave.
 * Google Trends: API Alpha solicitada, aprovação pendente. Adaptador desabilitado.
 * Orçamento: R$ 0,00 — nenhum serviço pago ou infraestrutura com cobrança é acionado.
 */

interface RefreshInput {
  periodDays: number;
  uf: string | null;
  category: string | null;
}

interface AdapterResult {
  signals: unknown[];
  status: string;
  message: string;
}

// Adaptador Google Ads (KeywordPlanIdeaService) — habilitar somente após aprovação BASIC.
const GOOGLE_ADS_KEYWORD_PLANNER_ENABLED = false;
async function googleAdsAdapter(_input: RefreshInput): Promise<AdapterResult> {
  if (!GOOGLE_ADS_KEYWORD_PLANNER_ENABLED) {
    return {
      signals: [],
      status: "limited_explorer",
      message: "Google Ads: nível Explorer. Volume, CPC e concorrência aguardam aprovação BASIC.",
    };
  }
  return { signals: [], status: "connected", message: "" };
}

// Adaptador Google Trends API (Alpha) — sem scraping, sem simulação de conexão.
const GOOGLE_TRENDS_ENABLED = false;
async function googleTrendsAdapter(_input: RefreshInput): Promise<AdapterResult> {
  if (!GOOGLE_TRENDS_ENABLED) {
    return {
      signals: [],
      status: "pending_alpha",
      message: "Google Trends: acesso à API Alpha pendente de aprovação.",
    };
  }
  return { signals: [], status: "connected", message: "" };
}

export const refreshSources = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): RefreshInput => {
    const d = (data ?? {}) as Record<string, unknown>;
    const p = Number(d.periodDays);
    return {
      periodDays: [7, 30, 90].includes(p) ? p : 30,
      uf: typeof d.uf === "string" && /^[A-Z]{2}$/.test(d.uf) ? d.uf : null,
      category: typeof d.category === "string" && d.category.length < 60 ? d.category : null,
    };
  })
  .handler(async ({ data }) => {
    const [ads, trends] = await Promise.all([googleAdsAdapter(data), googleTrendsAdapter(data)]);
    const sourceStatus = {
      google_ads: ads.status,
      google_trends: trends.status,
    } as SourceStatus;
    return {
      signals: [...ads.signals, ...trends.signals],
      sourceStatus,
      messages: [ads.message, trends.message].filter(Boolean),
      checkedAt: new Date().toISOString(),
    };
  });

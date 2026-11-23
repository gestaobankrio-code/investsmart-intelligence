import { useEffect, useMemo, useState } from "react";
import { BrazilMap, type MapCell } from "./BrazilMap";
import { UFS, UF_NAMES } from "@/lib/intelligence";
import {
  fetchStateFeed,
  recordsForState,
  STATE_POLL_MS,
  type StateTrendsFeed,
} from "@/lib/state-trends";
import { fmtDateTime } from "@/lib/trends-feed";

export function StateRadar({
  uf,
  setUf,
  focusUF,
  setFocusUF,
  refreshVersion = 0,
}: {
  uf: string;
  setUf: (next: string) => void;
  focusUF: string;
  setFocusUF: (next: string) => void;
  refreshVersion?: number;
}) {
  const [feed, setFeed] = useState<StateTrendsFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!active) return;
      setLoading(true);
      try {
        const fresh = await fetchStateFeed();
        if (active) {
          setFeed(fresh);
          setError(null);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (active) setLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), STATE_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [refreshVersion]);

  const selectedUF = uf || focusUF;
  const list = useMemo(() => (feed ? recordsForState(feed, selectedUF) : []), [feed, selectedUF]);
  const cells = useMemo<MapCell[]>(
    () =>
      (feed?.coverage ?? [])
        .filter((c) => c.status === "com_termos_financeiros")
        .map((c) => ({
          uf: c.uf,
          count: c.records ?? 0,
          peak: c.records,
          hot: true,
          title: UF_NAMES[c.uf] + " · " + c.records + " tendência(s) financeira(s) na consulta da UF",
        })),
    [feed],
  );
  const coverage = feed?.coverage.find((c) => c.uf === selectedUF);
  const selectState = (next: string) => {
    setUf(next);
    setFocusUF(next);
  };

  if (!feed) {
    return (
      <section className={"system-state " + (error ? "error" : "loading")} role="status">
        <div className="system-state-icon" aria-hidden="true">
          {loading ? "↻" : "!"}
        </div>
        <div>
          <strong>
            {loading ? "Consultando tendências estaduais" : "Fonte estadual indisponível"}
          </strong>
          <p>
            {error
              ? "Não é possível comprovar quais termos foram descobertos em cada UF. A plataforma não substitui essa informação pelas tendências nacionais."
              : "Carregando consultas específicas das 27 unidades federativas do Google Trends."}
          </p>
        </div>
      </section>
    );
  }

  const ageHours = (Date.now() - Date.parse(feed.generatedAt)) / 3600000;
  const sourceOld = !Number.isFinite(ageHours) || ageHours > 12;
  const usingFullPage = feed.extraction === "google_trends_pagina_regional_7d";
  const noFinanceResults = feed.availability === "sem_termos_no_recorte";
  return (
    <>
      <div
        className={"notice " + (sourceOld || error || noFinanceResults ? "stale" : "real")}
        role="status"
      >
        <span>
          <strong>
            {noFinanceResults
              ? "CONSULTAS CONCLUÍDAS · SEM TERMOS FINANCEIROS NA AMOSTRA"
              : "TENDÊNCIAS FINANCEIRAS ENCONTRADAS EM CADA ESTADO"}
          </strong>
          {" · "}Fonte: Google Trends Trending Now {usingFullPage ? "· últimos 7 dias" : "RSS"} (geo=BR-UF)
          {" · "}Última consulta: {fmtDateTime(feed.generatedAt)}
          {error && <> · Última atualização falhou; exibindo coleta anterior</>}
        </span>
        <span className="flag">
          {sourceOld
            ? "REVISAR ATUALIZAÇÃO"
            : noFinanceResults
              ? "SEM RESULTADOS NESTE RECORTE"
              : "ORIGEM ESTADUAL"}
        </span>
      </div>
      <div className="notice">
        <span>
          <strong>Como funciona:</strong> cada estado recebe exclusivamente os assuntos retornados
          em sua própria consulta ao Google. {usingFullPage
            ? "A página de tendências é consultada na janela de sete dias; apenas assuntos da categoria Negócios e Finanças com relevância financeira reconhecida são exibidos."
            : "O RSS oferece uma amostra limitada de tendências recentes."}
          {" "}Nenhum termo encontrado não significa ausência de pesquisas financeiras na UF.
        </span>
      </div>
      <div className="filters">
        <div className="filter">
          <label htmlFor="selected-state-rss">Estado pesquisado</label>
          <select
            className="field"
            id="selected-state-rss"
            value={selectedUF}
            onChange={(e) => selectState(e.target.value)}
          >
            {UFS.map((state) => (
              <option key={state} value={state}>
                {state} · {UF_NAMES[state]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="kpis" aria-live="polite">
        {(
          [
            ["UFs consultadas", feed.responded + "/27", "Consultas por código geográfico"],
            ["UFs com tendências", feed.withFinance, "Resultados financeiros na fonte estadual"],
            [
              "Termos capturados",
              feed.records.length,
              "Ocorrências verificadas por UF e categoria",
            ],
            ["Nesta UF", list.length, "Sem completar dados ausentes"],
          ] as [string, string | number, string][]
        ).map(([label, value, description]) => (
          <div className="kpi" key={label}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-caption">{description}</div>
          </div>
        ))}
      </div>
      <div className="radar-grid">
        <article className="card map-card">
          <div className="card-head">
            <div>
              <div className="card-title">Mapa de tendências financeiras por UF</div>
              <div className="card-sub">
                Selecione um estado para ver apenas as buscas identificadas naquela localização.
              </div>
            </div>
            <span className="tag dark">{feed.responded} UFs CONSULTADAS</span>
          </div>
          <BrazilMap
            cells={cells}
            uf={uf}
            focusUF={selectedUF}
            onSelect={selectState}
            hint="Roxo indica ao menos um assunto financeiro identificado na UF. Não representa volume de buscas."
            hotLabel="Tendência financeira encontrada na UF"
            coldLabel="Sem resultado financeiro no recorte"
          />
        </article>
        <aside className="card detail" aria-live="polite">
          <div className="detail-eyebrow">BUSCAS IDENTIFICADAS · {selectedUF}</div>
          <h2>{UF_NAMES[selectedUF] ?? selectedUF}</h2>
          <div className="note">
            Estes termos foram encontrados diretamente na consulta geográfica BR-{selectedUF}, e não
            herdados dos destaques nacionais.
          </div>
          <div className="detail-section">TENDÊNCIAS FINANCEIRAS ENCONTRADAS NA UF</div>
          {coverage?.status === "falha_consulta" ? (
            <div className="empty">
              A consulta desta UF falhou. Não há dados estaduais comprovados para apresentar.
            </div>
          ) : list.length ? (
            <div className="term-options">
              {list.map((record) => (
                <div className="regional-term" key={record.uf + "|" + record.term}>
                  <a
                    href={record.sourceURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="term-option regional-source-link"
                  >
                    <span>
                      <strong>{record.term}</strong>
                      <small>
                        Google Trends ·{" "}
                        {record.publishedAt
                          ? fmtDateTime(record.publishedAt)
                          : "Data não informada"}
                      </small>
                      <small className="regional-context">Consultado para: {record.geo}</small>
                    </span>
                    <span className="heat-pill unknown">Em destaque</span>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              Nenhuma tendência financeira foi identificada na amostra do Google Trends desta UF.
              Isso não indica zero buscas ou ausência de interesse.
            </div>
          )}
          {loading && (
            <div className="note">Verificando se existem novos resultados estaduais…</div>
          )}
        </aside>
      </div>
    </>
  );
}

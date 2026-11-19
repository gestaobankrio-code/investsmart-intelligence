// Visualização de termos NACIONAIS do Google Trends e seus sinais regionais.
// Não há pontuação comercial, volume de buscas inventado ou ranking próprio de UFs.
import { useMemo, useState } from "react";
import { BrazilMap, type MapCell } from "./BrazilMap";
import { UFS, UF_NAMES, norm } from "@/lib/intelligence";
import {
  feedAgeDays,
  fmtDate,
  fmtDateTime,
  heatOfDelta,
  heatOfRegionalSummary,
  isStale,
  regionalDifferentials,
  summarizeNationalTerms,
  type TrendRecord,
  type TrendsFeed,
} from "@/lib/trends-feed";

export interface FeedState {
  feed: TrendsFeed | null;
  error: string | null;
  readAt: string | null;
  loading: boolean;
}

function HeatPill({ level }: { level: string }) {
  const style =
    level === "Quente" ? "hot" : level === "Frio" ? "cold" : level === "Morno" ? "warm" : "unknown";
  return <span className={`heat-pill ${style}`}>{level}</span>;
}

const trendLabel = (r: TrendRecord) => heatOfDelta(r.deltaPts);

export function RealNotice({ st }: { st: FeedState }) {
  const { feed, error, readAt } = st;
  if (!feed) {
    return (
      <div className={"notice " + (st.loading ? "loading" : "error")} role="status">
        <strong>{st.loading ? "VALIDANDO DADOS REAIS" : "DADOS INDISPONÍVEIS"}</strong>
        {" · "}
        {st.loading
          ? "Consultando o feed público."
          : (error ?? "Não foi possível carregar a fonte.")}
      </div>
    );
  }
  const stale = isStale(feed);
  return (
    <div
      className={"notice " + (stale ? "stale" : "real")}
      role={stale || error ? "alert" : "status"}
    >
      <span>
        <strong>
          {stale ? "DADOS REAIS · FONTE DESATUALIZADA" : "DADOS REAIS · FONTE ATUALIZADA"}
        </strong>
        {" · "}Fonte {fmtDate(feed.sourceDate)}
        {" · "}Extração {fmtDateTime(feed.generatedAt)}
        {" · "}Idade da fonte {feedAgeDays(feed) ?? "?"} dias
        {" · "}Origem {feed.origin ?? "não identificada"}
        {readAt && <> · Consultado {readAt}</>}
        {error && <> · Falha na releitura: {error}</>}
      </span>
      <span className="flag">{stale ? "REVISAR ATUALIZAÇÃO" : "SEM DADOS SIMULADOS"}</span>
    </div>
  );
}

function regionalCells(rows: TrendRecord[]): MapCell[] {
  return UFS.flatMap((uf) => {
    const entries = rows.filter((r) => r.uf === uf);
    if (!entries.length) return [];
    const rising = entries.filter((r) => r.trend === "Em alta").length;
    return [
      {
        uf,
        count: entries.length,
        peak: rising,
        hot: rising > 0,
        title: `${UF_NAMES[uf]} · ${entries.length} registros regionais de termos nacionais · ${rising} em alta`,
      },
    ];
  });
}

export function RealRadar({
  st,
  uf,
  setUf,
  focusUF,
  setFocusUF,
}: {
  st: FeedState;
  uf: string;
  setUf: (s: string) => void;
  focusUF: string;
  setFocusUF: (s: string) => void;
}) {
  const [term, setTerm] = useState("");
  const [onlyUp, setOnlyUp] = useState(false);
  const [showAllStateTerms, setShowAllStateTerms] = useState(false);
  const all = useMemo(() => st.feed?.records ?? [], [st.feed?.records]);
  const rows = useMemo(
    () => all.filter((r) => (!term || r.term === term) && (!onlyUp || r.trend === "Em alta")),
    [all, term, onlyUp],
  );
  const unique = summarizeNationalTerms(rows);
  const selectedUF = uf || focusUF;
  const stateRecords = rows
    .filter((r) => r.uf === selectedUF)
    .sort((a, b) => a.term.localeCompare(b.term, "pt-BR"));
  const differentials = useMemo(
    () =>
      regionalDifferentials(all, selectedUF).filter(
        (item) =>
          (!term || item.record.term === term) &&
          (!onlyUp || item.record.trend === "Em alta"),
      ),
    [all, selectedUF, term, onlyUp],
  );
  const highlighted = differentials.slice(0, 5);
  const visibleStateRecords =
    showAllStateTerms || term ? stateRecords : highlighted.map((item) => item.record);
  const cells = useMemo(() => regionalCells(rows), [rows]);
  const statesWithRise = new Set(rows.filter((r) => r.trend === "Em alta").map((r) => r.uf)).size;
  const selectState = (next: string) => {
    setUf(next);
    setFocusUF(next);
    setShowAllStateTerms(false);
    setTerm("");
  };
  return (
    <>
      <div className="notice">
        <span>
          <strong>Origem nacional, leitura regional.</strong> Os assuntos são encontrados nos
          destaques do Brasil. Um termo pode aparecer em diferentes UFs porque existem séries
          regionais distintas. Isso não significa que foi criado separadamente em cada estado.
        </span>
        <span className="flag">DADOS DA FONTE</span>
      </div>
      <div className="filters">
        <div className="filter">
          <label htmlFor="radar-uf">Estado</label>
          <select
            className="field"
            id="radar-uf"
            value={uf}
            onChange={(e) => selectState(e.target.value)}
          >
            <option value="">Brasil · Mapa completo</option>
            {UFS.map((state) => (
              <option key={state} value={state}>
                {state} · {UF_NAMES[state]}
              </option>
            ))}
          </select>
        </div>
        <div className="filter">
          <label htmlFor="radar-term">Assunto de interesse</label>
          <select
            className="field"
            id="radar-term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          >
            <option value="">Todos os assuntos encontrados</option>
            {st.feed?.terms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-actions">
          <button
            className="btn"
            type="button"
            onClick={() => {
              setTerm("");
              setOnlyUp(false);
              setShowAllStateTerms(false);
              setUf("");
            }}
          >
            Limpar filtros
          </button>
          <label className="toggle">
            <input type="checkbox" checked={onlyUp} onChange={(e) => setOnlyUp(e.target.checked)} />
            Apenas altas
          </label>
        </div>
      </div>
      <div className="kpis" aria-live="polite">
        {(
          [
            ["Assuntos nacionais", unique.length, "Cada termo contabilizado uma única vez"],
            ["UFs com registros", cells.length, "Séries regionais disponíveis"],
            ["UFs com alguma alta", statesWithRise, "Evolução positiva no período"],
            ["Data da fonte", fmtDate(st.feed?.sourceDate ?? null), "Não é volume de pesquisas"],
          ] as [string, string | number, string][]
        ).map(([name, value, note]) => (
          <div className="kpi" key={name}>
            <div className="kpi-label">{name}</div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-caption">{note}</div>
          </div>
        ))}
      </div>
      <div className="radar-grid">
        <article className="card map-card">
          <div className="card-head">
            <div>
              <div className="card-title">Mapa de evolução regional</div>
              <div className="card-sub">
                Selecione um estado para ver a evolução dos assuntos nacionais naquela UF.
              </div>
            </div>
            <span className="tag dark">27 UFs INTERATIVAS</span>
          </div>
          <BrazilMap
            cells={cells}
            uf={uf}
            focusUF={selectedUF}
            onSelect={selectState}
            hint="Roxo indica presença de registros reais. A cor não representa volume de buscas."
            hotLabel="Ao menos um assunto em alta"
            coldLabel="Sem alta comprovada no recorte"
          />
        </article>
        <aside className="card detail" aria-live="polite">
          <div className="detail-eyebrow">SÉRIES REGIONAIS · {selectedUF}</div>
          <h2>{UF_NAMES[selectedUF] ?? "Selecione um estado"}</h2>
          <div className="note">
            {showAllStateTerms
              ? "Lista completa dos termos nacionais acompanhados nesta UF, não buscas exclusivas do estado."
              : "Movimentos cuja variação difere da mediana das UFs para o mesmo termo e semana. Não são buscas exclusivas deste estado."}
          </div>
          <div className="regional-detail-head">
            <div className="detail-section">
              {showAllStateTerms ? "TODOS OS TERMOS NA UF" : "DESTAQUES QUE DIFERENCIAM ESTA UF"}
            </div>
            {stateRecords.length > 0 && (
              <button
                className="regional-toggle"
                type="button"
                aria-pressed={showAllStateTerms}
                onClick={() => setShowAllStateTerms((current) => !current)}
              >
                {showAllStateTerms ? "Ver destaques" : `Ver todos (${stateRecords.length})`}
              </button>
            )}
          </div>
          {visibleStateRecords.length ? (
            <div className="term-options" key={`${selectedUF}-${showAllStateTerms ? "all" : "focus"}`}>
              {visibleStateRecords.map((r) => {
                const differential = differentials.find((d) => d.record.id === r.id);
                return (
                  <div className="regional-term" key={r.id}>
                    <button
                      type="button"
                      className={"term-option" + (r.term === term ? " active" : "")}
                      onClick={() => setTerm(r.term === term ? "" : r.term)}
                    >
                      <span>
                        <strong>{r.term}</strong>
                        <small>
                          {r.source} · fonte {fmtDate(r.sourceDate)}
                        </small>
                        {differential && (
                          <small className="regional-context">
                            {differential.direction} das UFs na mesma semana
                          </small>
                        )}
                      </span>
                      <HeatPill level={trendLabel(r)} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              {stateRecords.length
                ? "Não há variações distintas da mediana nesta UF e neste recorte. Veja todos os termos para consultar os registros disponíveis."
                : "Nenhum registro para esta UF e estes filtros. Ausência não significa zero buscas."}
            </div>
          )}
        </aside>
      </div>
      <article className="card" style={{ marginTop: 12 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Assuntos identificados no Brasil</div>
            <div className="card-sub">
              Cada termo aparece uma única vez. A contagem de UFs descreve cobertura regional do
              termo, não sua popularidade ou volume de buscas.
            </div>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Termo nacional</th>
                <th>Fonte</th>
                <th>UFs com dados</th>
                <th>Temperatura da tendência</th>
                <th>UFs em alta</th>
                <th>Última data da fonte</th>
              </tr>
            </thead>
            <tbody>
              {unique.map((s) => (
                <tr key={s.term}>
                  <td data-label="Termo">
                    <button type="button" className="btn" onClick={() => setTerm(s.term)}>
                      {s.term}
                    </button>
                  </td>
                  <td data-label="Fonte">{s.source}</td>
                  <td data-label="UFs com dados">{s.ufs}</td>
                  <td data-label="Temperatura">
                    <HeatPill level={heatOfRegionalSummary(s)} />
                  </td>
                  <td data-label="UFs em alta">{s.risingUFs}</td>
                  <td data-label="Data">{fmtDate(s.latestDate)}</td>
                </tr>
              ))}
              {!unique.length && (
                <tr>
                  <td colSpan={6} className="empty">
                    Nenhum assunto para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}

export function RealRanking({ st, onPick }: { st: FeedState; onPick: (uf: string) => void }) {
  const [query, setQuery] = useState("");
  const [uf, setUf] = useState("");
  const rows = (st.feed?.records ?? []).filter(
    (r) => (!uf || r.uf === uf) && (!query || norm(r.term).includes(norm(query))),
  );
  const unique = summarizeNationalTerms(rows);
  return (
    <>
      <div className="notice">
        <span>
          <strong>Lista de termos nacionais, sem repetições.</strong> Os sinais por estado são
          mostrados apenas como evolução regional do mesmo assunto. Mais UFs não significa mais
          buscas.
        </span>
      </div>
      <div className="filters">
        <div className="filter big">
          <label htmlFor="search-term">Pesquisar nos termos reais</label>
          <input
            className="field"
            id="search-term"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busque por um assunto encontrado na fonte"
          />
        </div>
        <div className="filter">
          <label htmlFor="search-uf">Filtrar região</label>
          <select
            className="field"
            id="search-uf"
            value={uf}
            onChange={(e) => setUf(e.target.value)}
          >
            <option value="">Brasil inteiro</option>
            {UFS.map((state) => (
              <option key={state} value={state}>
                {state} · {UF_NAMES[state]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <article className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Termos reais identificados</div>
            <div className="card-sub">
              {unique.length} assuntos distintos. Origem: destaques nacionais do Google Trends.
              Nenhum índice numérico ou ranking de mercado é inferido.
            </div>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Assunto</th>
                <th>Origem</th>
                <th>UFs com registros</th>
                <th>UFs em alta</th>
                <th>UFs em queda</th>
                <th>Temperatura</th>
                <th>Data da fonte</th>
              </tr>
            </thead>
            <tbody>
              {unique.map((s) => (
                <tr key={s.term}>
                  <td data-label="Assunto">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        const first = s.records[0];
                        if (first) onPick(first.uf);
                      }}
                    >
                      {s.term}
                    </button>
                  </td>
                  <td data-label="Fonte">{s.source}</td>
                  <td data-label="UFs">{s.ufs}</td>
                  <td data-label="Altas">{s.risingUFs}</td>
                  <td data-label="Quedas">{s.fallingUFs}</td>
                  <td data-label="Temperatura">
                    <HeatPill level={heatOfRegionalSummary(s)} />
                  </td>
                  <td data-label="Data">{fmtDate(s.latestDate)}</td>
                </tr>
              ))}
              {!unique.length && (
                <tr>
                  <td className="empty" colSpan={7}>
                    Sem registros para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}

export function RealCompare({ st, onPick }: { st: FeedState; onPick: (uf: string) => void }) {
  const [selection, setSelection] = useState("");
  const terms = st.feed?.terms ?? [];
  const term = selection && terms.includes(selection) ? selection : (terms[0] ?? "");
  const inTerm = (st.feed?.records ?? []).filter((r) => r.term === term);
  const byUF = new Map(inTerm.map((r) => [r.uf, r]));
  const notCovered = UFS.filter((state) => !byUF.has(state));
  return (
    <>
      <div className="notice">
        <span>
          <strong>Comparação de evolução, não de tamanho do mercado.</strong> A série de um termo
          pode subir em uma UF e cair em outra. Os índices relativos não representam quantidade
          absoluta de pesquisas e não permitem afirmar qual estado tem maior volume.
        </span>
      </div>
      <div className="compare-controls">
        <select
          className="field"
          aria-label="Termo comparado"
          value={term}
          onChange={(e) => setSelection(e.target.value)}
        >
          {terms.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="tag">{byUF.size} UFs COM REGISTROS</span>
      </div>
      <article className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Evolução do termo por estado</div>
            <div className="card-sub">
              Quente indica alta, morno indica estabilidade e frio indica queda no interesse. Não
              representa volume ou potencial de conversão.
            </div>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Termo</th>
                <th>Temperatura da tendência</th>
                <th>Data da fonte</th>
              </tr>
            </thead>
            <tbody>
              {UFS.filter((state) => byUF.has(state)).map((state) => {
                const r = byUF.get(state)!;
                return (
                  <tr key={state}>
                    <td data-label="Estado">
                      <button className="btn" type="button" onClick={() => onPick(state)}>
                        {UF_NAMES[state]} · {state}
                      </button>
                    </td>
                    <td data-label="Termo">{term}</td>
                    <td data-label="Temperatura">
                      <HeatPill level={trendLabel(r)} />
                    </td>
                    <td data-label="Data">{fmtDate(r.sourceDate)}</td>
                  </tr>
                );
              })}
              {!byUF.size && (
                <tr>
                  <td colSpan={4} className="empty">
                    Sem dados regionais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
      {notCovered.length > 0 && (
        <div className="notice" style={{ marginTop: 12 }}>
          <span>
            <strong>Sem dados regionais para este termo:</strong> {notCovered.join(", ")}. Ausência
            de registro não equivale a zero pesquisas.
          </span>
        </div>
      )}
    </>
  );
}

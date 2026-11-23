import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  FilterX,
  Globe2,
  Layers3,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { UFS, UF_NAMES, norm } from "@/lib/intelligence";
import { fmtDate, fmtDateTime } from "@/lib/trends-feed";
import { groupRegionalTopics } from "@/lib/regional-insights";
import { useRegionalFeed } from "@/hooks/useRegionalFeed";
import {
  RegionalAwait,
  RegionalFact,
  RegionalMethodNote,
  RegionalSourceBar,
} from "./RegionalInsightsUI";

type SortMode = "recent" | "coverage" | "name";
type RegionFilter = "all" | "multi";

export function FinancialTermsPage({
  onCompare,
  focusTerm = "",
}: {
  onCompare: (term: string) => void;
  focusTerm?: string;
}) {
  const state = useRegionalFeed();
  const [search, setSearch] = useState("");
  const [uf, setUf] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [scope, setScope] = useState<RegionFilter>("all");
  const [selectedKey, setSelectedKey] = useState("");

  const terms = useMemo(() => groupRegionalTopics(state.feed?.records ?? []), [state.feed]);
  const shown = useMemo(() => {
    const candidate = terms.filter((item) => {
      if (search && !norm(item.label).includes(norm(search))) return false;
      if (uf && !item.states.includes(uf)) return false;
      if (scope === "multi" && item.states.length < 2) return false;
      return true;
    });
    if (sort === "coverage")
      candidate.sort(
        (a, b) => b.states.length - a.states.length || a.label.localeCompare(b.label, "pt-BR"),
      );
    if (sort === "name") candidate.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    return candidate;
  }, [terms, search, uf, sort, scope]);
  const active = shown.find((item) => item.key === selectedKey) ?? shown[0] ?? null;
  const coverage = state.feed?.withFinance ?? 0;
  const duplicates = terms.filter((item) => item.states.length > 1).length;
  const hasFilters = Boolean(search || uf || scope !== "all" || sort !== "recent");

  const reset = () => {
    setSearch("");
    setUf("");
    setSort("recent");
    setScope("all");
    setSelectedKey("");
  };

  return (
    <section className="fi-page fi-terms">
      <div className="fi-intro">
        <div>
          <div className="fi-kicker">
            <Compass size={14} aria-hidden="true" /> EXPLORADOR FINANCEIRO
          </div>
          <h2>Encontre o assunto. Entenda onde ele aparece.</h2>
          <p>
            Termos financeiros identificados pelo Google Trends nas consultas específicas dos
            estados brasileiros. Investigue cada ocorrência com procedência e data.
          </p>
        </div>
        <div className="fi-intro-tag">
          <Globe2 size={16} aria-hidden="true" /> Dados reais por UF
        </div>
      </div>

      <RegionalSourceBar state={state} />
      {!state.feed ? (
        <RegionalAwait state={state} />
      ) : (
        <>
          <div className="fi-facts">
            <RegionalFact
              primary
              label="Termos distintos"
              value={terms.length}
              detail="Expressões únicas no recorte"
              icon={<Search size={18} />}
            />
            <RegionalFact
              label="Ocorrências estaduais"
              value={state.feed.records.length}
              detail="Registros associados a uma UF"
              icon={<Layers3 size={18} />}
            />
            <RegionalFact
              label="Estados com resultados"
              value={coverage}
              detail="Das 27 UFs consultadas"
              icon={<MapPin size={18} />}
            />
            <RegionalFact
              label="Presentes em várias UFs"
              value={duplicates}
              detail="Repetição comprovada pela fonte"
              icon={<Globe2 size={18} />}
            />
          </div>

          <section className="fi-panel fi-search-panel" aria-label="Pesquisar e filtrar termos">
            <div className="fi-panel-heading">
              <div>
                <span className="fi-overline">PESQUISA E SEGMENTAÇÃO</span>
                <h3>Explorar termos financeiros</h3>
              </div>
              <span className="fi-count">
                {shown.length} termo{shown.length === 1 ? "" : "s"} encontrado
                {shown.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="fi-filter-grid">
              <div className="fi-field fi-search-field">
                <label htmlFor="fi-term-search">Pesquisar expressão</label>
                <div className="fi-input-wrap">
                  <Search size={18} aria-hidden="true" />
                  <input
                    id="fi-term-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar nos dados reais..."
                    autoComplete="off"
                  />
                  {search && (
                    <button
                      className="fi-clear-input"
                      type="button"
                      aria-label="Limpar pesquisa"
                      onClick={() => setSearch("")}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className="fi-field">
                <label htmlFor="fi-term-uf">Estado</label>
                <select id="fi-term-uf" value={uf} onChange={(event) => setUf(event.target.value)}>
                  <option value="">Todos os estados</option>
                  {UFS.map((s) => (
                    <option key={s} value={s}>
                      {UF_NAMES[s]} ({s})
                    </option>
                  ))}
                </select>
              </div>
              <div className="fi-field">
                <label htmlFor="fi-term-sort">Ordenar por</label>
                <select
                  id="fi-term-sort"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                >
                  <option value="recent">Mais recentes</option>
                  <option value="coverage">Mais UFs com registros</option>
                  <option value="name">Ordem alfabética</option>
                </select>
              </div>
            </div>
            <div className="fi-filter-foot">
              <div className="fi-segments" role="group" aria-label="Abrangência dos termos">
                <button
                  type="button"
                  className={scope === "all" ? "active" : ""}
                  aria-pressed={scope === "all"}
                  onClick={() => setScope("all")}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={scope === "multi" ? "active" : ""}
                  aria-pressed={scope === "multi"}
                  onClick={() => setScope("multi")}
                >
                  Em mais de uma UF
                </button>
              </div>
              {hasFilters && (
                <button type="button" className="fi-text-action" onClick={reset}>
                  <FilterX size={15} aria-hidden="true" /> Limpar filtros
                </button>
              )}
            </div>
          </section>

          <div className="fi-explorer-grid">
            <section className="fi-panel fi-results-panel" aria-label="Resultados financeiros">
              <div className="fi-panel-heading">
                <div>
                  <span className="fi-overline">TERMOS ENCONTRADOS</span>
                  <h3>Catálogo de pesquisas</h3>
                </div>
                <span className="fi-count">{shown.length} resultados</span>
              </div>
              {shown.length ? (
                <div className="fi-result-list">
                  {shown.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={"fi-term-row" + (active?.key === item.key ? " selected" : "")}
                      aria-pressed={active?.key === item.key}
                      onClick={() => setSelectedKey(item.key)}
                    >
                      <span className="fi-term-row-icon" aria-hidden="true">
                        <Search size={17} />
                      </span>
                      <span className="fi-term-row-body">
                        <strong>{item.label}</strong>
                        <small>
                          {item.states.length} UF{item.states.length === 1 ? "" : "s"} com
                          ocorrência
                          <span aria-hidden="true"> · </span>
                          {fmtDate(item.latestAt)}
                        </small>
                      </span>
                      <span className="fi-row-arrow" aria-hidden="true">
                        <ArrowUpRight size={17} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="fi-no-results">
                  <SlidersHorizontal size={25} aria-hidden="true" />
                  <strong>Nenhum termo corresponde aos filtros.</strong>
                  <p>
                    Altere a pesquisa ou selecione outra UF. Ausência nesta lista não significa
                    ausência de buscas.
                  </p>
                  <button className="fi-button" type="button" onClick={reset}>
                    Ver todos os termos
                  </button>
                </div>
              )}
            </section>

            <aside className="fi-panel fi-detail-panel" aria-live="polite">
              {active ? (
                <>
                  <div className="fi-detail-top">
                    <div>
                      <span className="fi-overline">FICHA DO TERMO</span>
                      <h3>{active.label}</h3>
                      <p>
                        Expressão encontrada na fonte estadual, sem seleção prévia da palavra-chave.
                      </p>
                    </div>
                    <span className="fi-verified">
                      <Check size={14} aria-hidden="true" /> Verificado
                    </span>
                  </div>
                  <div className="fi-detail-meta">
                    <div>
                      <span>Estados com ocorrência</span>
                      <strong>
                        {active.states.length} UF{active.states.length === 1 ? "" : "s"}
                      </strong>
                    </div>
                    <div>
                      <span>Registro mais recente</span>
                      <strong>{fmtDateTime(active.latestAt)}</strong>
                    </div>
                  </div>
                  <div className="fi-detail-subhead">
                    <h4>Onde foi identificado</h4>
                    <span>
                      {active.records.length} ocorrência{active.records.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="fi-evidence-list">
                    {active.records.map((record) => (
                      <div
                        key={record.uf}
                        className={"fi-evidence-row" + (uf === record.uf ? " is-highlighted" : "")}
                      >
                        <span className="fi-state-initial">{record.uf}</span>
                        <div>
                          <strong>{UF_NAMES[record.uf]}</strong>
                          <small>Fonte {fmtDateTime(record.publishedAt)}</small>
                        </div>
                        <a
                          href={record.sourceURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={"Ver fonte do Google Trends para " + UF_NAMES[record.uf]}
                          title="Abrir fonte oficial"
                        >
                          <ArrowUpRight size={17} aria-hidden="true" />
                        </a>
                      </div>
                    ))}
                  </div>
                  <button
                    className="fi-button fi-button-primary fi-detail-cta"
                    type="button"
                    onClick={() => onCompare(active.label)}
                  >
                    Comparar estados para este termo <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </>
              ) : (
                <div className="fi-no-results">
                  <Search size={25} aria-hidden="true" />
                  <strong>Selecione um termo</strong>
                  <p>
                    A ficha será preenchida apenas com registros identificados na fonte estadual.
                  </p>
                </div>
              )}
            </aside>
          </div>

          <RegionalMethodNote />
        </>
      )}
    </section>
  );
}

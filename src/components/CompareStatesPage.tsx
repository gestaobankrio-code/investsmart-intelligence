import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, ArrowUpRight, Check, GitCompareArrows,
  MapPin, Minus, Plus, RefreshCw, Search, X,
} from "lucide-react";
import { UFS, UF_NAMES } from "@/lib/intelligence";
import { fmtDate, fmtDateTime } from "@/lib/trends-feed";
import {
  compareRegionalStates, topicKey, groupRegionalTopics,
} from "@/lib/regional-insights";
import { useRegionalFeed } from "@/hooks/useRegionalFeed";
import {
  RegionalAwait, RegionalFact, RegionalMethodNote, RegionalSourceBar,
} from "./RegionalInsightsUI";

export function CompareStatesPage({
  focusTerm = "",
  onExploreTerm,
}: {
  focusTerm?: string;
  onExploreTerm: (term: string) => void;
}) {
  const state = useRegionalFeed();
  const [selected, setSelected] = useState<string[]>(["SP", "RJ"]);
  const [focused, setFocused] = useState(topicKey(focusTerm));
  const initialFocusApplied = useRef(false);

  const allTopics = useMemo(() => groupRegionalTopics(state.feed?.records ?? []), [state.feed]);
  useEffect(() => {
    if (initialFocusApplied.current || !state.feed || !focusTerm) return;
    initialFocusApplied.current = true;
    const match = allTopics.find((item) => item.key === topicKey(focusTerm));
    if (!match) return;
    const candidates = [...match.states, "SP", "RJ", "MG", ...UFS];
    setSelected([...new Set(candidates)].slice(0, Math.max(2, Math.min(3, match.states.length))));
    setFocused(match.key);
  }, [state.feed, allTopics, focusTerm]);

  const comparison = useMemo(
    () => compareRegionalStates(state.feed?.records ?? [], selected),
    [state.feed, selected],
  );
  const visibleTopics = focused
    ? comparison.topics.filter((topic) => topic.key === focused)
    : comparison.topics;
  const focusedTopic = allTopics.find((topic) => topic.key === focused);

  const updateState = (index: number, next: string) => {
    if (!next || selected.some((uf, at) => at !== index && uf === next)) return;
    setSelected((previous) => previous.map((uf, at) => at === index ? next : uf));
  };
  const addState = () => {
    const options = UFS.filter((uf) => !selected.includes(uf));
    const withData = options.find((uf) => state.feed?.coverage.some(
      (item) => item.uf === uf && item.status === "com_termos_financeiros",
    ));
    const next = withData ?? options[0];
    if (next && selected.length < 3) setSelected((current) => [...current, next]);
  };

  return (
    <section className="fi-page fi-compare">
      <div className="fi-intro fi-compare-intro">
        <div>
          <div className="fi-kicker"><GitCompareArrows size={14} aria-hidden="true" /> ANÁLISE REGIONAL</div>
          <h2>Dois estados. Diferentes sinais de interesse.</h2>
          <p>
            Compare as tendências financeiras efetivamente encontradas nas consultas de cada UF.
            Veja convergências e diferenças sem transformar ocorrências em volume de mercado.
          </p>
        </div>
        <div className="fi-intro-tag"><MapPin size={16} aria-hidden="true"/> Comparação por localização</div>
      </div>
      <RegionalSourceBar state={state} />
      {!state.feed ? <RegionalAwait state={state} /> : (
        <>
          <section className="fi-panel fi-selector-panel" aria-label="Seleção de estados">
            <div className="fi-panel-heading">
              <div><span className="fi-overline">CONFIGURE SUA ANÁLISE</span><h3>Selecione os estados</h3></div>
              <span className="fi-count">2 a 3 UFs</span>
            </div>
            <div className="fi-state-controls">
              {selected.map((uf, index) => (
                <div className="fi-state-picker" key={index}>
                  <span className="fi-picker-number">0{index + 1}</span>
                  <div className="fi-field">
                    <label htmlFor={"fi-compare-state-" + index}>Estado {index + 1}</label>
                    <select id={"fi-compare-state-" + index} value={uf}
                      onChange={(event) => updateState(index, event.target.value)}>
                      {UFS.map((option) => (
                        <option key={option} value={option} disabled={selected.includes(option) && option !== uf}>
                          {UF_NAMES[option]} · {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selected.length > 2 && (
                    <button type="button" className="fi-state-remove" aria-label={"Remover " + UF_NAMES[uf]}
                      onClick={() => setSelected((items) => items.filter((_, i) => i !== index))}>
                      <X size={16} aria-hidden="true"/>
                    </button>
                  )}
                </div>
              ))}
              {selected.length < 3 && (
                <button type="button" className="fi-add-state" onClick={addState}>
                  <Plus size={18} aria-hidden="true"/>
                  <span>Adicionar estado</span>
                </button>
              )}
            </div>
            <div className="fi-comparison-focus">
              <div className="fi-field">
                <label htmlFor="fi-compare-term">Focar em um termo</label>
                <div className="fi-input-wrap">
                  <Search size={16} aria-hidden="true"/>
                  <select id="fi-compare-term" value={focused}
                    onChange={(event) => setFocused(event.target.value)}>
                    <option value="">Todos os termos</option>
                    {allTopics.map((item) => (
                      <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {focused && (
                <button type="button" className="fi-text-action" onClick={() => setFocused("")}>
                  <X size={15} aria-hidden="true"/> Remover foco
                </button>
              )}
            </div>
          </section>

          <div className="fi-facts">
            <RegionalFact primary label="Termos nas UFs" value={comparison.unionCount} detail="Distintos na seleção" icon={<Search size={18}/>} />
            <RegionalFact label="Compartilhados" value={comparison.sharedAcrossAll} detail="Identificados em todas as UFs selecionadas" icon={<GitCompareArrows size={18}/>} />
            <RegionalFact label="Em apenas uma UF" value={comparison.exclusiveWithinSelection} detail="Exclusivos dentro da seleção" icon={<MapPin size={18}/>} />
            <RegionalFact label="Estados analisados" value={selected.length} detail="Consultas independentes do Google" icon={<Check size={18}/>} />
          </div>

          <section className="fi-panel fi-side-panel" aria-label="Comparação lado a lado">
            <div className="fi-panel-heading">
              <div>
                <span className="fi-overline">LEITURA LADO A LADO</span>
                <h3>Tendências encontradas por estado</h3>
              </div>
              <span className="fi-count">{focused ? "Termo selecionado" : "Janela de 7 dias"}</span>
            </div>
            {focused && focusedTopic && (
              <div className="fi-focus-context">
                <div>
                  <span className="fi-overline">ASSUNTO EM FOCO</span>
                  <strong>{focusedTopic.label}</strong>
                  <p>Presença verificada na amostra de cada UF selecionada.</p>
                </div>
                <button type="button" className="fi-button" onClick={() => onExploreTerm(focusedTopic.label)}>
                  Ver ficha completa <ArrowRight size={15} aria-hidden="true"/>
                </button>
              </div>
            )}
            <div className={"fi-side-grid" + (selected.length === 3 ? " fi-three-col" : "")}>
              {selected.map((uf, index) => {
                const found = visibleTopics.filter((topic) => topic.states.includes(uf));
                const count = comparison.topics.filter((topic) => topic.states.includes(uf)).length;
                const coverage = state.feed?.coverage.find((item) => item.uf === uf);
                return (
                  <article className="fi-state-column" key={uf}>
                    <div className="fi-column-head">
                      <div className="fi-column-number">{String(index + 1).padStart(2, "0")}</div>
                      <div><span className="fi-overline">UNIDADE FEDERATIVA</span><h4>{UF_NAMES[uf]}</h4><small>{uf} · {count} termo{count === 1 ? "" : "s"} no recorte</small></div>
                    </div>
                    <div className="fi-column-body">
                      {coverage?.status === "falha_consulta" ? (
                        <div className="fi-state-empty">A consulta da UF falhou. Não é possível afirmar a presença de termos.</div>
                      ) : found.length ? found.map((topic) => {
                        const record = topic.records.find((r) => r.uf === uf);
                        if (!record) return null;
                        return (
                          <div className="fi-comparison-topic" key={topic.key}>
                            <span className="fi-topic-flag">{topic.shared ? "Nas UFs selecionadas" : topic.onlyWithinSelection ? "Só nesta seleção" : "Compartilhado parcialmente"}</span>
                            <strong>{topic.label}</strong>
                            <div className="fi-comparison-topic-foot">
                              <time dateTime={record.publishedAt ?? undefined}>{fmtDateTime(record.publishedAt)}</time>
                              <a href={record.sourceURL} target="_blank" rel="noopener noreferrer" aria-label={"Consultar fonte de " + topic.label + " em " + UF_NAMES[uf]}>
                                <ArrowUpRight size={16} aria-hidden="true" />
                              </a>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="fi-state-empty">
                          <Minus size={23} aria-hidden="true"/>
                          <strong>{focused ? "Não identificado neste recorte" : "Sem termos financeiros identificados"}</strong>
                          <p>Isso não significa ausência de buscas ou interesse financeiro em {UF_NAMES[uf]}.</p>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="fi-panel fi-matrix-panel" aria-label="Matriz de presença por estado">
            <div className="fi-panel-heading">
              <div><span className="fi-overline">VISÃO COMPARATIVA</span><h3>Matriz de presença dos termos</h3></div>
              <span className="fi-count">Presença não é volume</span>
            </div>
            <div className="fi-matrix-legend">
              <span><Check size={14} aria-hidden="true"/> Identificado no recorte</span>
              <span><Minus size={14} aria-hidden="true"/> Não identificado no recorte</span>
            </div>
            {visibleTopics.length ? (
              <div className="fi-matrix-list">
                {visibleTopics.map((topic) => (
                  <div key={topic.key} className="fi-matrix-row">
                    <button type="button" className="fi-matrix-term" onClick={() => setFocused(topic.key)} aria-label={"Focar no termo " + topic.label}>
                      <strong>{topic.label}</strong>
                      <span>{topic.presentIn} de {selected.length} UFs</span>
                    </button>
                    <div className="fi-matrix-cells">
                      {selected.map((uf) => {
                        const matched = topic.states.includes(uf);
                        return (
                          <span key={uf} className={"fi-matrix-cell" + (matched ? " has-topic" : "")}
                            title={UF_NAMES[uf] + (matched ? ": identificado" : ": não identificado no recorte")}>
                            <span>{uf}</span>{matched ? <Check size={15} aria-label="Encontrado" /> : <Minus size={15} aria-label="Não identificado" />}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="fi-no-results">
                <Search size={26} aria-hidden="true"/>
                <strong>Sem ocorrência para a comparação escolhida.</strong>
                <p>Troque os estados ou retire o filtro de termo. Não completamos dados ausentes.</p>
                {focused && <button className="fi-button" type="button" onClick={() => setFocused("")}>Exibir todos os termos</button>}
              </div>
            )}
          </section>

          <RegionalMethodNote compact />
        </>
      )}
    </section>
  );
}

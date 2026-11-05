import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import logo from "@/assets/investsmart-logo.png.asset.json";
import { BRAZIL_STATES, MAP_VIEWBOX } from "@/data/brazil-map";
import {
  CATEGORIES, REGION, REGION_BASE, UFS, UF_NAMES,
  demoForPeriod, fmtGrowth, fmtMoney, fmtNum, norm, normalizeAPIRow, sortField, sorter,
  type Signal, type SortKey, type SourceStatus,
} from "@/lib/intelligence";
import { refreshSources } from "@/lib/intelligence.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InvestSmart — Central de Inteligência de Buscas" },
      { name: "description", content: "Radar de buscas por estado: temas de investimento, crescimento de demanda e oportunidades regionais de campanha." },
      { property: "og:title", content: "InvestSmart — Central de Inteligência de Buscas" },
      { property: "og:description", content: "Radar de buscas por UF com Google Trends × Google Ads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

/** Quantidade máxima de marcadores no mapa (mesma regra usada pelo BrazilMap). */
const MAX_PINS = 15;
function pinCount(rows: Signal[], uf: string) {
  return Math.min(new Set(rows.map((s) => s.uf)).size, uf ? 1 : MAX_PINS);
}

/** Deslocamento dos marcadores em UFs pequenas/adjacentes (coordenadas do viewBox 600x600). */
const PIN_OFFSET: Record<string, [number, number]> = {
  RN: [600, 138], PB: [600, 172], PE: [600, 206], AL: [600, 240], SE: [588, 274],
  DF: [416, 294], GO: [350, 330], ES: [534, 374], RJ: [490, 432],
};

type View = "radar" | "ranking" | "compare" | "sources";
const NAV: [View, string][] = [
  ["radar", "Radar Brasil"], ["ranking", "Ranking por UF"],
  ["compare", "Comparar Estados"], ["sources", "Fontes e Metodologia"],
];

function App() {
  const [view, setView] = useState<View>("radar");
  const [period, setPeriod] = useState(30);
  const [uf, setUf] = useState("");
  const [category, setCategory] = useState("");
  const [threshold, setThreshold] = useState(100);
  const [onlyBurst, setOnlyBurst] = useState(false);
  const [focusUF, setFocusUF] = useState("SP");
  const [focusTerm, setFocusTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("growth");
  const [rankSearch, setRankSearch] = useState("");
  const [rankUF, setRankUF] = useState("");
  const [rankSort, setRankSort] = useState<SortKey>("volume");
  const [compareTerm, setCompareTerm] = useState("");
  const [remote, setRemote] = useState<Signal[] | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [status, setStatus] = useState<SourceStatus>({ google_ads: "limited_explorer", google_trends: "pending_alpha" });
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const mode: "demo" | "real" = remote ? "real" : "demo";
  const showToast = (t: string) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  };

  const active = useMemo(
    () => (remote ? remote.filter((s) => s.periodDays === period) : demoForPeriod(period)),
    [remote, period],
  );
  const rows = useMemo(
    () => active.filter((s) => (!uf || s.uf === uf) && (!category || s.category === category) && (!onlyBurst || (s.growthPct ?? -Infinity) >= threshold)),
    [active, uf, category, onlyBurst, threshold],
  );

  // Foco
  let fUF = uf || focusUF;
  if (!rows.some((s) => s.uf === fUF)) {
    const fb = rows.slice().sort(sorter("growthPct"))[0];
    if (fb) fUF = fb.uf;
  }
  const candidates = rows.filter((s) => s.uf === fUF).slice().sort(sorter("growthPct"));
  const current = candidates.find((s) => s.term === focusTerm) ?? candidates[0];

  const selectState = (state: string, toggle = true) => {
    setUf(toggle && uf === state ? "" : state);
    setFocusUF(state);
    setFocusTerm("");
  };
  const focusRow = (s: Signal) => {
    setFocusUF(s.uf); setUf(s.uf); setFocusTerm(s.term); setView("radar");
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await refreshSources({ data: { periodDays: period, uf: uf || null, category: category || null } });
      setStatus(res.sourceStatus);
      setCheckedAt(new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(res.checkedAt)));
      const valid = res.signals.map(normalizeAPIRow).filter(Boolean) as Signal[];
      if (valid.length) {
        setRemote(valid);
        setLastUpdate(new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date()));
        showToast(`${valid.length} registros recebidos das fontes.`);
      } else {
        showToast("Nenhuma API conectada ainda (Ads: Explorer · Trends: Alpha pendente). Os números demonstrativos permanecem inalterados.");
      }
    } catch (e) {
      showToast("Falha na atualização: " + String((e as Error).message || e));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setUf(""); setCategory(""); setPeriod(30); setThreshold(100); setOnlyBurst(false); setFocusTerm(""); setSortBy("growth");
  };

  return (
    <>
      <header className="top">
        <div className="brand">
          <img alt="InvestSmart" src={logo.url} />
          <span className="brand-sep" />
          <strong>Central de Inteligência de Buscas</strong>
        </div>
        <div className="top-meta">
          <span className="env"><i className="dot" />{mode === "real" ? "FONTES CONECTADAS" : "DADOS DE DEMONSTRAÇÃO"}</span>
          <div className="user-badge">IS</div>
        </div>
      </header>
      <div className="shell">
        <aside className="sidebar">
          <div className="side-label">SEARCH INTELLIGENCE</div>
          <nav className="side-nav" aria-label="Módulos">
            {NAV.map(([v, label], i) => (
              <button key={v} type="button" className={"nav-btn" + (view === v ? " active" : "")} onClick={() => setView(v)}>
                <span className="nav-icon">0{i + 1}</span>{label}
              </button>
            ))}
          </nav>
          <div className="side-foot"><strong>Nova finalidade</strong><br />Descobrir temas de campanha com maior demanda e aceleração de buscas por estado. Sem monitoramento de campanhas ativas.</div>
        </aside>
        <main className="main">
          {view === "radar" && (
            <section>
              <div className="pagehead">
                <div>
                  <div className="eyebrow">InvestSmart · Inteligência geográfica</div>
                  <h1>ONDE A DEMANDA <strong>ESTÁ CRESCENDO</strong></h1>
                  <p className="subtitle">Temas de campanhas, termos mais buscados e explosões de interesse por UF — Google Trends × Google Ads.</p>
                </div>
                <div className="head-tools">
                  <button type="button" className={"btn dark" + (loading ? " loading" : "")} disabled={loading} onClick={refresh}>
                    <span className="spinner">↻</span> Atualizar fontes
                  </button>
                </div>
              </div>
              <Notice mode={mode} lastUpdate={lastUpdate} />
              <div className="filters">
                <div className="filter"><label htmlFor="fPeriod">Período de análise</label>
                  <select id="fPeriod" className="field" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
                    <option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option>
                  </select></div>
                <div className="filter"><label htmlFor="fUF">Estado</label>
                  <select id="fUF" className="field" value={uf} onChange={(e) => { setUf(e.target.value); if (e.target.value) setFocusUF(e.target.value); setFocusTerm(""); }}>
                    <option value="">Brasil · Todas as UFs</option>
                    {UFS.map((s) => <option key={s} value={s}>{s} · {UF_NAMES[s]}</option>)}
                  </select></div>
                <div className="filter"><label htmlFor="fCategory">Tema para campanha</label>
                  <select id="fCategory" className="field" value={category} onChange={(e) => { setCategory(e.target.value); setFocusTerm(""); }}>
                    <option value="">Todos os temas</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div className="filter"><label htmlFor="fThreshold">Alerta de explosão</label>
                  <select id="fThreshold" className="field" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}>
                    {[50, 100, 150, 200].map((t) => <option key={t} value={t}>≥ {t}%</option>)}
                  </select></div>
                <div className="filter-actions">
                  <button className="btn" type="button" onClick={clear}>Limpar filtros</button>
                  <label className="toggle"><input type="checkbox" checked={onlyBurst} onChange={(e) => setOnlyBurst(e.target.checked)} />Só explosões</label>
                </div>
              </div>
              <Kpis rows={rows} threshold={threshold} pins={pinCount(rows, uf)} />
              <div className="radar-grid">
                <article className="card map-card">
                  <div className="card-head">
                    <div><div className="card-title">Mapa de calor · Brasil por estado</div>
                      <div className="card-sub">Clique em um estado ou nos marcadores de explosão para ver os termos daquela UF.</div></div>
                    <span className="tag dark">27 UFs INTERATIVAS</span>
                  </div>
                  <BrazilMap rows={rows} uf={uf} focusUF={fUF} threshold={threshold} onSelect={selectState} />
                </article>
                <aside className="card detail" aria-live="polite">
                  {!current ? (
                    <><div className="detail-eyebrow">UF SELECIONADA</div><h2>Sem sinais</h2><div className="note">Selecione outra UF ou altere os filtros para analisar termos buscados.</div></>
                  ) : (
                    <>
                      <div className="detail-eyebrow">EM FOCO · {current.uf} · {REGION[current.uf]}</div>
                      <h2>{UF_NAMES[current.uf]}</h2>
                      <div className="note">{current.term} · {period} dias · {mode === "demo" ? "demonstração fictícia" : "snapshot das fontes"}</div>
                      <div className="detail-kpis">
                        <div className="detail-kpi"><small>Crescimento Trends</small><strong className="growth">{fmtGrowth(current.growthPct)}</strong><em>Variação no recorte</em></div>
                        <div className="detail-kpi"><small>Índice Trends</small><strong>{current.trendIndex == null ? "—" : current.trendIndex + "/100"}</strong><em>Interesse relativo</em></div>
                        <div className="detail-kpi"><small>Buscas/mês Ads</small><strong>{fmtNum(current.avgMonthlySearches)}</strong><em>Média mensal histórica</em></div>
                        <div className="detail-kpi"><small>CPC médio Ads</small><strong>{fmtMoney(current.avgCpc)}</strong><em>Se retornado pela API</em></div>
                      </div>
                      <div className="detail-section">TEMAS DE CAMPANHA COM BUSCAS NA UF</div>
                      <div className="term-options">
                        {candidates.map((s) => (
                          <button key={s.id} type="button" className={"term-option" + (s.term === current.term ? " active" : "")} onClick={() => { setFocusUF(s.uf); setFocusTerm(s.term); }}>
                            <span><strong>{s.term}</strong><small>{s.category} · {fmtNum(s.avgMonthlySearches)} buscas/mês</small></span>
                            <em>{fmtGrowth(s.growthPct)}</em>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </aside>
              </div>
              <div className="dashboard-lower">
                <article className="card">
                  <div className="card-head">
                    <div><div className="card-title">Termos buscados por estado</div>
                      <div className="card-sub">Ordene por volume (mais buscados) ou por crescimento (explosões). Clique numa linha para aprofundar.</div></div>
                    <div className="table-tools">
                      <select className="field" aria-label="Ordenação" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
                        <option value="growth">Mais crescimento</option><option value="volume">Mais buscas/mês</option><option value="cpc">Maior CPC médio</option>
                      </select>
                    </div>
                  </div>
                  <SignalTable rows={rows} sort={sortBy} threshold={threshold} focus={current} onPick={focusRow} labels={["Tema de campanha", "Termo pesquisado", "Trends · Var.", "Trends · Índice", "Ads · Buscas/mês", "Ads · CPC médio"]} />
                </article>
                <aside className="card">
                  <div className="card-head"><div><div className="card-title">Explosões em destaque</div><div className="card-sub">Sinais com maior aceleração no período.</div></div><span className="tag">TOP 5</span></div>
                  <div className="alerts">
                    {(() => {
                      const top = rows.filter((s) => (s.growthPct ?? -Infinity) >= threshold).slice().sort(sorter("growthPct")).slice(0, 5);
                      return top.length ? top.map((s, i) => (
                        <button key={s.id} className="alert" type="button" onClick={() => { setFocusUF(s.uf); setUf(s.uf); setFocusTerm(s.term); }}>
                          <span className="alert-num">{i + 1}</span>
                          <span><strong>{s.term}</strong><small>{s.uf} · {fmtGrowth(s.growthPct)} · {fmtNum(s.avgMonthlySearches)} buscas/mês</small></span>
                        </button>
                      )) : <div className="empty">Nenhuma explosão encontrada com esse limite.</div>;
                    })()}
                  </div>
                </aside>
              </div>
            </section>
          )}

          {view === "ranking" && (
            <section>
              <div className="pagehead"><div><div className="eyebrow">Inteligência por UF</div><h1>RANKING DE <strong>BUSCAS REGIONAIS</strong></h1><p className="subtitle">Ranking de termos por estado, com volume médio e pressão de anúncios; sem monitoramento de campanhas em veiculação.</p></div></div>
              <Notice mode={mode} lastUpdate={lastUpdate} />
              <div className="filters">
                <div className="filter big"><label htmlFor="rankingSearch">Buscar palavra-chave</label><input className="field" id="rankingSearch" placeholder="Ex.: CDB, Tesouro, assessor..." value={rankSearch} onChange={(e) => setRankSearch(e.target.value)} /></div>
                <div className="filter"><label htmlFor="rankingUF">Estado</label><select className="field" id="rankingUF" value={rankUF} onChange={(e) => setRankUF(e.target.value)}><option value="">Todas as UFs</option>{UFS.map((s) => <option key={s} value={s}>{s} · {UF_NAMES[s]}</option>)}</select></div>
                <div className="filter"><label htmlFor="rankingSort">Ordenar por</label><select className="field" id="rankingSort" value={rankSort} onChange={(e) => setRankSort(e.target.value as SortKey)}><option value="volume">Maior volume mensal</option><option value="growth">Maior crescimento</option><option value="cpc">Maior CPC médio</option></select></div>
              </div>
              <article className="card">
                <div className="card-head"><div><div className="card-title">Busca de termos</div><div className="card-sub">Disponibilidade de CPC e volume depende da fonte autorizada.</div></div><span className="tag">PALAVRAS-CHAVE</span></div>
                <SignalTable
                  rows={active.filter((s) => (!rankUF || s.uf === rankUF) && (!rankSearch || norm(s.term).includes(norm(rankSearch))))}
                  sort={rankSort} threshold={threshold} focus={current} onPick={focusRow}
                  labels={["Tema", "Palavra-chave", "Crescimento Trends", "Índice Trends", "Volume médio Ads", "CPC médio Ads"]}
                />
              </article>
            </section>
          )}

          {view === "compare" && (
            <Compare active={active} term={compareTerm} setTerm={setCompareTerm} mode={mode} lastUpdate={lastUpdate}
              onPick={(s, term) => { setFocusUF(s); setUf(s); setFocusTerm(term); setView("radar"); }} />
          )}

          {view === "sources" && <Sources status={status} checkedAt={checkedAt} mode={mode} />}

          <footer className="footer"><span>INVESTSMART · SEARCH INTELLIGENCE</span><span>{mode === "demo" ? "Dados demonstrativos · Integrações pendentes" : "Dados das fontes conectadas"}</span></footer>
        </main>
      </div>
      <div className={"toast" + (toast ? " show" : "")} role="status">{toast}</div>
    </>
  );
}

function Notice({ mode, lastUpdate }: { mode: "demo" | "real"; lastUpdate: string | null }) {
  return (
    <div className={"notice" + (mode === "real" ? " real" : "")}>
      {mode === "real" ? (
        <span><strong>DADOS DAS FONTES</strong> · Consulta retornada pelos conectores configurados. Confira a disponibilidade das métricas por UF.</span>
      ) : (
        <span><strong>MODO DEMONSTRAÇÃO</strong> · Os números abaixo são fictícios e servem apenas para testar os filtros e a interação. Nenhuma API foi conectada.</span>
      )}
      <span className="flag">{mode === "real" && lastUpdate ? `ATUALIZADO: ${lastUpdate}` : "SEM SINCRONIZAÇÃO REAL"}</span>
    </div>
  );
}

function Kpis({ rows, threshold, pins }: { rows: Signal[]; threshold: number; pins: number }) {
  const ufs = new Set(rows.map((s) => s.uf)).size;
  const bursts = rows.filter((s) => (s.growthPct ?? -Infinity) >= threshold).length;
  const top = rows.slice().sort(sorter("growthPct"))[0];
  const vals: [string, string | number, string][] = [
    ["Estados com sinais", ufs, "UFs presentes no recorte"],
    ["Termos analisados", rows.length, "Palavras-chave por UF"],
    [`Termos ≥ ${threshold}%`, bursts, `Acima do limite · ${pins} ${pins === 1 ? "marcador" : "marcadores"} no mapa`],
    ["Maior alta", top ? fmtGrowth(top.growthPct) : "—", top ? `${top.uf} · ${top.term}` : "Sem sinais"],
  ];
  return (
    <div className="kpis" aria-live="polite">
      {vals.map((v) => (
        <div className="kpi" key={v[0]}><div className="kpi-label">{v[0]}</div><div className="kpi-value">{v[1]}</div><div className="kpi-caption">{v[2]}</div></div>
      ))}
    </div>
  );
}

function SignalTable({ rows, sort, threshold, focus, onPick, labels }: {
  rows: Signal[]; sort: SortKey; threshold: number; focus?: Signal | undefined; onPick: (s: Signal) => void; labels: string[];
}) {
  const sorted = rows.slice().sort(sorter(sortField(sort))).slice(0, 160);
  return (
    <div className="table-container">
      <table>
        <thead><tr><th>UF</th>{labels.map((l) => <th key={l}>{l}</th>)}<th>Concorrência</th></tr></thead>
        <tbody>
          {sorted.length ? sorted.map((s) => (
            <tr key={s.id} className={focus && s.uf === focus.uf && s.term === focus.term ? "selected-row" : ""} onClick={() => onPick(s)}>
              <td><strong>{s.uf}</strong></td><td>{s.category}</td><td><strong>{s.term}</strong></td>
              <td><span className={"growth" + ((s.growthPct ?? -Infinity) >= threshold ? " hot" : "")}>{fmtGrowth(s.growthPct)}</span></td>
              <td>{s.trendIndex == null ? "—" : s.trendIndex + "/100"}</td>
              <td><strong>{fmtNum(s.avgMonthlySearches)}</strong></td>
              <td>{fmtMoney(s.avgCpc)}</td>
              <td><span className="mini-pill">{s.competition || "—"}</span></td>
            </tr>
          )) : <tr><td colSpan={8} className="empty">Nenhum termo neste recorte. Revise os filtros.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function BrazilMap({ rows, uf, focusUF, threshold, onSelect }: {
  rows: Signal[]; uf: string; focusUF: string; threshold: number; onSelect: (s: string) => void;
}) {
  const byUF = new Map<string, Signal[]>();
  rows.forEach((s) => { if (!byUF.has(s.uf)) byUF.set(s.uf, []); byUF.get(s.uf)!.push(s); });
  const peaks = [...byUF.entries()].map(([state, recs]) => ({ state, count: recs.length, peak: Math.max(...recs.map((x) => x.growthPct ?? -Infinity)) }));
  const pins = peaks
    .sort((a, b) => Number(b.state === focusUF) - Number(a.state === focusUF) || b.peak - a.peak)
    .slice(0, uf ? 1 : MAX_PINS);
  const ordered = [...BRAZIL_STATES].sort((a, b) => Number(a.uf === focusUF) - Number(b.uf === focusUF));

  return (
    <div className="map-stage">
      <div className="br-map-wrap">
        <svg className="br-map" viewBox={MAP_VIEWBOX} role="img" aria-label="Mapa interativo dos estados brasileiros">
          {ordered.map((st) => {
            const arr = byUF.get(st.uf) || [];
            const sel = focusUF === st.uf;
            let fill = arr.length ? (arr.some((s) => (s.growthPct ?? -Infinity) >= threshold) ? "#7040BA" : REGION_BASE[REGION[st.uf] ?? ""]) : "#E5DDF0";
            if (uf && uf !== st.uf) fill = "#E5DDF0";
            return (
              <path key={st.uf} d={st.d} fill={fill} stroke={sel ? "#EBFF70" : "#fff"} strokeWidth={sel ? 2.2 : 0.8}
                style={{ filter: sel ? "drop-shadow(0 0 5px rgba(153,102,255,.6))" : undefined }}
                aria-label={UF_NAMES[st.uf]} role="button" tabIndex={0}
                onClick={() => onSelect(st.uf)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(st.uf); } }}>
                <title>{UF_NAMES[st.uf]}</title>
              </path>
            );
          })}
        </svg>
        <svg className="pin-leaders" viewBox={MAP_VIEWBOX} aria-hidden="true">
          {pins.map((p) => {
            const st = BRAZIL_STATES.find((s) => s.uf === p.state);
            const off = PIN_OFFSET[p.state];
            if (!st || !off) return null;
            return (
              <g key={p.state}>
                <line x1={st.cx} y1={st.cy} x2={off[0]} y2={off[1]} />
                <circle cx={st.cx} cy={st.cy} r={2.6} />
              </g>
            );
          })}
        </svg>
        <div className="map-pins">
          {pins.map((p) => {
            const st = BRAZIL_STATES.find((s) => s.uf === p.state);
            if (!st) return null;
            const burst = p.peak >= threshold;
            const [px, py] = PIN_OFFSET[p.state] ?? [st.cx, st.cy];
            const title = `${UF_NAMES[p.state]} · ${p.count} termos · pico de ${fmtGrowth(p.peak)}`;
            return (
              <button key={p.state} type="button" title={title} aria-label={title}
                className={"pin" + (burst ? " burst" : "") + (focusUF === p.state ? " selected" : "")}
                style={{ left: `${(px / 600) * 100}%`, top: `${(py / 600) * 100}%` }}
                onClick={() => onSelect(p.state)}>
                {burst ? "✳" : "•"}<span className="pin-label">{p.state}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="map-hint">Áreas em roxo: estados com sinais. Pontos neon: crescimento acima do limite selecionado.</div>
      <div className="legend">
        {pins.some((p) => p.peak >= threshold) && <span><b /> Pico ≥ {threshold}%</span>}
        {pins.some((p) => p.peak < threshold) && <span><b className="regular" /> Pico abaixo de {threshold}%</span>}
        {pins.length < byUF.size && <span>Top {pins.length} de {byUF.size} UFs</span>}
      </div>
    </div>
  );
}

function Compare({ active, term, setTerm, onPick, mode, lastUpdate }: {
  active: Signal[]; term: string; setTerm: (t: string) => void; onPick: (uf: string, term: string) => void; mode: "demo" | "real"; lastUpdate: string | null;
}) {
  const terms = [...new Set(active.map((s) => s.term))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const t = (term && terms.includes(term) ? term : terms[0]) ?? "";
  const data = active.filter((s) => s.term === t);
  const bars = (list: Signal[], key: "avgMonthlySearches" | "growthPct", fmt: (n: number | null) => string) => {
    if (!list.length) return <div className="empty">Dados indisponíveis.</div>;
    const top = Math.max(1, ...list.map((x) => x[key] ?? 0));
    return list.map((s) => (
      <div key={s.id} className="bar-row" style={{ cursor: "pointer" }} onClick={() => onPick(s.uf, t)}>
        <span className="bar-name">{s.uf} · {UF_NAMES[s.uf]}</span>
        <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(2, Math.min(100, ((s[key] || 0) / top) * 100))}%` }} /></div>
        <div className="bar-num">{fmt(s[key])}</div>
      </div>
    ));
  };
  return (
    <section>
      <div className="pagehead"><div><div className="eyebrow">Cross-state intelligence</div><h1>COMPARAR <strong>ESTADOS</strong></h1><p className="subtitle">Selecione um termo e compare a procura estimada e a aceleração da demanda entre UFs. Escalas de Trends só devem ser comparadas quando obtidas sob metodologia equivalente.</p></div></div>
      <Notice mode={mode} lastUpdate={lastUpdate} />
      <div className="compare-controls">
        <select className="field" aria-label="Termo comparado" value={t} onChange={(e) => setTerm(e.target.value)}>
          {terms.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <span className="tag">{data.length > 12 ? `TOP 12 DE ${data.length} UFs` : `${data.length} ${data.length === 1 ? "UF" : "UFs"} COM DADOS`}</span>
      </div>
      <div className="compare-grid">
        <article className="card"><div className="card-head"><div><div className="card-title">Buscas mensais médias · Google Ads</div><div className="card-sub">Volume estimado de busca por UF{data.length > 12 ? ` · Top 12 de ${data.length} UFs` : ""}.</div></div></div>
          <div className="compare-summary">{bars(data.slice().sort(sorter("avgMonthlySearches")).slice(0, 12), "avgMonthlySearches", fmtNum)}<p className="comp-note">Volume aproximado calculado pelo Google Ads; não é o índice relativo do Trends.</p></div></article>
        <article className="card"><div className="card-head"><div><div className="card-title">Crescimento de interesse · Google Trends</div><div className="card-sub">Variação relativa segundo o período selecionado{data.length > 12 ? ` · Top 12 de ${data.length} UFs` : ""}.</div></div></div>
          <div className="compare-summary">{bars(data.slice().sort(sorter("growthPct")).slice(0, 12), "growthPct", fmtGrowth)}<p className="comp-note">Variações devem ser obtidas usando a mesma janela e metodologia para permitir comparações.</p></div></article>
      </div>
    </section>
  );
}

const STATUS_LABEL: Record<string, [string, string]> = {
  limited_explorer: ["EXPLORER · BASIC PENDENTE", "warn"],
  pending_alpha: ["ALPHA PENDENTE", "warn"],
  connected: ["CONECTADO", "ok"],
  disabled: ["DESABILITADO", "off"],
};

function Sources({ status, checkedAt, mode }: { status: SourceStatus; checkedAt: string | null; mode: "demo" | "real" }) {
  const items: [string, string, string, string][] = [
    ["ADS", "Google Ads API", status.google_ads, "Projeto Google Cloud investsmart-intelligence. API habilitada, nível Explorer aprovado e leitura via GAQL validada com conta de serviço. KeywordPlanIdeaService (volume, CPC, concorrência, dados geográficos) aguarda aprovação BASIC e não é acionado."],
    ["TR", "Google Trends API", status.google_trends, "Inscrição no programa oficial Alpha enviada; aprovação pendente. Adaptador preparado, sem scraping e sem simular conexão."],
    ["DM", "Dados demonstrativos", mode === "demo" ? "demo" : "disabled", "Valores fictícios, determinísticos e explicitamente identificados. Não são números aleatórios nem representam dados reais do Google."],
  ];
  return (
    <section>
      <div className="pagehead"><div><div className="eyebrow">Fontes de dados</div><h1>GOOGLE INTELLIGENCE <strong>SEM COMPLEXIDADE</strong></h1><p className="subtitle">Atualização manual sob demanda, executada no servidor. Orçamento autorizado: R$ 0,00 — nenhum serviço pago ativado.</p></div></div>
      <div className="notice"><span><strong>Segurança:</strong> credenciais Google Ads, tokens OAuth e segredos nunca ficam no navegador. A consulta às fontes ocorre apenas no servidor.</span><span className="flag">{checkedAt ? `VERIFICADO: ${checkedAt}` : "INTEGRAÇÕES PENDENTES"}</span></div>
      <div className="method-grid">
        {items.map(([ic, name, st, desc]) => {
          const [label, tone] = st === "demo" ? ["EM USO", "demo"] : STATUS_LABEL[st] ?? [st, "off"];
          return (
            <article className="card method" key={name}>
              <span className="method-ic">{ic}</span>
              <h3>{name}</h3>
              <span className={"status-pill " + tone}>{label}</span>
              <p>{desc}</p>
            </article>
          );
        })}
      </div>
      <div className="method-grid" style={{ marginTop: 12 }}>
        <article className="card method"><span className="method-ic">TR</span><h3>Métricas do Trends</h3><p>Evolução relativa, índice de interesse (0–100), distribuição por estado e consultas em ascensão. Índices são relativos ao recorte e só são comparáveis entre UFs sob a mesma janela e metodologia.</p></article>
        <article className="card method"><span className="method-ic">ADS</span><h3>Métricas do Keyword Planner</h3><p>Médias mensais de pesquisa, concorrência e faixas de lance. O <strong>CPC médio</strong> histórico é condicional (<code>include_average_cpc</code>) e pode ficar indisponível; quando ausente, a interface mostra “Indisponível”.</p></article>
        <article className="card method"><span className="method-ic">↻</span><h3>Atualização sob demanda</h3><p>“Atualizar fontes” envia período, UF e tema ao servidor, que consulta os conectores habilitados e normaliza os dados. Sem conector aprovado, a plataforma mantém apenas o protótipo ilustrativo.</p></article>
      </div>
      <div className="notice" style={{ marginTop: 12 }}><span><strong>Como os dados demonstrativos são gerados:</strong> os valores-base são fixos e fictícios. Ao trocar o período, o crescimento é apenas simulado por fatores fixos (7 dias = ×1,28 · 30 dias = ×1,00 · 90 dias = ×0,67). Volume de buscas, índice Trends, CPC e concorrência permanecem iguais em todos os períodos e não representam dados atualizados do Google Ads nem do Google Trends.</span><span className="flag">DEMONSTRATIVO</span></div>
      <article className="card flow"><div className="flow-box"><strong>Selecionar filtros</strong><small>UF · tema · período</small></div><span className="arrow">→</span><div className="flow-box"><strong>Atualizar fontes</strong><small>Servidor protegido</small></div><span className="arrow">→</span><div className="flow-box"><strong>Radar interativo</strong><small>Trends × Google Ads</small></div></article>
    </section>
  );
}

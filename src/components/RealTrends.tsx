// Modo "Dados reais Google Trends": apenas índice 0–100 e variação em pontos.
// Nunca exibe volume, CPC, concorrência ou crescimento percentual.
import { useMemo, useState } from "react";
import { BrazilMap, pinCount, type MapCell } from "./BrazilMap";
import { REGION, UFS, UF_NAMES, norm } from "@/lib/intelligence";
import { fmtDate, fmtDateTime, fmtIdx, fmtPts, isStale, type TrendRecord, type TrendsFeed } from "@/lib/trends-feed";

type RSort = "index" | "delta";
const by = (k: RSort) => (a: TrendRecord, b: TrendRecord) => {
  const f = (r: TrendRecord) => (k === "index" ? r.indexNow : r.deltaPts) ?? -Infinity;
  return f(b) - f(a);
};

export interface FeedState { feed: TrendsFeed | null; error: string | null; readAt: string | null; loading: boolean }

export function RealNotice({ st }: { st: FeedState }) {
  const { feed, error, readAt } = st;
  if (!feed) {
    return (
      <div className="notice">
        <span><strong>DADOS REAIS INDISPONÍVEIS</strong> · {st.loading ? "Lendo o feed público do Google Trends…" : `Não foi possível ler o feed público: ${error ?? "erro desconhecido"}. Nenhum dado foi exibido no lugar.`}</span>
        <span className="flag">{st.loading ? "VERIFICANDO" : "FALHA NA LEITURA"}</span>
      </div>
    );
  }
  const stale = isStale(feed);
  return (
    <div className={"notice" + (stale ? "" : " real")}>
      <span>
        <strong>DADOS REAIS GOOGLE TRENDS</strong> · Semana de referência {fmtDate(feed.weekStart)}–{fmtDate(feed.weekEnd)} · Data da fonte {fmtDate(feed.sourceDate)} · Última verificação do feed {fmtDateTime(feed.lastCheck)} · Lido nesta página {readAt ?? "—"}
        {feed.isStaticSample && <> · <strong>AMOSTRA INICIAL ESTÁTICA</strong> (coleta automatizada ainda não validada)</>}
        {error && <> · Última releitura falhou: {error}</>}
      </span>
      <span className="flag">{stale ? "DADOS DESATUALIZADOS" : "ÍNDICE 0–100 · PONTOS"}</span>
    </div>
  );
}

function cellsOf(rows: TrendRecord[], minPts: number): MapCell[] {
  const m = new Map<string, TrendRecord[]>();
  rows.forEach((r) => { if (!m.has(r.uf)) m.set(r.uf, []); m.get(r.uf)!.push(r); });
  return [...m.entries()].map(([uf, recs]) => {
    const ds = recs.map((r) => r.deltaPts).filter((x): x is number => x != null);
    const peak = ds.length ? Math.max(...ds) : null;
    return { uf, count: recs.length, peak, hot: peak != null && peak >= minPts, title: `${UF_NAMES[uf]} · ${recs.length} termos · maior variação ${fmtPts(peak)}` };
  });
}

function Table({ rows, sort, focus, onPick, minPts }: { rows: TrendRecord[]; sort: RSort; focus?: TrendRecord | undefined; onPick: (r: TrendRecord) => void; minPts: number }) {
  const sorted = rows.slice().sort(by(sort)).slice(0, 200);
  return (
    <div className="table-container">
      <table>
        <thead><tr><th>UF</th><th>Termo</th><th>Destaque nacional</th><th>Índice atual</th><th>Índice anterior</th><th>Variação (pts)</th><th>Data da fonte</th></tr></thead>
        <tbody>
          {sorted.length ? sorted.map((r) => (
            <tr key={r.id} className={focus?.id === r.id ? "selected-row" : ""} onClick={() => onPick(r)}>
              <td><strong>{r.uf}</strong></td><td><strong>{r.term}</strong></td><td><span className="mini-pill">{r.source}</span></td>
              <td><strong>{fmtIdx(r.indexNow)}</strong></td><td>{fmtIdx(r.indexPrev)}</td>
              <td><span className={"growth" + ((r.deltaPts ?? -Infinity) >= minPts ? " hot" : "")}>{fmtPts(r.deltaPts)}</span></td>
              <td>{fmtDate(r.sourceDate)}</td>
            </tr>
          )) : <tr><td colSpan={7} className="empty">Sem dados neste recorte. Revise os filtros.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function RealRadar({ st, uf, setUf, focusUF, setFocusUF }: { st: FeedState; uf: string; setUf: (s: string) => void; focusUF: string; setFocusUF: (s: string) => void }) {
  const [term, setTerm] = useState("");
  const [source, setSource] = useState("");
  const [minPts, setMinPts] = useState(10);
  const [onlyUp, setOnlyUp] = useState(false);
  const [sort, setSort] = useState<RSort>("delta");
  const [focusId, setFocusId] = useState("");
  const all = st.feed?.records ?? [];
  const rows = useMemo(() => all.filter((r) => (!uf || r.uf === uf) && (!term || r.term === term) && (!source || r.source === source) && (!onlyUp || (r.deltaPts ?? -Infinity) >= minPts)), [all, uf, term, source, onlyUp, minPts]);
  const cells = cellsOf(rows, minPts);
  let fUF = uf || focusUF;
  if (!rows.some((r) => r.uf === fUF)) fUF = rows.slice().sort(by("delta"))[0]?.uf ?? fUF;
  const candidates = rows.filter((r) => r.uf === fUF).sort(by("delta"));
  const current = candidates.find((r) => r.id === focusId) ?? candidates[0];
  const select = (s: string) => { setUf(uf === s ? "" : s); setFocusUF(s); setFocusId(""); };
  const pick = (r: TrendRecord) => { setUf(r.uf); setFocusUF(r.uf); setFocusId(r.id); };
  const sources = [...new Set(all.map((r) => r.source))].sort();
  const top = rows.filter((r) => (r.deltaPts ?? -Infinity) >= minPts).sort(by("delta")).slice(0, 5);
  const best = rows.slice().sort(by("delta"))[0];
  const pins = pinCount(cells, uf);

  return (
    <>
      <div className="filters">
        <div className="filter"><label htmlFor="rUF">Estado</label>
          <select id="rUF" className="field" value={uf} onChange={(e) => { setUf(e.target.value); if (e.target.value) setFocusUF(e.target.value); setFocusId(""); }}>
            <option value="">Brasil · Todas as UFs</option>
            {UFS.map((s) => <option key={s} value={s}>{s} · {UF_NAMES[s]}</option>)}
          </select></div>
        <div className="filter"><label htmlFor="rTerm">Termo</label>
          <select id="rTerm" className="field" value={term} onChange={(e) => { setTerm(e.target.value); setFocusId(""); }}>
            <option value="">Todos os termos</option>
            {st.feed?.terms.map((t) => <option key={t} value={t}>{t}</option>)}
          </select></div>
        <div className="filter"><label htmlFor="rSource">Destaque nacional</label>
          <select id="rSource" className="field" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Top 25 e Top Rising</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select></div>
        <div className="filter"><label htmlFor="rMin">Alerta de alta</label>
          <select id="rMin" className="field" value={minPts} onChange={(e) => setMinPts(Number(e.target.value))}>
            {[5, 10, 20, 30].map((t) => <option key={t} value={t}>≥ +{t} pts</option>)}
          </select></div>
        <div className="filter-actions">
          <button className="btn" type="button" onClick={() => { setUf(""); setTerm(""); setSource(""); setMinPts(10); setOnlyUp(false); setFocusId(""); }}>Limpar filtros</button>
          <label className="toggle"><input type="checkbox" checked={onlyUp} onChange={(e) => setOnlyUp(e.target.checked)} />Só altas</label>
        </div>
      </div>
      <div className="kpis" aria-live="polite">
        {([
          ["Estados com dados", cells.length, `de 27 UFs · demais: Sem dados`],
          ["Registros UF × termo", rows.length, "Cobertura parcial"],
          [`Altas ≥ +${minPts} pts`, rows.filter((r) => (r.deltaPts ?? -Infinity) >= minPts).length, `${pins} ${pins === 1 ? "marcador" : "marcadores"} no mapa`],
          ["Maior variação", best ? fmtPts(best.deltaPts) : "—", best ? `${best.uf} · ${best.term}` : "Sem dados"],
        ] as [string, string | number, string][]).map((v) => (
          <div className="kpi" key={v[0]}><div className="kpi-label">{v[0]}</div><div className="kpi-value">{v[1]}</div><div className="kpi-caption">{v[2]}</div></div>
        ))}
      </div>
      <div className="radar-grid">
        <article className="card map-card">
          <div className="card-head">
            <div><div className="card-title">Interesse relativo · Brasil por estado</div>
              <div className="card-sub">Clique em um estado ou marcador. Estados em cinza: Sem dados (não significa zero).</div></div>
            <span className="tag dark">27 UFs INTERATIVAS</span>
          </div>
          <BrazilMap cells={cells} uf={uf} focusUF={fUF} onSelect={select}
            hint="Áreas em roxo: estados com dados no feed. Pontos neon: variação semanal acima do alerta."
            hotLabel={`Variação ≥ +${minPts} pts`} coldLabel={`Abaixo de +${minPts} pts ou sem comparação`} />
        </article>
        <aside className="card detail" aria-live="polite">
          {!current ? (
            <><div className="detail-eyebrow">UF SELECIONADA · {fUF}</div><h2>Sem dados</h2><div className="note">O feed não traz registros para este recorte. Ausência não equivale a índice zero.</div></>
          ) : (
            <>
              <div className="detail-eyebrow">EM FOCO · {current.uf} · {REGION[current.uf]}</div>
              <h2>{UF_NAMES[current.uf]}</h2>
              <div className="note">{current.term} · semana {fmtDate(current.week)} · Google Trends</div>
              <div className="detail-kpis">
                <div className="detail-kpi"><small>Índice atual</small><strong>{fmtIdx(current.indexNow)}</strong><em>Interesse relativo</em></div>
                <div className="detail-kpi"><small>Índice anterior</small><strong>{fmtIdx(current.indexPrev)}</strong><em>Semana completa anterior</em></div>
                <div className="detail-kpi"><small>Variação</small><strong className="growth">{fmtPts(current.deltaPts)}</strong><em>Em pontos de índice</em></div>
                <div className="detail-kpi"><small>Destaque nacional</small><strong style={{ fontSize: 14 }}>{current.source}</strong><em>Fonte {fmtDate(current.sourceDate)}</em></div>
              </div>
              <div className="detail-section">TERMOS COM DADOS NA UF</div>
              <div className="term-options">
                {candidates.map((r) => (
                  <button key={r.id} type="button" className={"term-option" + (r.id === current.id ? " active" : "")} onClick={() => setFocusId(r.id)}>
                    <span><strong>{r.term}</strong><small>{r.source} · índice {fmtIdx(r.indexNow)}</small></span>
                    <em>{fmtPts(r.deltaPts)}</em>
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
            <div><div className="card-title">Termos por estado</div><div className="card-sub">Índice 0–100 e variação em pontos entre semanas completas. Clique numa linha para aprofundar.</div></div>
            <div className="table-tools">
              <select className="field" aria-label="Ordenação" value={sort} onChange={(e) => setSort(e.target.value as RSort)}>
                <option value="delta">Maior variação (pts)</option><option value="index">Maior índice atual</option>
              </select>
            </div>
          </div>
          <Table rows={rows} sort={sort} focus={current} onPick={pick} minPts={minPts} />
        </article>
        <aside className="card">
          <div className="card-head"><div><div className="card-title">Maiores altas</div><div className="card-sub">Variação semanal em pontos de índice.</div></div><span className="tag">TOP 5</span></div>
          <div className="alerts">
            {top.length ? top.map((r, i) => (
              <button key={r.id} className="alert" type="button" onClick={() => pick(r)}>
                <span className="alert-num">{i + 1}</span>
                <span><strong>{r.term}</strong><small>{r.uf} · {fmtPts(r.deltaPts)} · índice {fmtIdx(r.indexNow)}</small></span>
              </button>
            )) : <div className="empty">Nenhuma alta com esse limite.</div>}
          </div>
        </aside>
      </div>
    </>
  );
}

export function RealRanking({ st, onPick }: { st: FeedState; onPick: (uf: string) => void }) {
  const [q, setQ] = useState("");
  const [uf, setUf] = useState("");
  const [sort, setSort] = useState<RSort>("index");
  const rows = (st.feed?.records ?? []).filter((r) => (!uf || r.uf === uf) && (!q || norm(r.term).includes(norm(q))));
  return (
    <>
      <div className="filters">
        <div className="filter big"><label htmlFor="rq">Buscar termo</label><input className="field" id="rq" placeholder="Ex.: selic, ibovespa..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="filter"><label htmlFor="ru">Estado</label><select className="field" id="ru" value={uf} onChange={(e) => setUf(e.target.value)}><option value="">Todas as UFs</option>{UFS.map((s) => <option key={s} value={s}>{s} · {UF_NAMES[s]}</option>)}</select></div>
        <div className="filter"><label htmlFor="rs">Ordenar por</label><select className="field" id="rs" value={sort} onChange={(e) => setSort(e.target.value as RSort)}><option value="index">Maior índice atual</option><option value="delta">Maior variação (pts)</option></select></div>
      </div>
      <article className="card">
        <div className="card-head"><div><div className="card-title">Ranking de interesse relativo</div><div className="card-sub">Índices relativos por série regional; não indicam quantidade de pesquisas.</div></div><span className="tag">GOOGLE TRENDS</span></div>
        <Table rows={rows} sort={sort} onPick={(r) => onPick(r.uf)} minPts={Infinity} />
      </article>
    </>
  );
}

export function RealCompare({ st, onPick }: { st: FeedState; onPick: (uf: string) => void }) {
  const terms = st.feed?.terms ?? [];
  const [term, setTerm] = useState("");
  const t = term && terms.includes(term) ? term : terms[0] ?? "";
  const byUF = new Map((st.feed?.records ?? []).filter((r) => r.term === t).map((r) => [r.uf, r]));
  const withData = UFS.filter((u) => byUF.has(u));
  const missing = UFS.filter((u) => !byUF.has(u));
  const bars = (key: "indexNow" | "deltaPts", fmt: (n: number | null) => string) => {
    const list = withData.map((u) => byUF.get(u)!).sort(by(key === "indexNow" ? "index" : "delta")).slice(0, 12);
    if (!list.length) return <div className="empty">Sem dados para este termo.</div>;
    const top = Math.max(1, ...list.map((r) => Math.abs(r[key] ?? 0)));
    return list.map((r) => (
      <div key={r.id} className="bar-row" style={{ cursor: "pointer" }} onClick={() => onPick(r.uf)}>
        <span className="bar-name">{r.uf} · {UF_NAMES[r.uf]}</span>
        <div className="bar-track"><div className="bar-fill" style={{ width: r[key] == null ? 0 : `${Math.max(2, Math.min(100, (Math.max(0, r[key]!) / top) * 100))}%` }} /></div>
        <div className="bar-num">{fmt(r[key])}</div>
      </div>
    ));
  };
  return (
    <>
      <div className="compare-controls">
        <select className="field" aria-label="Termo comparado" value={t} onChange={(e) => setTerm(e.target.value)}>
          {terms.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <span className="tag">{withData.length > 12 ? `TOP 12 DE ${withData.length} UFs` : `${withData.length} UFs COM DADOS`}</span>
      </div>
      <div className="compare-grid">
        <article className="card"><div className="card-head"><div><div className="card-title">Índice atual · Google Trends</div><div className="card-sub">Interesse relativo 0–100 na série regional do termo.</div></div></div>
          <div className="compare-summary">{bars("indexNow", fmtIdx)}<p className="comp-note">Índice relativo; não mede quantidade de pesquisas nem tamanho do mercado estadual.</p></div></article>
        <article className="card"><div className="card-head"><div><div className="card-title">Variação semanal · pontos de índice</div><div className="card-sub">Diferença entre semanas completas.</div></div></div>
          <div className="compare-summary">{bars("deltaPts", fmtPts)}<p className="comp-note">Variação em pontos, não em percentual. “Sem comparação” quando não há índice anterior.</p></div></article>
      </div>
      {missing.length > 0 && <div className="notice" style={{ marginTop: 12 }}><span><strong>Sem dados:</strong> {missing.join(", ")} — ausência no feed, não índice zero.</span><span className="flag">{missing.length} UFs</span></div>}
    </>
  );
}

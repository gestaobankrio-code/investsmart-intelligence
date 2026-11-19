import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import logo from "@/assets/investsmart-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import {
  RealCompare,
  RealNotice,
  RealRadar,
  RealRanking,
  type FeedState,
} from "@/components/RealTrends";
import { POLL_MS, feedAgeDays, fetchFeed, fmtDateTime, isStale } from "@/lib/trends-feed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InvestSmart — Inteligência Regional Google Trends" },
      {
        name: "description",
        content:
          "Termos financeiros nos destaques nacionais do Google Trends: índices relativos por UF e variações semanais em pontos, com cobertura parcial.",
      },
      { property: "og:title", content: "InvestSmart — Inteligência Regional Google Trends" },
      {
        property: "og:description",
        content:
          "Dados reais Google Trends: índices 0–100 e variações em pontos por estado, com cobertura parcial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type View = "radar" | "ranking" | "compare" | "sources";
const NAV: [View, string][] = [
  ["radar", "Radar Brasil"],
  ["ranking", "Ranking por UF"],
  ["compare", "Comparar Estados"],
  ["sources", "Fontes e Metodologia"],
];

function App() {
  const [view, setView] = useState<View>("radar");
  const [uf, setUf] = useState("");
  const [focusUF, setFocusUF] = useState("SP");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inFlight = useRef(false);
  const [feedSt, setFeedSt] = useState<FeedState>({
    feed: null,
    error: null,
    readAt: null,
    loading: true,
  });
  const showToast = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);
  const loadFeed = useCallback(
    async (manual = false) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setFeedSt((previous) => ({ ...previous, loading: true }));
      try {
        const feed = await fetchFeed();
        const readAt = new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date());
        setFeedSt({ feed, error: null, readAt, loading: false });
        if (manual)
          showToast(
            `Feed relido: ${feed.records.length} registros${isStale(feed) ? " · dados desatualizados" : ""}. Nenhuma nova consulta ao Google foi feita.`,
          );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // A failed reread can retain only the last successfully fetched real feed.
        setFeedSt((previous) => ({ ...previous, error: message, loading: false }));
        if (manual) showToast("Falha ao reler o feed: " + message);
      } finally {
        inFlight.current = false;
      }
    },
    [showToast],
  );
  useEffect(() => {
    void loadFeed();
    const interval = setInterval(() => void loadFeed(), POLL_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(toastTimer.current);
    };
  }, [loadFeed]);
  const pick = (state: string) => {
    setUf(state);
    setFocusUF(state);
    setView("radar");
  };
  const titles: Record<View, [string, string, string, string]> = {
    radar: [
      "InvestSmart · Inteligência geográfica",
      "ONDE A DEMANDA",
      "ESTÁ CRESCENDO",
      "Índice de interesse relativo (0–100) e variação semanal em pontos por UF — Google Trends.",
    ],
    ranking: [
      "Inteligência por UF",
      "RANKING DE",
      "BUSCAS REGIONAIS",
      "Ranking de termos por estado pelo índice de interesse relativo do Google Trends (0–100).",
    ],
    compare: [
      "Inteligência comparativa",
      "COMPARAR",
      "ESTADOS",
      "Selecione um termo e compare o índice de interesse relativo e a variação semanal em pontos entre UFs.",
    ],
    sources: [
      "Fontes de dados",
      "GOOGLE INTELLIGENCE",
      "SEM COMPLEXIDADE",
      "Feed público de dados reais. Orçamento autorizado: R$ 0,00 — nenhum serviço pago ativado.",
    ],
  };
  const title = titles[view];
  const health = !feedSt.feed
    ? feedSt.loading
      ? "loading"
      : "error"
    : isStale(feedSt.feed)
      ? "stale"
      : "ok";
  const healthLabel =
    health === "ok"
      ? "GOOGLE TRENDS · ATUALIZADO"
      : health === "stale"
        ? "GOOGLE TRENDS · DESATUALIZADO"
        : health === "loading"
          ? "VERIFICANDO DADOS"
          : "DADOS INDISPONÍVEIS";

  return (
    <>
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <header className="top">
        <div className="brand">
          <img alt="InvestSmart" src={logo.url} />
          <span className="brand-sep" />
          <strong>Central de Inteligência de Buscas</strong>
        </div>
        <div className="top-meta">
          <span className={"env " + health}>
            <i className="dot" aria-hidden="true" />
            {healthLabel}
          </span>
          <div className="user-badge" aria-hidden="true">
            IS
          </div>
        </div>
      </header>
      <div className="shell">
        <aside className="sidebar">
          <div className="side-label">INTELIGÊNCIA DE BUSCAS</div>
          <nav className="side-nav" aria-label="Módulos">
            {NAV.map(([value, label], index) => (
              <Button
                variant="ghost"
                key={value}
                type="button"
                aria-label={label}
                aria-pressed={view === value}
                className={"nav-btn" + (view === value ? " active" : "")}
                onClick={() => setView(value)}
              >
                <span className="nav-icon" aria-hidden="true">
                  0{index + 1}
                </span>
                <span className="nav-label">{label}</span>
              </Button>
            ))}
          </nav>
          <div className="side-foot">
            <strong>Inteligência regional</strong>
            <br />
            Termos financeiros entre os destaques nacionais do Google Trends, com cobertura parcial
            por UF.
          </div>
        </aside>
        <main className="main" id="conteudo-principal" tabIndex={-1}>
          <section>
            <div className="pagehead">
              <div>
                <div className="eyebrow">{title[0]}</div>
                <h1>
                  {title[1]} <strong>{title[2]}</strong>
                </h1>
                <p className="subtitle">{title[3]}</p>
              </div>
              <div className="head-tools">
                <VerifyBtn st={feedSt} onClick={() => void loadFeed(true)} />
              </div>
            </div>
            <RealNotice st={feedSt} />
            {!feedSt.feed && <FeedEmptyState st={feedSt} onRetry={() => void loadFeed(true)} />}
            {view === "radar" && feedSt.feed && (
              <RealRadar
                st={feedSt}
                uf={uf}
                setUf={setUf}
                focusUF={focusUF}
                setFocusUF={setFocusUF}
              />
            )}
            {view === "ranking" && feedSt.feed && <RealRanking st={feedSt} onPick={pick} />}
            {view === "compare" && feedSt.feed && <RealCompare st={feedSt} onPick={pick} />}
            {view === "sources" && <Sources feed={feedSt} />}
          </section>
          <footer className="footer">
            <span>INVESTSMART · INTELIGÊNCIA DE BUSCAS</span>
            <span>Google Trends · índice relativo 0–100 · cobertura parcial</span>
          </footer>
        </main>
      </div>
      <div className={"toast" + (toast ? " show" : "")} role="status">
        {toast}
      </div>
    </>
  );
}

function VerifyBtn({ st, onClick }: { st: FeedState; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      type="button"
      className={"btn" + (st.loading ? " loading" : "")}
      disabled={st.loading}
      aria-busy={st.loading}
      onClick={onClick}
    >
      <span className="spinner" aria-hidden="true">
        ↻
      </span>
      {st.error ? "Tentar novamente" : st.loading ? "Verificando..." : "Verificar atualizações"}
    </Button>
  );
}

function FeedEmptyState({ st, onRetry }: { st: FeedState; onRetry: () => void }) {
  const failed = !st.loading && Boolean(st.error);
  return (
    <section className={"system-state " + (failed ? "error" : "loading")} aria-live="polite">
      <div className="system-state-icon" aria-hidden="true">
        {failed ? "!" : "↻"}
      </div>
      <div>
        <strong>
          {failed ? "Não foi possível carregar os dados" : "Carregando inteligência regional"}
        </strong>
        <p>
          {failed
            ? "A plataforma não substitui falhas por dados simulados. Tente novamente; a leitura possui origem redundante."
            : "Estamos validando o feed público e a integridade dos registros antes de exibir os indicadores."}
        </p>
      </div>
      {failed && (
        <Button type="button" className="btn" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </section>
  );
}

function Sources({ feed }: { feed: FeedState }) {
  const items: [string, string, string, string, string][] = [
    [
      "ADS",
      "Google Ads API",
      "EXPLORER · BASIC PENDENTE",
      "warn",
      "Nível Explorer aprovado; BASIC pendente. O adaptador está desabilitado e não é acionado pela interface pública.",
    ],
    [
      "TR",
      "Google Trends API",
      "ALPHA PENDENTE",
      "warn",
      "Aprovação Alpha pendente. Esta API não é utilizada para carregar os dados públicos da plataforma.",
    ],
    [
      "FD",
      "Feed público Google Trends",
      feed.feed
        ? isStale(feed.feed)
          ? "LIDO · DESATUALIZADO"
          : "LIDO · ATUAL"
        : feed.loading
          ? "VERIFICANDO"
          : "FALHA NA LEITURA",
      feed.feed && !isStale(feed.feed) ? "ok" : "warn",
      feed.feed
        ? `Leitura redundante sem credenciais (${feed.feed.origin ?? "origem não identificada"}). ${feed.feed.records.length} registros · ${feed.feed.terms.length} termos · ${new Set(feed.feed.records.map((r) => r.uf)).size} UFs. Extração: ${feed.feed.generatedAt ? fmtDateTime(feed.feed.generatedAt) : "não informada"} · idade da fonte: ${feedAgeDays(feed.feed) ?? "?"} dias. ${feed.feed.isStaticSample ? "AMOSTRA ESTÁTICA; coleta automatizada ainda não validada." : "Dados reais do feed; atualização automática da coleta deve ser validada separadamente."}`
        : "O feed público não pôde ser lido. Nenhum dado fictício é exibido em substituição.",
    ],
  ];
  return (
    <>
      <div className="notice">
        <span>
          <strong>Segurança:</strong> o navegador lê somente os dois arquivos públicos no GitHub
          Pages, sem credenciais Google e sem consultas diretas ao BigQuery ou às APIs Google Ads e
          Google Trends.
        </span>
        <span className="flag">SOMENTE LEITURA</span>
      </div>
      <div className="method-grid">
        {items.map(([icon, name, label, tone, description]) => (
          <article className="card method" key={name}>
            <span className="method-ic">{icon}</span>
            <h3>{name}</h3>
            <span className={"status-pill " + tone}>{label}</span>
            <p>{description}</p>
          </article>
        ))}
      </div>
      <div className="method-grid" style={{ marginTop: 12 }}>
        <article className="card method">
          <span className="method-ic">FD</span>
          <h3>Dados reais Google Trends</h3>
          <p>
            Termos financeiros identificados entre os destaques nacionais <strong>Top 25</strong> e{" "}
            <strong>Top Rising</strong>, com <strong>cobertura parcial por UF</strong>. Somente
            índice de interesse relativo (0–100) e variação em <strong>pontos de índice</strong>{" "}
            entre semanas completas. Sem índice anterior: “Sem comparação”. UF ausente: “Sem dados”,
            não zero.
          </p>
        </article>
        <article className="card method">
          <span className="method-ic">TR</span>
          <h3>Índices e comparabilidade</h3>
          <p>
            Os índices não indicam quantidade absoluta de pesquisas nem tamanho de mercados
            estaduais. Variação em pontos não é crescimento percentual. Comparações regionais
            requerem a mesma janela e metodologia.
          </p>
        </article>
        <article className="card method">
          <span className="method-ic">↻</span>
          <h3>Verificação do feed</h3>
          <p>
            Releitura ao abrir a plataforma, a cada 30 minutos e pela verificação manual, sem novas
            consultas ao BigQuery. Dados com mais de 14 dias são marcados como desatualizados. A
            verificação do feed não confirma nova extração nem agendamento automático.
          </p>
        </article>
        <article className="card method">
          <span className="method-ic">FD</span>
          <h3>Falhas de leitura</h3>
          <p>
            Não há substituição por dados simulados. Se a primeira leitura falhar, os indicadores
            permanecem indisponíveis. Se uma releitura falhar, a última leitura real permanece
            identificada com seu horário e o aviso de falha.
          </p>
        </article>
      </div>
      <article className="card flow">
        <div className="flow-box">
          <strong>Extração validada</strong>
          <small>Google Trends · BigQuery</small>
        </div>
        <span className="arrow">→</span>
        <div className="flow-box">
          <strong>Feed público</strong>
          <small>GitHub Pages</small>
        </div>
        <span className="arrow">→</span>
        <div className="flow-box">
          <strong>Radar interativo</strong>
          <small>Índices relativos por UF</small>
        </div>
      </article>
    </>
  );
}

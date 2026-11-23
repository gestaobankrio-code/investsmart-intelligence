import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Compass, ListFilter, MapPinned, Database } from "lucide-react";
import { AppSplash } from "@/components/AppSplash";
import { StateRadar } from "@/components/StateRadar";
import logo from "@/assets/investsmart-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { RealNotice, type FeedState } from "@/components/RealTrends";
import { FinancialTermsPage } from "@/components/FinancialTermsPage";
import { CompareStatesPage } from "@/components/CompareStatesPage";
import "@/styles/finance-pages.css";
import { POLL_MS, feedAgeDays, fetchFeed, fmtDateTime, isStale } from "@/lib/trends-feed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InvestSmart — Inteligência Regional Google Trends" },
      {
        name: "description",
        content:
          "Assuntos financeiros reais encontrados em consultas específicas por UF no Google Trends, com exploração e comparação entre estados.",
      },
      { property: "og:title", content: "InvestSmart — Inteligência Regional Google Trends" },
      {
        property: "og:description",
        content:
          "Explore termos financeiros presentes nos destaques regionais do Google Trends e compare estados sem dados simulados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type View = "radar" | "ranking" | "compare" | "sources";
const NAV: [View, string][] = [
  ["radar", "Tendências por UF"],
  ["ranking", "Termos financeiros"],
  ["compare", "Comparar Estados"],
  ["sources", "Fontes e Metodologia"],
];

const MOBILE_NAV = [
  { value: "radar" as View, label: "Radar", Icon: Compass },
  { value: "ranking" as View, label: "Termos", Icon: ListFilter },
  { value: "compare" as View, label: "Estados", Icon: MapPinned },
  { value: "sources" as View, label: "Fontes", Icon: Database },
];

function App() {
  const [view, setView] = useState<View>("radar");
  const [uf, setUf] = useState("");
  const [focusUF, setFocusUF] = useState("SP");
  const [toast, setToast] = useState<string | null>(null);
  const [stateRefreshVersion, setStateRefreshVersion] = useState(0);
  const [crossViewTerm, setCrossViewTerm] = useState("");
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
  const openCompareTerm = (term: string) => {
    setCrossViewTerm(term);
    setView("compare");
  };
  const openTermDetails = (term: string) => {
    setCrossViewTerm(term);
    setView("ranking");
  };
  const titles: Record<View, [string, string, string, string]> = {
    radar: [
      "InvestSmart · Inteligência geográfica",
      "TENDÊNCIAS",
      "POR ESTADO",
      "Assuntos financeiros descobertos diretamente no Google Trends de cada UF.",
    ],
    ranking: [
      "Pesquisa financeira · Estados brasileiros",
      "TERMOS",
      "FINANCEIROS",
      "Explore expressões reais encontradas nas tendências de cada UF, com fonte e data.",
    ],
    compare: [
      "Análise comparativa · Consultas estaduais",
      "COMPARAR",
      "ESTADOS",
      "Descubra quais assuntos aparecem em duas ou três UFs, sem estimar demanda.",
    ],
    sources: [
      "Fontes de dados",
      "GOOGLE INTELLIGENCE",
      "SEM COMPLEXIDADE",
      "Dados reais com relevância financeira validada. Sem volume estimado, sem dados simulados.",
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
      <AppSplash />
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
            {view === "sources" ? healthLabel : "GOOGLE TRENDS · CONSULTA POR UF"}
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
            Tendências financeiras consultadas por UF no Google Trends. A fonte nacional do BigQuery
            permanece identificada na metodologia.
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
                {(view === "radar" || view === "sources") && (
                  <VerifyBtn
                    st={view === "radar" ? { ...feedSt, loading: false, error: null } : feedSt}
                    onClick={() => {
                      if (view === "radar") {
                        setStateRefreshVersion((value) => value + 1);
                        showToast("Reconsultando o feed estadual publicado.");
                      } else {
                        void loadFeed(true);
                      }
                    }}
                  />
                )}
              </div>
            </div>
            {view === "sources" && <RealNotice st={feedSt} />}
            {view === "sources" && !feedSt.feed && (
              <FeedEmptyState st={feedSt} onRetry={() => void loadFeed(true)} />
            )}
            {view === "radar" && (
              <StateRadar
                uf={uf}
                setUf={setUf}
                focusUF={focusUF}
                setFocusUF={setFocusUF}
                refreshVersion={stateRefreshVersion}
              />
            )}
            {view === "ranking" && (
              <FinancialTermsPage focusTerm={crossViewTerm} onCompare={openCompareTerm} />
            )}
            {view === "compare" && (
              <CompareStatesPage focusTerm={crossViewTerm} onExploreTerm={openTermDetails} />
            )}
            {view === "sources" && <Sources feed={feedSt} />}
          </section>
          <footer className="footer">
            <span>INVESTSMART · INTELIGÊNCIA DE BUSCAS</span>
            <span>Google Trends · termos reais por UF · sem estimativas de volume de mercado</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-tabbar" aria-label="Navegação principal do aplicativo">
        {MOBILE_NAV.map(({ value, label, Icon }) => (
          <button
            key={value}
            className={"mobile-tab" + (view === value ? " selected" : "")}
            type="button"
            aria-current={view === value ? "page" : undefined}
            onClick={() => setView(value)}
          >
            <Icon size={21} strokeWidth={view === value ? 2.3 : 1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
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
      "UF",
      "Google Trends por estado",
      "TRENDING NOW · 7 DIAS · POR UF",
      "ok",
      "Radar, Termos financeiros e Comparar Estados usam consultas geográficas independentes (geo=BR-UF) à página pública Trending Now, na janela de sete dias. A categoria Negócios e Finanças é validada com regras de pertinência. Falta de termo não é substituída por destaques nacionais.",
    ],
    [
      "ADS",
      "Google Ads API",
      "EXPLORER · NÃO CONECTADO",
      "warn",
      "A conta Google Ads ainda precisa de autorização OAuth para leitura de dados. O nível Explorer não libera KeywordPlanIdeaService; o nível Basic é necessário para ideias e planejamento de palavras-chave.",
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
      "Destaques nacionais do BigQuery",
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
          <strong>Segurança:</strong> o navegador lê os feeds estaduais e nacionais publicados no
          GitHub Pages, sem credenciais Google e sem consultas diretas ao BigQuery ou às APIs Google
          Ads e Google Trends.
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
          <h3>Termos descobertos por UF</h3>
          <p>
            Radar, Termos financeiros e Comparar Estados usam o Trending Now por localização e
            mostram somente expressões identificadas no recorte. Um termo repetido entre UFs pode
            ser legítimo. Nenhum número apresentado representa volume absoluto de buscas.
          </p>
        </article>
        <article className="card method">
          <span className="method-ic">TR</span>
          <h3>Comparabilidade e cobertura</h3>
          <p>
            A matriz compara a presença de termos nas UFs selecionadas, não a quantidade de
            pesquisas. A fonte de sete dias não apresenta todas as buscas. O BigQuery nacional é uma
            fonte distinta e não preenche lacunas nas consultas estaduais.
          </p>
        </article>
        <article className="card method">
          <span className="method-ic">↻</span>
          <h3>Verificação do feed</h3>
          <p>
            O navegador relê o feed estadual ao abrir o módulo, a cada 30 minutos e pela atualização
            manual. Dados estaduais com mais de 12 horas são sinalizados. A atualização de tela não
            executa nova coleta no Google.
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
          <small>Trending Now por UF + BigQuery nacional</small>
        </div>
        <span className="arrow">→</span>
        <div className="flow-box">
          <strong>Feed público</strong>
          <small>GitHub Pages</small>
        </div>
        <span className="arrow">→</span>
        <div className="flow-box">
          <strong>Radar interativo</strong>
          <small>Exploração e comparação de termos reais por UF</small>
        </div>
      </article>
    </>
  );
}

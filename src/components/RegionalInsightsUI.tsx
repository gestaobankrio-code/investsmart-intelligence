import { AlertCircle, CalendarDays, Database, RefreshCw } from "lucide-react";
import { fmtDateTime } from "@/lib/trends-feed";
import type { RegionalFeedState } from "@/hooks/useRegionalFeed";

const isFeedAged = (generatedAt: string) => {
  const age = Date.now() - Date.parse(generatedAt);
  return !Number.isFinite(age) || age > 12 * 60 * 60 * 1000;
};

export function RegionalSourceBar({ state }: { state: RegionalFeedState }) {
  const { feed, loading, error, refresh } = state;
  const stale = feed ? isFeedAged(feed.generatedAt) : false;
  return (
    <div className={"fi-source" + (error || stale ? " fi-source-warning" : "")} role="status">
      <div className="fi-source-content">
        <div className="fi-source-icon" aria-hidden="true">
          {error || stale ? <AlertCircle size={17} /> : <Database size={17} />}
        </div>
        <div>
          <strong>
            {error
              ? "Falha na atualização do feed"
              : stale
                ? "Dados disponíveis de coleta anterior"
                : "Fonte estadual verificada"}
          </strong>
          <span>
            Google Trends Trending Now · Consultas por UF · 7 dias
            {feed && <> · Atualizado em {fmtDateTime(feed.generatedAt)}</>}
            {error && feed && <> · Últimos dados válidos preservados</>}
          </span>
        </div>
      </div>
      <button className="fi-refresh" type="button" onClick={refresh} disabled={loading}>
        <RefreshCw size={15} className={loading ? "fi-spin" : ""} aria-hidden="true" />
        {loading ? "Conferindo" : "Atualizar"}
      </button>
    </div>
  );
}

export function RegionalAwait({ state }: { state: RegionalFeedState }) {
  if (state.feed) return null;
  return (
    <div className="fi-await" role="status">
      <div className="fi-await-icon" aria-hidden="true">
        {state.loading ? <RefreshCw size={27} className="fi-spin" /> : <AlertCircle size={27} />}
      </div>
      <h2>{state.loading ? "Lendo o painel regional" : "Não foi possível validar a fonte"}</h2>
      <p>
        {state.loading
          ? "Conferindo a origem e os registros das 27 UFs. Nenhum dado é criado durante o carregamento."
          : "Sem acesso ao feed estadual, não substituímos as pesquisas por tendências nacionais ou exemplos."}
      </p>
      {!state.loading && (
        <button type="button" className="fi-button fi-button-primary" onClick={state.refresh}>
          <RefreshCw size={16} aria-hidden="true" /> Tentar novamente
        </button>
      )}
    </div>
  );
}

export function RegionalFact({
  label,
  value,
  detail,
  icon,
  primary = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon?: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <div className={"fi-fact" + (primary ? " fi-fact-primary" : "")}>
      <div className="fi-fact-top">
        <span>{label}</span>
        {icon && <span aria-hidden="true">{icon}</span>}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export function RegionalMethodNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={"fi-method-note" + (compact ? " fi-method-compact" : "")}>
      <CalendarDays size={17} aria-hidden="true" />
      <p>
        <strong>Como interpretar:</strong> os termos são tendências efetivamente encontradas nas
        consultas de cada UF. A repetição de um termo em dois estados é possível. Os totais
        representam ocorrências no recorte, não volume absoluto de buscas, participação de mercado
        ou potencial comercial. Não encontrar um termo não significa ausência de demanda.
      </p>
    </div>
  );
}

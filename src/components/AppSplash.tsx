import { useEffect, useState } from "react";
import logo from "@/assets/investsmart-logo.png.asset.json";

/**
 * Splash visual de abertura. Não indica progresso de download ou de coleta:
 * nenhuma porcentagem é fabricada e o painel segue funcionando sob a animação.
 */
export function AppSplash() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setVisible(false), reducedMotion ? 120 : 1350);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="app-splash" role="status" aria-label="Iniciando InvestSmart Intelligence">
      <div className="splash-ambient splash-ambient-a" aria-hidden="true" />
      <div className="splash-ambient splash-ambient-b" aria-hidden="true" />
      <div className="splash-center">
        <div className="splash-mark">
          <img src={logo.url} alt="InvestSmart" />
        </div>
        <span className="splash-overline">INVESTSMART INTELLIGENCE</span>
        <h2>Inteligência de mercado.</h2>
        <p>Dados reais. Decisões fundamentadas.</p>
        <div className="splash-track" aria-hidden="true">
          <span />
        </div>
      </div>
      <button type="button" className="splash-skip" onClick={() => setVisible(false)}>
        Pular introdução
      </button>
      <span className="splash-footer">InvestSmart · Plataforma de inteligência</span>
    </div>
  );
}

import { useEffect, useState } from "react";
import logo from "@/assets/investsmart-logo.png.asset.json";

const SPLASH_DURATION_MS = 6000;
const OPENING_MESSAGES = [
  "Preparando uma nova perspectiva do mercado.",
  "Cada região revela sinais diferentes.",
  "Uma visão mais clara começa aqui.",
] as const;

/**
 * Splash visual e editorial. A faixa é indeterminada: não simula
 * percentual de carregamento nem afirma que a coleta de dados terminou.
 * É dispensável pelo usuário e respeita preferência de movimento reduzido.
 */
export function AppSplash() {
  const [visible, setVisible] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const close = window.setTimeout(
      () => setVisible(false),
      reducedMotion ? 120 : SPLASH_DURATION_MS,
    );
    const steps = reducedMotion
      ? []
      : [
          window.setTimeout(() => setMessageIndex(1), 1900),
          window.setTimeout(() => setMessageIndex(2), 3900),
        ];
    return () => {
      window.clearTimeout(close);
      steps.forEach(window.clearTimeout);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="app-splash" role="status" aria-label="Iniciando InvestSmart Intelligence">
      <div className="splash-ambient splash-ambient-a" aria-hidden="true" />
      <div className="splash-ambient splash-ambient-b" aria-hidden="true" />
      <div className="splash-center">
        <img className="splash-logo" src={logo.url} alt="InvestSmart" />
        <span className="splash-overline">INVESTSMART INTELLIGENCE</span>
        <h2>Sua próxima decisão começa com inteligência.</h2>
        <p className="splash-description">Dados reais. Uma nova forma de enxergar o mercado.</p>
        <div className="splash-loading" aria-live="polite" aria-atomic="true">
          <span className="splash-loading-label">INICIANDO SUA EXPERIÊNCIA</span>
          <p className="splash-loading-message" key={messageIndex}>
            {OPENING_MESSAGES[messageIndex]}
          </p>
        </div>
        <div className="splash-track" aria-hidden="true">
          <span />
        </div>
      </div>
      <button type="button" className="splash-skip" onClick={() => setVisible(false)}>
        Pular introdução
      </button>
      <span className="splash-footer">InvestSmart · Inteligência de mercado</span>
    </div>
  );
}

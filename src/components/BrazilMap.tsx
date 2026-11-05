import { BRAZIL_STATES, MAP_VIEWBOX } from "@/data/brazil-map";
import { REGION, REGION_BASE, UF_NAMES } from "@/lib/intelligence";

/** Resumo por UF consumido pelo mapa (independente da fonte). */
export interface MapCell {
  uf: string;
  count: number;
  /** Valor usado para ordenar marcadores; null = sem comparação. */
  peak: number | null;
  hot: boolean;
  title: string;
}

/** Quantidade máxima de marcadores no mapa. */
export const MAX_PINS = 15;
export const pinCount = (cells: MapCell[], uf: string) => Math.min(cells.length, uf ? 1 : MAX_PINS);

/** Deslocamento dos marcadores em UFs pequenas/adjacentes (coordenadas do viewBox 600x600). */
const PIN_OFFSET: Record<string, [number, number]> = {
  RN: [602, 124], PB: [602, 170], PE: [602, 216], AL: [602, 262], SE: [586, 308],
  DF: [416, 294], GO: [350, 330], ES: [534, 374], RJ: [490, 432],
};

export function BrazilMap({ cells, uf, focusUF, onSelect, hint, hotLabel, coldLabel }: {
  cells: MapCell[]; uf: string; focusUF: string; onSelect: (s: string) => void;
  hint: string; hotLabel: string; coldLabel: string;
}) {
  const byUF = new Map(cells.map((c) => [c.uf, c]));
  const pins = cells
    .slice()
    .sort((a, b) => Number(b.uf === focusUF) - Number(a.uf === focusUF) || (b.peak ?? -Infinity) - (a.peak ?? -Infinity))
    .slice(0, uf ? 1 : MAX_PINS);
  const ordered = [...BRAZIL_STATES].sort((a, b) => Number(a.uf === focusUF) - Number(b.uf === focusUF));

  return (
    <div className="map-stage">
      <div className="br-map-wrap">
        <svg className="br-map" viewBox={MAP_VIEWBOX} role="img" aria-label="Mapa interativo dos estados brasileiros">
          {ordered.map((st) => {
            const c = byUF.get(st.uf);
            const sel = focusUF === st.uf;
            let fill = c ? (c.hot ? "#7040BA" : REGION_BASE[REGION[st.uf] ?? ""]) : "#E5DDF0";
            if (uf && uf !== st.uf) fill = "#E5DDF0";
            return (
              <path key={st.uf} d={st.d} fill={fill} stroke={sel ? "#EBFF70" : "#fff"} strokeWidth={sel ? 2.2 : 0.8}
                style={{ filter: sel ? "drop-shadow(0 0 5px rgba(153,102,255,.6))" : undefined }}
                aria-label={UF_NAMES[st.uf]} role="button" tabIndex={0}
                onClick={() => onSelect(st.uf)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(st.uf); } }}>
                <title>{c ? c.title : `${UF_NAMES[st.uf]} · Sem dados`}</title>
              </path>
            );
          })}
        </svg>
        <svg className="pin-leaders" viewBox={MAP_VIEWBOX} aria-hidden="true">
          {pins.map((p) => {
            const st = BRAZIL_STATES.find((s) => s.uf === p.uf);
            const off = PIN_OFFSET[p.uf];
            if (!st || !off) return null;
            return (
              <g key={p.uf}>
                <line x1={st.cx} y1={st.cy} x2={off[0]} y2={off[1]} />
                <circle cx={st.cx} cy={st.cy} r={2.6} />
              </g>
            );
          })}
        </svg>
        <div className="map-pins">
          {pins.map((p) => {
            const st = BRAZIL_STATES.find((s) => s.uf === p.uf);
            if (!st) return null;
            const [px, py] = PIN_OFFSET[p.uf] ?? [st.cx, st.cy];
            return (
              <button key={p.uf} type="button" title={p.title} aria-label={p.title}
                className={"pin" + (PIN_OFFSET[p.uf] ? " side" : "") + (p.hot ? " burst" : "") + (focusUF === p.uf ? " selected" : "")}
                style={{ left: `${(px / 600) * 100}%`, top: `${(py / 600) * 100}%` }}
                onClick={() => onSelect(p.uf)}>
                {p.hot ? "✳" : "•"}<span className="pin-label">{p.uf}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="map-hint">{hint}</div>
      <div className="legend">
        {pins.some((p) => p.hot) && <span><b /> {hotLabel}</span>}
        {pins.some((p) => !p.hot) && <span><b className="regular" /> {coldLabel}</span>}
        {pins.length < cells.length && <span>Top {pins.length} de {cells.length} UFs</span>}
      </div>
    </div>
  );
}

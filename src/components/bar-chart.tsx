import { money0 } from '@/lib/format';

/** Simple vertical bar chart drawn in SVG. Values are rupees. */
export function BarChart({ data, height = 180 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const W = 640, H = height, left = 52, bottom = 22, top = 10;
  const plotH = H - bottom - top;
  const bw = (W - left) / data.length;
  const ticks = [0, 0.5, 1].map((t) => t * nice);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Bar chart">
      {ticks.map((t) => {
        const y = top + plotH - (t / nice) * plotH;
        return (
          <g key={t}>
            <line x1={left} x2={W} y1={y} y2={y} stroke="#e7e5e4" />
            <text x={left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#78716c">{short(t)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (d.value / nice) * plotH;
        const x = left + i * bw + bw * 0.18;
        return (
          <g key={i}>
            <rect x={x} y={top + plotH - h} width={bw * 0.64} height={Math.max(h, d.value ? 1 : 0)} rx="3" fill="#7c3aed">
              <title>{`${d.label}: ${money0(d.value)}`}</title>
            </rect>
            {(data.length <= 16 || i % Math.ceil(data.length / 12) === 0) && (
              <text x={x + bw * 0.32} y={H - 6} textAnchor="middle" fontSize="11" fill="#78716c">{d.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function niceMax(n: number) {
  const p = Math.pow(10, Math.floor(Math.log10(n)));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((v) => v >= n) ?? n;
}
const short = (n: number) => (n >= 100000 ? `₹${+(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${+(n / 1000).toFixed(1)}k` : `₹${n}`);

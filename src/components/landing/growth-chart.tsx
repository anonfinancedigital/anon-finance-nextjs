import { useId } from "react";

const MONTHS = 360;
const CONTRIBUTION = 2500;
const MONTHLY_RATE = 0.007;
const MONTHLY_COST = 6000;
const W = 400;
const H = 200;
const PAD = 8;

/** Illustrative figures only: balance of fixed monthly deposits at a fixed monthly rate. */
function series() {
  const balance: number[] = [0];
  for (let k = 1; k <= MONTHS; k++)
    balance.push(balance[k - 1] * (1 + MONTHLY_RATE) + CONTRIBUTION);
  const apexMonth = balance.findIndex(
    (value) => value * MONTHLY_RATE >= MONTHLY_COST,
  );
  return { balance, apexMonth };
}

/** Stylized compound-growth curve: balance vs. total deposited, marking where yield covers the cost of living. */
export function GrowthChart({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const { balance, apexMonth } = series();
  const max = balance[MONTHS];
  const x = (month: number) => PAD + (month / MONTHS) * (W - 2 * PAD);
  const y = (value: number) => H - PAD - (value / max) * (H - 2 * PAD);

  const step = 6;
  const months = Array.from({ length: MONTHS / step + 1 }, (_, i) => i * step);
  const line = months
    .map(
      (m, i) =>
        `${i === 0 ? "M" : "L"}${x(m).toFixed(1)} ${y(balance[m]).toFixed(1)}`,
    )
    .join(" ");
  const area = `${line} L${x(MONTHS)} ${H - PAD} L${x(0)} ${H - PAD} Z`;
  const deposited = `M${x(0)} ${y(0)} L${x(MONTHS)} ${y(CONTRIBUTION * MONTHS)}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Ilustração: o patrimônio acumulado cresce em curva e ultrapassa o total depositado"
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-line`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={PAD}
          x2={W - PAD}
          y1={H * f}
          y2={H * f}
          stroke="white"
          strokeOpacity="0.06"
        />
      ))}
      <path d={area} fill={`url(#${uid}-fill)`} />
      <path
        d={deposited}
        stroke="#a1a1aa"
        strokeOpacity="0.6"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        fill="none"
      />
      <path
        d={line}
        stroke={`url(#${uid}-line)`}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {apexMonth > 0 && (
        <g>
          <line
            x1={x(apexMonth)}
            x2={x(apexMonth)}
            y1={y(balance[apexMonth])}
            y2={H - PAD}
            stroke="#10b981"
            strokeOpacity="0.5"
            strokeDasharray="3 3"
          />
          <circle
            cx={x(apexMonth)}
            cy={y(balance[apexMonth])}
            r="9"
            fill="#10b981"
            fillOpacity="0.2"
          />
          <circle
            cx={x(apexMonth)}
            cy={y(balance[apexMonth])}
            r="4.5"
            fill="#10b981"
          />
        </g>
      )}
    </svg>
  );
}

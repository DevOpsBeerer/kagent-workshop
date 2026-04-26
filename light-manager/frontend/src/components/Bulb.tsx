import { useId } from "react";

type Props = {
  slot?: number;
  r: number;
  g: number;
  b: number;
  size?: number;
  className?: string;
};

export default function Bulb({ slot, r, g, b, size = 96, className }: Props) {
  const reactId = useId();
  const isOff = r === 0 && g === 0 && b === 0;
  const color = `rgb(${r}, ${g}, ${b})`;
  const brightness = (r + g + b) / (3 * 255);

  const fillId = `bulb-fill-${reactId}`;
  const glowId = `bulb-glow-${reactId}`;
  const blurAmount = 3 + brightness * 10;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Ampoule slot ${slot ?? "?"} : RGB(${r}, ${g}, ${b})`}
      className={className}
    >
      <defs>
        <radialGradient id={fillId} cx="35%" cy="32%" r="75%">
          {isOff ? (
            <>
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="55%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
              <stop offset="35%" stopColor={color} />
              <stop offset="100%" stopColor={color} />
            </>
          )}
        </radialGradient>
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={blurAmount} />
        </filter>
      </defs>

      {!isOff && (
        <circle
          cx="50"
          cy="50"
          r="40"
          fill={color}
          filter={`url(#${glowId})`}
          opacity={0.35 + brightness * 0.55}
        />
      )}

      <circle
        cx="50"
        cy="50"
        r="36"
        fill={`url(#${fillId})`}
        stroke="rgba(15, 23, 42, 0.7)"
        strokeWidth="1.5"
      />

      {!isOff && (
        <ellipse cx="38" cy="36" rx="11" ry="6" fill="rgba(255,255,255,0.45)" />
      )}
    </svg>
  );
}

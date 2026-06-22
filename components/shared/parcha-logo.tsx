import type { SVGProps } from "react";

/**
 * Parcha wordmark — transparent background, works on any surface.
 * variant="light"  → parchment text (for dark/espresso backgrounds)
 * variant="dark"   → espresso text  (for light/paper backgrounds)
 * variant="color"  → terracotta text (accent use)
 */
export function ParchaWordmark({
  variant = "light",
  className = "",
  height = 28,
}: {
  variant?: "light" | "dark" | "color";
  className?: string;
  height?: number;
}) {
  const textColor =
    variant === "light"
      ? "#faf9f5"
      : variant === "color"
      ? "#c96442"
      : "#3d3929";

  const aspectRatio = 3.6;
  const width = height * aspectRatio;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 108 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Parcha"
    >
      {/* Wordmark — Georgia-style serif rendered as text */}
      <text
        x="0"
        y="23"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="24"
        fontWeight="700"
        fill={textColor}
        letterSpacing="-0.3"
      >
        Parcha
      </text>
      {/* Terracotta spark ✳ — top-right of the 'a' */}
      <g transform="translate(93, 2)">
        {/* 6-point star spark */}
        {[0, 30, 60, 90, 120, 150].map((deg) => (
          <line
            key={deg}
            x1="0"
            y1="-4.5"
            x2="0"
            y2="4.5"
            stroke="#c96442"
            strokeWidth="1.6"
            strokeLinecap="round"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle cx="0" cy="0" r="1.2" fill="#c96442" />
      </g>
    </svg>
  );
}

/**
 * Parcha icon mark — just the "P" badge, transparent background.
 * Use for favicon, mobile header, small spaces.
 */
export function ParchaIcon({
  variant = "light",
  size = 32,
  className = "",
}: {
  variant?: "light" | "dark";
  size?: number;
  className?: string;
}) {
  const bg = variant === "light" ? "#faf9f5" : "#3d3929";
  const fg = variant === "light" ? "#3d3929" : "#faf9f5";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Parcha"
    >
      <rect width="32" height="32" rx="8" fill={bg} />
      <text
        x="5"
        y="24"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="22"
        fontWeight="700"
        fill={fg}
      >
        P
      </text>
      {/* Tiny terracotta spark */}
      <g transform="translate(25, 7)">
        {[0, 45, 90, 135].map((deg) => (
          <line
            key={deg}
            x1="0"
            y1="-3"
            x2="0"
            y2="3"
            stroke="#c96442"
            strokeWidth="1.4"
            strokeLinecap="round"
            transform={`rotate(${deg})`}
          />
        ))}
      </g>
    </svg>
  );
}

"use client";

import { useId } from "react";
import {
  STUDY_GRAPH,
  expandBoundsForOrigin,
  StudyGraphAxes,
  StudyGraphAxisTicks,
  StudyGraphGrid,
} from "@/components/study/StudyGraphLayers";

const DEFAULT = [
  { label: "A", x: 0, y: -1 },
  { label: "B", x: 1, y: -1.5 },
  { label: "C", x: 2, y: 0 },
  { label: "D", x: 3, y: 2 },
  { label: "E", x: 4, y: 2.5 },
  { label: "F", x: 5, y: 4 },
];

/**
 * Piecewise-linear graph through labeled points (procedural or default).
 * @param {{ label: string, x: number, y: number }[]} [points]
 */
export default function SixPointsCurveSvg({
  className = "",
  width = 420,
  height = 280,
  showXAxis = true,
  points: pointsProp,
}) {
  const POINTS = pointsProp?.length >= 2 ? pointsProp : DEFAULT;

  const xs = POINTS.map((p) => p.x);
  const ys = POINTS.map((p) => p.y);
  let xMin = Math.min(...xs) - 0.2;
  let xMax = Math.max(...xs) + 0.2;
  let yMin = Math.min(...ys, -0.5) - 0.5;
  let yMax = Math.max(...ys, 0.5) + 0.5;
  ;[xMin, xMax, yMin, yMax] = expandBoundsForOrigin(xMin, xMax, yMin, yMax);

  const padL = 48;
  const padR = 32;
  const padT = 36;
  const padB = 52;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const toPx = (x, y) => {
    const px = padL + ((x - xMin) / (xMax - xMin)) * plotW;
    const py = padT + ((yMax - y) / (yMax - yMin)) * plotH;
    return [px, py];
  };

  const lineD = POINTS.map((p, i) => {
    const [px, py] = toPx(p.x, p.y);
    return `${i === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`;
  }).join(" ");

  const xAxisY = toPx(0, 0)[1];
  const yAxisX = toPx(0, 0)[0];
  const clipId = useId();

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      width="100%"
      height="auto"
      style={{ maxWidth: width }}
      aria-label="Graph of f with labeled points"
    >
      <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
      <defs>
        <clipPath id={clipId}>
          <rect x={padL} y={padT} width={plotW} height={plotH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <StudyGraphGrid toPx={toPx} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} />
      </g>

      {showXAxis && (
        <>
          <StudyGraphAxes
            padL={padL}
            padT={padT}
            plotW={plotW}
            plotH={plotH}
            xAxisY={xAxisY}
            yAxisX={yAxisX}
          />
          <StudyGraphAxisTicks
            toPx={toPx}
            xMin={xMin}
            xMax={xMax}
            yMin={yMin}
            yMax={yMax}
            xAxisY={xAxisY}
            yAxisX={yAxisX}
            padL={padL}
            padT={padT}
            plotW={plotW}
            plotH={plotH}
            labelEvery={2}
          />
        </>
      )}

      <path
        d={lineD}
        fill="none"
        stroke={STUDY_GRAPH.curve}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {POINTS.map((p) => {
        const [px, py] = toPx(p.x, p.y);
        return (
          <g key={p.label}>
            <circle
              cx={px}
              cy={py}
              r={5}
              fill={STUDY_GRAPH.pointFill}
              stroke={STUDY_GRAPH.pointStroke}
              strokeWidth={STUDY_GRAPH.pointStrokeWidth}
            />
            <text x={px + 10} y={py - 8} className="fill-foreground text-sm font-semibold">
              {p.label}
            </text>
          </g>
        );
      })}

      <text x={width / 2} y={height - 10} textAnchor="middle" className="fill-muted-foreground text-xs">
        Piecewise linear y = f(x) through the labeled points (equal spacing in x).
      </text>
    </svg>
  );
}

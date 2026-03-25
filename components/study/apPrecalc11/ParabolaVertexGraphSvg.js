"use client";

import { useId } from "react";
import {
  STUDY_GRAPH,
  expandBoundsForOrigin,
  StudyGraphAxes,
  StudyGraphAxisTicks,
  StudyGraphGrid,
} from "@/components/study/StudyGraphLayers";

/**
 * y = ± a (x - h)^2 + k0 — random vertex, opens up or down.
 * Does not show the equation on the graph (students infer from shape + vertex only).
 */
export default function ParabolaVertexGraphSvg({
  className = "",
  width = 420,
  height = 300,
  h = 2,
  k = 0.35,
  k0 = 0,
  opensUp = true,
}) {
  const padL = 48;
  const padR = 32;
  const padT = 48;
  const padB = 52;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  let xMin = h - 2.5;
  let xMax = h + 4;
  const sign = opensUp ? 1 : -1;

  let yMin = opensUp ? -0.5 : -6;
  let yMax = opensUp ? 6 : 0.75;
  const sampleY = (x) => sign * k * (x - h) ** 2 + k0;
  for (let x = xMin; x <= xMax; x += 0.2) {
    const y = sampleY(x);
    if (y < yMin) yMin = y - 0.5;
    if (y > yMax) yMax = y + 0.5;
  }

  ;[xMin, xMax, yMin, yMax] = expandBoundsForOrigin(xMin, xMax, yMin, yMax);

  const toPx = (x, y) => {
    const px = padL + ((x - xMin) / (xMax - xMin)) * plotW;
    const py = padT + ((yMax - y) / (yMax - yMin)) * plotH;
    return [px, py];
  };

  const samples = [];
  for (let x = xMin; x <= xMax + 0.01; x += 0.04) {
    const y = sampleY(x);
    samples.push(toPx(x, y));
  }
  const pathD = samples
    .map(([px, py], i) => `${i === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`)
    .join(" ");

  const xAxisY = toPx(0, 0)[1];
  const yAxisX = toPx(0, 0)[0];
  const [vx, vy] = toPx(h, k0);

  const vertexLabelY = opensUp ? vy - 14 : vy + 18;
  const vertexLabelX = Math.min(Math.max(vx + 8, padL + 4), padL + plotW - 120);

  const clipId = useId();

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      width="100%"
      height="auto"
      style={{ maxWidth: width }}
      aria-label={`Parabola graph with vertex at (${h}, ${k0})`}
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

      <path d={pathD} fill="none" stroke={STUDY_GRAPH.curve} strokeWidth={2.5} strokeLinecap="round" />
      <circle
        cx={vx}
        cy={vy}
        r={5}
        fill={STUDY_GRAPH.pointFill}
        stroke={STUDY_GRAPH.pointStroke}
        strokeWidth={STUDY_GRAPH.pointStrokeWidth}
      />
      <text
        x={vertexLabelX}
        y={Math.max(vertexLabelY, padT + 14)}
        className="fill-foreground text-xs font-medium"
      >
        vertex ({h}, {k0})
      </text>
    </svg>
  );
}

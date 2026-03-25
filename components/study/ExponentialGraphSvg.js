"use client";

import { useId } from "react";
import MathText from "@/components/MathText";
import { expoBaseToLatex } from "@/utils/mathLatex";
import {
  STUDY_GRAPH,
  expandBoundsForOrigin,
  StudyGraphAxes,
  StudyGraphAxisTicks,
  StudyGraphGrid,
} from "@/components/study/StudyGraphLayers";

/**
 * Plots y = base^x. Supports base > 1 (increasing) and 0 < base < 1 (decreasing on ℝ).
 */
export default function ExponentialGraphSvg({
  base = 2,
  equationLatex,
  className = "",
  width = 420,
  height = 300,
}) {
  const padL = 52;
  const padR = 36;
  const padT = 36;
  const padB = 52;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  let xMin = -3;
  let xMax = 3;

  let yMin = -0.5;
  let yMax = 8;
  if (base > 0 && base < 1) {
    const yLeft = base ** xMin;
    const yRight = base ** xMax;
    yMax = Math.max(yLeft, yRight, 4) * 1.08;
    yMin = -0.25;
  } else {
    yMax = Math.max(8.5, base ** xMax * 1.05);
  }

  ;[xMin, xMax, yMin, yMax] = expandBoundsForOrigin(xMin, xMax, yMin, yMax);

  const toPx = (x, y) => {
    const px = padL + ((x - xMin) / (xMax - xMin)) * plotW;
    const py = padT + ((yMax - y) / (yMax - yMin)) * plotH;
    return [px, py];
  };

  const samples = [];
  for (let x = xMin; x <= xMax + 0.001; x += 0.04) {
    const y = base ** x;
    samples.push(toPx(x, y));
  }
  const pathD = samples
    .map(([px, py], i) => `${i === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`)
    .join(" ");

  const xAxisY = toPx(0, 0)[1];
  const yAxisX = toPx(0, 0)[0];

  const latex = equationLatex ?? `y = ${expoBaseToLatex(base)}`;

  const ariaBase =
    base === 0.25
      ? "one fourth"
      : base === 0.5
        ? "one half"
        : Math.abs(base - 1 / 3) < 1e-9
          ? "one third"
          : String(base);

  const clipId = useId();

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      width="100%"
      height="auto"
      style={{ maxWidth: width }}
      aria-label={`Graph of y equals ${ariaBase} to the x power`}
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

      <foreignObject x={padL + plotW - 260} y={padT - 2} width="260" height="44">
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          className="flex justify-end items-start text-foreground text-sm font-medium leading-none"
        >
          <MathText latex={latex} />
        </div>
      </foreignObject>
    </svg>
  );
}

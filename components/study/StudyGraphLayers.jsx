"use client";

import { useId } from "react";

/** Match textbook-style coordinate plane (light grid, dark axes, sky-blue graph). */
export const STUDY_GRAPH = {
  gridMinor: "#eeeeee",
  gridMajor: "#cccccc",
  axis: "#4a4a4a",
  curve: "#7bb6f2",
  pointFill: "#7bb6f2",
  pointStroke: "#111111",
  pointStrokeWidth: 1,
  tick: "#4a4a4a",
  label: "#111111",
};

/**
 * Ensures the window includes the origin, the y-axis (x = 0), and at least
 * a few negative tick marks on both axes (unless overridden).
 */
export function expandBoundsForOrigin(xMin, xMax, yMin, yMax, opts = {}) {
  const minNegX = opts.minNegX ?? 2;
  const minNegY = opts.minNegY ?? 2;
  const minPosX = opts.minPosX ?? 2;
  const minPosY = opts.minPosY ?? 2;
  let nxMin = Math.min(xMin, -minNegX);
  let nxMax = Math.max(xMax, minPosX);
  let nyMin = Math.min(yMin, -minNegY);
  let nyMax = Math.max(yMax, minPosY);
  if (nxMin >= 0) nxMin = -1;
  if (nxMax <= 0) nxMax = 1;
  if (nyMin >= 0) nyMin = -1;
  if (nyMax <= 0) nyMax = 1;
  return [nxMin, nxMax, nyMin, nyMax];
}

/**
 * @param {(x: number, y: number) => [number, number]} toPx
 */
export function StudyGraphGrid({ toPx, xMin, xMax, yMin, yMax }) {
  const lines = [];
  const x0 = Math.floor(xMin);
  const x1 = Math.ceil(xMax);
  const y0 = Math.floor(yMin);
  const y1 = Math.ceil(yMax);

  for (let xi = x0; xi <= x1; xi++) {
    const major = xi % 2 === 0;
    const [px, pyTop] = toPx(xi, yMax);
    const [, pyBot] = toPx(xi, yMin);
    lines.push(
      <line
        key={`v-${xi}`}
        x1={px}
        y1={pyTop}
        x2={px}
        y2={pyBot}
        stroke={major ? STUDY_GRAPH.gridMajor : STUDY_GRAPH.gridMinor}
        strokeWidth={1}
      />
    );
  }

  for (let yi = y0; yi <= y1; yi++) {
    const major = yi % 2 === 0;
    const [pxLeft, py] = toPx(xMin, yi);
    const [pxRight] = toPx(xMax, yi);
    lines.push(
      <line
        key={`h-${yi}`}
        x1={pxLeft}
        y1={py}
        x2={pxRight}
        y2={py}
        stroke={major ? STUDY_GRAPH.gridMajor : STUDY_GRAPH.gridMinor}
        strokeWidth={1}
      />
    );
  }

  return <g aria-hidden="true">{lines}</g>;
}

/**
 * x- and y-axes with arrowheads at the positive ends (right and up).
 */
export function StudyGraphAxes({ padL, padT, plotW, plotH, xAxisY, yAxisX }) {
  const uid = useId();
  const axisColor = STUDY_GRAPH.axis;
  const arrowPad = 8;

  return (
    <g>
      <defs>
        <marker
          id={`${uid}-arrow-x`}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L8,4 L0,8 z" fill={axisColor} />
        </marker>
        <marker
          id={`${uid}-arrow-y`}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,8 L8,4 L0,0 z" fill={axisColor} />
        </marker>
      </defs>
      <line
        x1={padL}
        y1={xAxisY}
        x2={padL + plotW - arrowPad}
        y2={xAxisY}
        stroke={axisColor}
        strokeWidth={1.5}
        markerEnd={`url(#${uid}-arrow-x)`}
      />
      <line
        x1={yAxisX}
        y1={padT + plotH}
        x2={yAxisX}
        y2={padT + arrowPad}
        stroke={axisColor}
        strokeWidth={1.5}
        markerEnd={`url(#${uid}-arrow-y)`}
      />
    </g>
  );
}

/**
 * Integer tick marks on both axes + numeric labels every `labelEvery` units.
 */
export function StudyGraphAxisTicks({
  toPx,
  xMin,
  xMax,
  yMin,
  yMax,
  xAxisY,
  yAxisX,
  padL,
  padT,
  plotW,
  plotH,
  labelEvery = 2,
}) {
  const tick = 5;
  const els = [];
  const x0 = Math.floor(xMin);
  const x1 = Math.ceil(xMax);
  const y0 = Math.floor(yMin);
  const y1 = Math.ceil(yMax);

  for (let xi = x0; xi <= x1; xi++) {
    const [px] = toPx(xi, 0);
    if (px < padL - 1 || px > padL + plotW + 1) continue;
    els.push(
      <line
        key={`xt-${xi}`}
        x1={px}
        y1={xAxisY - tick}
        x2={px}
        y2={xAxisY + tick}
        stroke={STUDY_GRAPH.tick}
        strokeWidth={1}
      />
    );
    /* Origin label "0" on the x-axis (shows (0,0) on the horizontal scale). */
    if (xi % labelEvery === 0) {
      els.push(
        <text
          key={`xl-${xi}`}
          x={px}
          y={xAxisY + 18}
          textAnchor="middle"
          fill={STUDY_GRAPH.label}
          className="text-[10px] select-none"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          {xi}
        </text>
      );
    }
  }

  for (let yi = y0; yi <= y1; yi++) {
    const [, py] = toPx(0, yi);
    if (py < padT - 1 || py > padT + plotH + 1) continue;
    els.push(
      <line
        key={`yt-${yi}`}
        x1={yAxisX - tick}
        y1={py}
        x2={yAxisX + tick}
        y2={py}
        stroke={STUDY_GRAPH.tick}
        strokeWidth={1}
      />
    );
    /* Skip y = 0 label: "0" is already on the x-axis at the origin. */
    if (yi !== 0 && yi % labelEvery === 0) {
      els.push(
        <text
          key={`yl-${yi}`}
          x={yAxisX - 12}
          y={py + 3}
          textAnchor="end"
          fill={STUDY_GRAPH.label}
          className="text-[10px] select-none"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          {yi}
        </text>
      );
    }
  }

  return <g aria-hidden="true">{els}</g>;
}

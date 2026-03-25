/**
 * AP Precalc 1.1 — procedural practice only (no vocab lists).
 * Two generators: (1) interval notation on exp/parabola with random parameters,
 * (2) piecewise linear graph — MCQ on slopes (largest / most negative average ROC).
 */

import { expoBaseToLatex } from "@/utils/mathLatex";

export { expoBaseToLatex } from "@/utils/mathLatex";

/** @typedef {{ mode: 'allReals' } | { mode: 'openLeft', h: number } | { mode: 'openRight', h: number }} IntervalSpec */

/**
 * @returns {number}
 */
function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Fisher–Yates shuffle in place; returns array.
 * @template T
 * @param {T[]} arr
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function segmentLabel(i) {
  return `From ${LETTERS[i]} to ${LETTERS[i + 1]}`;
}

/**
 * Random y-values at x=0,1,…,5; unique winner for max or min slope.
 * @returns {{ ys: number[], slopes: number[], correctSeg: number, variant: 'max' | 'min' }}
 */
function randomPiecewiseData() {
  for (let attempt = 0; attempt < 80; attempt++) {
    const ys = [];
    for (let i = 0; i < 6; i++) ys.push(randInt(-4, 5));
    const slopes = [];
    for (let i = 0; i < 5; i++) slopes.push(ys[i + 1] - ys[i]);
    const maxV = Math.max(...slopes);
    const minV = Math.min(...slopes);
    const maxIdx = slopes.indexOf(maxV);
    const minIdx = slopes.indexOf(minV);
    const maxTies = slopes.filter((s) => s === maxV).length;
    const minTies = slopes.filter((s) => s === minV).length;
    const variant = Math.random() < 0.5 ? "max" : "min";
    if (variant === "max" && maxTies === 1) {
      return { ys, slopes, correctSeg: maxIdx, variant };
    }
    if (variant === "min" && minTies === 1) {
      return { ys, slopes, correctSeg: minIdx, variant };
    }
  }
  // Fallback (should be rare)
  return {
    ys: [0, -1, 2, 1, 3, 0],
    slopes: [-1, 3, -1, 2, -3],
    correctSeg: 1,
    variant: "max",
  };
}

/**
 * Build one piecewise MCQ (random points, random question variant).
 */
export function generatePiecewiseSlopeMcq() {
  const { ys, correctSeg, variant } = randomPiecewiseData();
  const labels = ys.map((y, i) => ({ label: LETTERS[i], x: i, y }));
  const wrongPool = [0, 1, 2, 3, 4].filter((i) => i !== correctSeg);
  shuffle(wrongPool);
  const wrongPick = wrongPool.slice(0, 3);
  const optionSegs = shuffle([correctSeg, ...wrongPick]);
  const correctIndex = optionSegs.indexOf(correctSeg);
  const options = optionSegs.map((i) => segmentLabel(i));
  const question =
    variant === "max"
      ? "The graph shows a piecewise linear function through the labeled points. On which segment is the **average rate of change** (slope) **largest**?"
      : "On which segment is the average rate of change (slope) **smallest** (most negative)?";
  const questionParts =
    variant === "max"
      ? [
          {
            type: "text",
            value:
              "The graph shows a piecewise linear function through the labeled points. On which segment is the ",
          },
          { type: "bold", value: "average rate of change" },
          { type: "text", value: " (slope) " },
          { type: "bold", value: "largest" },
          { type: "text", value: "?" },
        ]
      : [
          { type: "text", value: "On which segment is the average rate of change (slope) " },
          { type: "bold", value: "smallest" },
          { type: "text", value: " (most negative)?" },
        ];
  const explanation =
    variant === "max"
      ? "Average ROC on each segment is rise/run with run = 1 between integer x-values, so it equals the change in y. Pick the segment with the largest Δy."
      : "The smallest slope is the most negative Δy between consecutive labeled points.";
  const explanationParts =
    variant === "max"
      ? [
          {
            type: "text",
            value:
              "Average ROC on each segment is rise/run with run = 1 between integer x-values, so it equals the change in y. Pick the segment with the largest ",
          },
          { type: "math", latex: "\\Delta y" },
          { type: "text", value: "." },
        ]
      : [
          { type: "text", value: "The smallest slope is the most negative " },
          { type: "math", latex: "\\Delta y" },
          { type: "text", value: " between consecutive labeled points." },
        ];
  return {
    type: "mcq",
    id: "piecewise-roc",
    question,
    questionParts,
    options,
    correctIndex,
    explanation,
    explanationParts,
    visual: { kind: "piecewise", points: labels },
  };
}

/**
 * Random exponential: bases > 1 ask “increasing”; bases in (0,1) ask “decreasing”. Answer always (−∞, ∞) in correct notation.
 */
function generateExponentialInterval() {
  const big = [2, 3, 4, 5][randInt(0, 3)];
  const small = [0.25, 0.5, 1 / 3][randInt(0, 2)];
  const useBig = Math.random() < 0.55;
  const base = useBig ? big : small;
  const baseStr =
    base === 0.25
      ? "1/4"
      : base === 0.5
        ? "1/2"
        : base === 1 / 3
          ? "1/3"
          : String(base);
  const increasing = useBig;
  const yLatex = expoBaseToLatex(base);
  const incWord = increasing ? "increasing" : "decreasing";
  const prompt = `The graph shows y = ${baseStr}^x. On what interval is f ${incWord}? (interval notation)`;
  const promptParts = [
    { type: "text", value: "The graph shows " },
    { type: "math", latex: `y = ${yLatex}` },
    { type: "text", value: ". On what interval is " },
    { type: "math", latex: "f" },
    { type: "text", value: ` ${incWord}? (interval notation)` },
  ];
  const explanation = increasing
    ? `For base ${baseStr} > 1, the exponential is increasing on its whole domain: (−∞, ∞).`
    : `For 0 < base < 1, the exponential is decreasing on (−∞, ∞).`;
  const explanationParts = increasing
    ? [
        { type: "text", value: "For base " },
        { type: "math", latex: String(base) },
        {
          type: "text",
          value: " (> 1), the exponential is increasing on its whole domain: ",
        },
        { type: "math", latex: "(-\\infty, \\infty)" },
        { type: "text", value: "." },
      ]
    : [
        { type: "text", value: "For " },
        { type: "math", latex: "0 < b < 1" },
        { type: "text", value: ", the exponential is decreasing on " },
        { type: "math", latex: "(-\\infty, \\infty)" },
        { type: "text", value: "." },
      ];
  return {
    type: "interval",
    id: "proc-exp",
    prompt,
    promptParts,
    intervalSpec: { mode: "allReals" },
    explanation,
    explanationParts,
    visual: { kind: "exp", base, equationLatex: `y = ${yLatex}` },
  };
}

/**
 * Parabola with random vertex and direction; random ask inc/dec.
 */
function generateParabolaInterval() {
  const h = randInt(-1, 4);
  const opensUp = Math.random() < 0.5;
  const a = 0.15 + Math.random() * 0.45;
  /** @type {'dec'|'inc'} */
  let ask;
  /** @type {IntervalSpec} */
  let intervalSpec;
  let explanation;

  if (opensUp) {
    ask = Math.random() < 0.5 ? "dec" : "inc";
    if (ask === "dec") {
      intervalSpec = { mode: "openLeft", h };
      explanation = `Opens upward with vertex at x = ${h}: f decreases on (−∞, ${h}).`;
    } else {
      intervalSpec = { mode: "openRight", h };
      explanation = `Opens upward: f increases on (${h}, ∞).`;
    }
  } else {
    ask = Math.random() < 0.5 ? "dec" : "inc";
    if (ask === "inc") {
      intervalSpec = { mode: "openLeft", h };
      explanation = `Opens downward with vertex at x = ${h}: f increases on (−∞, ${h}).`;
    } else {
      intervalSpec = { mode: "openRight", h };
      explanation = `Opens downward: f decreases on (${h}, ∞).`;
    }
  }

  const dirWord = ask === "dec" ? "decreasing" : "increasing";
  const prompt = `The graph shows a parabola with vertex at (${h}, 0). On what interval is f ${dirWord}? (interval notation)`;
  const promptParts = [
    { type: "text", value: "The graph shows a parabola with vertex at " },
    { type: "math", latex: `(${h},\\,0)` },
    { type: "text", value: ". On what interval is " },
    { type: "math", latex: "f" },
    { type: "text", value: ` ${dirWord}? (interval notation)` },
  ];

  let explanationParts;
  if (opensUp && ask === "dec") {
    explanationParts = [
      { type: "text", value: "Opens upward with vertex at " },
      { type: "math", latex: `x = ${h}` },
      { type: "text", value: ": " },
      { type: "math", latex: "f" },
      { type: "text", value: " decreases on " },
      { type: "math", latex: `(-\\infty,\\, ${h})` },
      { type: "text", value: "." },
    ];
  } else if (opensUp && ask === "inc") {
    explanationParts = [
      { type: "text", value: "Opens upward: " },
      { type: "math", latex: "f" },
      { type: "text", value: " increases on " },
      { type: "math", latex: `(${h},\\, \\infty)` },
      { type: "text", value: "." },
    ];
  } else if (!opensUp && ask === "inc") {
    explanationParts = [
      { type: "text", value: "Opens downward with vertex at " },
      { type: "math", latex: `x = ${h}` },
      { type: "text", value: ": " },
      { type: "math", latex: "f" },
      { type: "text", value: " increases on " },
      { type: "math", latex: `(-\\infty,\\, ${h})` },
      { type: "text", value: "." },
    ];
  } else {
    explanationParts = [
      { type: "text", value: "Opens downward: " },
      { type: "math", latex: "f" },
      { type: "text", value: " decreases on " },
      { type: "math", latex: `(${h},\\, \\infty)` },
      { type: "text", value: "." },
    ];
  }

  return {
    type: "interval",
    id: "proc-parabola",
    prompt,
    promptParts,
    intervalSpec,
    explanation,
    explanationParts,
    visual: { kind: "parabola", h, opensUp, a, k0: 0 },
  };
}

function generateIntervalQuestion() {
  return Math.random() < 0.48 ? generateExponentialInterval() : generateParabolaInterval();
}

/**
 * One full practice round: alternating types, then shuffled.
 * @param {number} [n=10]
 */
export function buildApPrecalc11Session(n = 10) {
  const nI = Math.ceil(n / 2);
  const nP = Math.floor(n / 2);
  const intervals = [];
  const piecewise = [];
  for (let i = 0; i < nI; i++) intervals.push(generateIntervalQuestion());
  for (let i = 0; i < nP; i++) piecewise.push(generatePiecewiseSlopeMcq());
  return shuffle([...intervals, ...piecewise]);
}

export const AP_PRECALC_11_TITLE = "1.1 — Change in Tandem";

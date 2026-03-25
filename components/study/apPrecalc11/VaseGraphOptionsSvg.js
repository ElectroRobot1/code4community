"use client";

/**
 * Four candidate graphs: height of water vs time. Constant fill rate into a vase that is wider at the top
 * ⇒ height increases at a decreasing rate ⇒ concave down (option C in MCQ).
 */
function MiniGraph({ variant, w, h }) {
  const pad = 8;
  const pw = w - pad * 2;
  const ph = h - pad * 2;
  const x0 = pad;
  const y0 = pad + ph;

  const linePath = (points) =>
    points
      .map(([x, y], i) => {
        const px = x0 + x * pw;
        const py = y0 - y * ph;
        return `${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
      })
      .join(" ");

  // t in [0,1], h in [0,1] normalized
  let d;
  if (variant === "linear") {
    d = linePath([
      [0, 0],
      [1, 1],
    ]);
  } else if (variant === "concaveUp") {
    d = linePath([
      [0, 0],
      [0.25, 0.08],
      [0.5, 0.28],
      [0.75, 0.58],
      [1, 1],
    ]);
  } else if (variant === "concaveDown") {
    d = linePath([
      [0, 0],
      [0.25, 0.42],
      [0.5, 0.72],
      [0.75, 0.9],
      [1, 1],
    ]);
  } else {
    // decreasing — wrong
    d = linePath([
      [0, 1],
      [1, 0.2],
    ]);
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="auto" className="max-h-36">
      <rect x="0" y="0" width={w} height={h} fill="#fafafa" className="dark:fill-muted/20 stroke-border" strokeWidth={1} />
      <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} className="stroke-foreground/80" strokeWidth={1} />
      <line x1={x0} y1={y0} x2={x0} y2={pad} className="stroke-foreground/80" strokeWidth={1} />
      <path d={d} fill="none" className="stroke-primary" strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}

export default function VaseGraphOptionsSvg({ className = "" }) {
  const labels = ["A", "B", "C", "D"];
  const variants = ["linear", "concaveUp", "concaveDown", "decreasing"];
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className}`}>
      {labels.map((L, i) => (
        <div key={L} className="rounded-lg border border-border bg-white p-2 text-center">
          <span className="text-sm font-semibold text-foreground">{L}</span>
          <MiniGraph variant={variants[i]} w={140} h={100} />
        </div>
      ))}
    </div>
  );
}

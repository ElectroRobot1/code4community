/** LaTeX for b^x in exponentials (raised exponent, stacked fractions). */
export function expoBaseToLatex(base) {
  if (base === 2) return "2^x";
  if (base === 3) return "3^x";
  if (base === 4) return "4^x";
  if (base === 5) return "5^x";
  if (base === 0.25) return "\\left(\\frac{1}{4}\\right)^x";
  if (base === 0.5) return "\\left(\\frac{1}{2}\\right)^x";
  if (Math.abs(base - 1 / 3) < 1e-9) return "\\left(\\frac{1}{3}\\right)^x";
  return `${base}^x`;
}

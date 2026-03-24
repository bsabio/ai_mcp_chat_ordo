export function looksLikeMath(text: string): boolean {
  const value = text.toLowerCase();

  return (
    /\d\s*[+\-*/]\s*\d/.test(value) ||
    /\b(add|subtract|minus|plus|sum|difference|multiply|times|product|divide|quotient|calculate|math)\b/.test(
      value,
    )
  );
}

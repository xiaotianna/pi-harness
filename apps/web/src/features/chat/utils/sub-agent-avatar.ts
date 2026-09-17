export function subAgentAvatarUrl(executionId: string): string {
  let seed = 2166136261;
  for (let index = 0; index < executionId.length; index += 1) {
    seed = Math.imul(seed ^ executionId.charCodeAt(index), 16777619);
  }
  const hue = (seed >>> 0) % 360;
  const pixels: string[] = [];
  for (let index = 0; index < 144; index += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const tone = seed >>> 0;
    const lightness = 36 + (tone % 35);
    const pixelHue = (hue + ((tone >>> 8) % 25) - 12 + 360) % 360;
    pixels.push(
      `<rect x="${index % 12}" y="${Math.floor(index / 12)}" width="1" height="1" fill="hsl(${pixelHue} 68% ${lightness}%)"/>`,
    );
  }
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" shape-rendering="crispEdges">${pixels.join("")}</svg>`,
  )}`;
}

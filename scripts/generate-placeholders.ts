/**
 * Draws soft, on-brand placeholder illustrations (SVG) into public/placeholders/:
 * three shots per example product (main, close-up, styled), the Instagram strip,
 * and the artist portrait/studio. These are stand-ins until the owner uploads
 * real photos.
 * Run: npm run placeholders:generate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { seedProducts } from "../src/lib/seed/data";

const dir = resolve(import.meta.dirname, "../public/placeholders");
mkdirSync(dir, { recursive: true });

const backgrounds = ["#FCE6D9", "#FFF1E8", "#F9DCCB", "#FDEBDF", "#F6E3D6", "#FFF4EC"];
const accents = ["#F4A27A", "#E98A5F", "#D9776B", "#C9A27E", "#8FA98B", "#B98AA6"];

const pick = <T,>(list: T[], n: number) => list[n % list.length];

// One simple motif per category, drawn on a 600×600 canvas.
const motifs: Record<number, (a: string, b: string) => string> = {
  // Chocolate bouquets: wrapped cone with round "roses"
  1: (a, b) => `
    <path d="M300 520 L200 300 L400 300 Z" fill="${b}" opacity=".55"/>
    <circle cx="250" cy="260" r="48" fill="${a}"/><circle cx="350" cy="260" r="48" fill="${a}" opacity=".85"/>
    <circle cx="300" cy="205" r="52" fill="${a}" opacity=".95"/>
    <circle cx="250" cy="260" r="18" fill="#5A3A2E"/><circle cx="350" cy="260" r="18" fill="#5A3A2E"/>
    <circle cx="300" cy="205" r="20" fill="#5A3A2E"/>
    <path d="M285 330 q15 25 30 0" stroke="#111" stroke-width="3" fill="none"/>`,
  // Hampers: basket with handle
  2: (a, b) => `
    <path d="M200 300 q100 -150 200 0" stroke="${b}" stroke-width="14" fill="none"/>
    <rect x="170" y="300" width="260" height="170" rx="26" fill="${a}"/>
    <path d="M170 350 h260 M170 400 h260" stroke="#fff" stroke-width="6" opacity=".6"/>
    <circle cx="250" cy="290" r="26" fill="${b}"/><rect x="300" y="255" width="44" height="60" rx="8" fill="#fff" opacity=".8"/>`,
  // Decor: diya with flame
  3: (a, b) => `
    <path d="M180 360 q120 120 240 0 z" fill="${a}"/>
    <path d="M180 360 h240" stroke="${b}" stroke-width="10" stroke-linecap="round"/>
    <path d="M300 340 q-28 -50 0 -110 q28 60 0 110 z" fill="#F7C35F"/>
    <circle cx="240" cy="395" r="8" fill="#fff"/><circle cx="300" cy="405" r="8" fill="#fff"/><circle cx="360" cy="395" r="8" fill="#fff"/>`,
  // Personalised: gift tag with heart
  4: (a, b) => `
    <path d="M190 220 h170 l70 80 l-70 80 h-170 z" fill="${a}" transform="rotate(-8 300 300)"/>
    <circle cx="380" cy="290" r="12" fill="#fff"/>
    <path d="M270 300 c-30 -40 -80 0 0 60 c80 -60 30 -100 0 -60z" fill="#fff" opacity=".9"/>
    <path d="M392 290 q60 -80 100 -20" stroke="${b}" stroke-width="5" fill="none"/>`,
  // Art: framed canvas with abstract landscape
  5: (a, b) => `
    <rect x="150" y="150" width="300" height="300" rx="10" fill="#fff" stroke="#111" stroke-width="10"/>
    <rect x="175" y="175" width="250" height="250" fill="${b}" opacity=".35"/>
    <circle cx="360" cy="240" r="34" fill="${a}"/>
    <path d="M175 380 q60 -90 125 -20 q60 -60 125 10 v55 h-250 z" fill="${a}" opacity=".8"/>`,
};

function svg(body: string, bg: string, label: string, extras = ""): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="${label}">
  <rect width="600" height="600" fill="${bg}"/>
  ${extras.trim()}
  ${body.trim()}
</svg>
`;
}

const softCircles = `
  <circle cx="90" cy="520" r="120" fill="#fff" opacity=".35"/>
  <circle cx="530" cy="80" r="90" fill="#fff" opacity=".35"/>`;

/** Close-up: the motif scaled up and cropped, with a dotted paper texture. */
function closeUp(motif: string): string {
  const dots = Array.from({ length: 36 }, (_, i) => {
    const x = 40 + (i % 6) * 104;
    const y = 40 + Math.floor(i / 6) * 104;
    return `<circle cx="${x}" cy="${y}" r="3" fill="#fff" opacity=".55"/>`;
  }).join("");
  return `${dots}<g transform="translate(300 330) scale(1.75) translate(-300 -300)">${motif}</g>`;
}

/** Styled gift shot: motif on a table top with confetti. */
function styledGift(motif: string, accent: string): string {
  const confetti = [
    [90, 120, 0], [170, 70, 30], [470, 110, 60], [520, 200, 15], [70, 260, 45], [540, 330, 75],
  ]
    .map(([x, y, r]) => `<rect x="${x}" y="${y}" width="16" height="7" rx="3" fill="${accent}" transform="rotate(${r} ${x} ${y})" opacity=".7"/>`)
    .join("");
  return `${confetti}
    <rect x="0" y="470" width="600" height="130" fill="#EBC9B2" opacity=".7"/>
    <ellipse cx="300" cy="478" rx="190" ry="16" fill="#111" opacity=".08"/>
    <g transform="translate(300 330) scale(0.8) translate(-300 -330)">${motif}</g>`;
}

/** Art on a wall above a console table. */
function onTheWall(motif: string): string {
  return `
    <rect x="0" y="0" width="600" height="600" fill="#F3E7DC"/>
    <g transform="translate(300 250) scale(0.62) translate(-300 -300)">${motif}</g>
    <rect x="130" y="470" width="340" height="18" rx="4" fill="#8A6A55"/>
    <rect x="160" y="488" width="12" height="90" fill="#8A6A55"/><rect x="428" y="488" width="12" height="90" fill="#8A6A55"/>
    <path d="M200 470 q8 -60 30 -70 q-4 40 6 70 z" fill="#8FA98B"/>
    <rect x="380" y="430" width="40" height="40" rx="6" fill="#F4A27A"/>`;
}

for (const p of seedProducts) {
  const bg = pick(backgrounds, p.n);
  const accent = pick(accents, p.n);
  const motif = motifs[p.category](accent, pick(accents, p.n + 2));
  const label = p.name.replace(/&/g, "&amp;");

  writeFileSync(resolve(dir, `${p.slug}.svg`), svg(motif, bg, label, softCircles));
  writeFileSync(resolve(dir, `${p.slug}-2.svg`), svg(closeUp(motif), pick(backgrounds, p.n + 1), `${label}, close-up`));
  writeFileSync(
    resolve(dir, `${p.slug}-3.svg`),
    p.type === "product"
      ? svg(styledGift(motif, pick(accents, p.n + 3)), pick(backgrounds, p.n + 2), `${label}, styled as a gift`)
      : svg(onTheWall(motif), bg, `${label}, framed on a wall`),
  );
}

for (let i = 1; i <= 6; i++) {
  const body = motifs[((i - 1) % 5) + 1](pick(accents, i + 1), pick(accents, i + 3));
  writeFileSync(resolve(dir, `instagram-${i}.svg`), svg(body, pick(backgrounds, i + 2), `Instagram post ${i}`, softCircles));
}

// Artist portrait placeholder: an illustrated figure holding a palette.
writeFileSync(
  resolve(dir, "artist-portrait.svg"),
  svg(
    `
    <circle cx="300" cy="215" r="78" fill="#5A3A2E"/>
    <circle cx="300" cy="232" r="62" fill="#E8B796"/>
    <path d="M238 210 q62 -70 124 0 q-10 -60 -62 -66 q-52 6 -62 66z" fill="#3B2A22"/>
    <circle cx="372" cy="196" r="12" fill="#F4A27A"/>
    <path d="M150 600 q0 -230 150 -240 q150 10 150 240z" fill="#F4A27A"/>
    <path d="M250 372 q50 40 100 0" stroke="#FCE6D9" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M180 470 q-30 -70 50 -80 q90 -6 80 60 q-6 40 -50 30 q-30 -6 -40 20 q-14 30 -40 -30z" fill="#FFF9F4"/>
    <circle cx="230" cy="420" r="10" fill="#D9776B"/><circle cx="262" cy="410" r="10" fill="#8FA98B"/>
    <circle cx="290" cy="428" r="10" fill="#F7C35F"/><circle cx="248" cy="446" r="9" fill="#B98AA6"/>`,
    "#FCE6D9",
    "Illustrated placeholder portrait of the artist",
    softCircles,
  ),
);

// Studio placeholder: easel with a canvas and a jar of brushes.
writeFileSync(
  resolve(dir, "artist-studio.svg"),
  svg(
    `
    <rect x="0" y="470" width="600" height="130" fill="#EBC9B2" opacity=".8"/>
    <path d="M300 120 L210 520 M300 120 L390 520 M300 120 L300 540" stroke="#8A6A55" stroke-width="12" stroke-linecap="round"/>
    <rect x="190" y="170" width="220" height="200" rx="6" fill="#fff" stroke="#111" stroke-width="6"/>
    <circle cx="350" cy="225" r="26" fill="#F4A27A"/>
    <path d="M194 330 q50 -70 104 -16 q50 -50 108 6 v46 h-212z" fill="#8FA98B" opacity=".85"/>
    <rect x="180" y="380" width="240" height="14" rx="4" fill="#8A6A55"/>
    <rect x="455" y="400" width="56" height="74" rx="10" fill="#F4A27A"/>
    <path d="M468 400 l-10 -60 M482 400 l2 -70 M496 400 l14 -58" stroke="#5A3A2E" stroke-width="6" stroke-linecap="round"/>`,
    "#FFF1E8",
    "Illustrated placeholder of a painting corner with an easel",
    softCircles,
  ),
);

console.log(`Wrote ${seedProducts.length * 3 + 8} placeholder images to ${dir}`);

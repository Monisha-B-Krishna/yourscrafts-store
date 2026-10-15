/**
 * Draws soft, on-brand placeholder illustrations (SVG) for every example
 * product and the Instagram strip, into public/placeholders/.
 * These are stand-ins until the owner uploads real photos.
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

function svg(body: string, bg: string, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="${label}">
  <rect width="600" height="600" fill="${bg}"/>
  <circle cx="90" cy="520" r="120" fill="#fff" opacity=".35"/>
  <circle cx="530" cy="80" r="90" fill="#fff" opacity=".35"/>
  ${body.trim()}
</svg>
`;
}

for (const p of seedProducts) {
  const bg = pick(backgrounds, p.n);
  const body = motifs[p.category](pick(accents, p.n), pick(accents, p.n + 2));
  writeFileSync(resolve(dir, `${p.slug}.svg`), svg(body, bg, p.name.replace(/&/g, "&amp;")));
}

for (let i = 1; i <= 6; i++) {
  const body = motifs[((i - 1) % 5) + 1](pick(accents, i + 1), pick(accents, i + 3));
  writeFileSync(resolve(dir, `instagram-${i}.svg`), svg(body, pick(backgrounds, i + 2), `Instagram post ${i}`));
}

console.log(`Wrote ${seedProducts.length + 6} placeholder images to ${dir}`);

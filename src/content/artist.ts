/**
 * Copy for the "About the Artist" page (/artist).
 *
 * PLACEHOLDER TEXT — Monisha, replace this with your own story and add your
 * photos to /public/brand/ (e.g. artist.jpg and studio.jpg), then point the
 * `src` values below at them and update the alt text to describe the photos.
 */
export const artist = {
  name: "Monisha",
  eyebrow: "About the artist",
  headline: "Hi, I’m Monisha, the hands behind Yours Crafts Woman.",
  intro:
    "Every bouquet, hamper, keepsake and painting in this shop is made by me, one at a time, at my own table. No two pieces are exactly alike, and that’s rather the point.",
  story: [
    "I love making things that are meant for one particular person: a name lettered by hand, a favourite colour, a little detail that makes someone smile when they open the box.",
    "When I’m not wrapping bouquets, I’m painting. City skies after the rain, strings of marigolds, quiet corners of home. The originals here are one of a kind, and the prints let more people take a little of that colour home.",
    "If you have an idea of your own, I’d love to hear it. Custom pieces are my favourite kind of work.",
  ],
  quote: "I make things slowly, by hand, so they can be kept for a long time.",
  photo: {
    src: "/placeholders/artist-portrait.svg",
    alt: "Illustrated placeholder portrait of the artist holding a paint palette",
  },
  studioPhoto: {
    src: "/placeholders/artist-studio.svg",
    alt: "Illustrated placeholder of a painting corner with an easel and a jar of brushes",
  },
} as const;

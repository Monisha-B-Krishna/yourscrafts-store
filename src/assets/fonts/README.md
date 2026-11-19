# Self-hosted font files

Used only by the generated Open Graph images (`opengraph-image.tsx`), which can't
use Google Fonts. Both are licensed under the SIL Open Font License 1.1
(https://openfontlicense.org), from the Fontsource packages:

- Playfair Display SemiBold (latin) — @fontsource/playfair-display 5.3.0
- Inter Medium (latin, and latin-ext for the ₹ sign) — @fontsource/inter 5.3.0

`inter-rupee.woff2` is used on the website itself: just the ₹ sign from Inter
(latin-ext, variable weight), cut out with `pyftsubset --unicodes=U+20B9` so
prices show Inter's ₹ without downloading the 80 KB extended character set.

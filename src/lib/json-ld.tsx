/**
 * Structured data for search engines. "<" is escaped so text a product name
 * or description contains can never close the script tag.
 */
export function jsonLd(data: Record<string, unknown>) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

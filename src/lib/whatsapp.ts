/** Builds a wa.me link that opens WhatsApp with a pre-filled message. */
export function whatsappLink(number: string, message?: string): string {
  const digits = number.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const CUSTOM_ORDER_MESSAGE =
  "Hi Monisha! I'd like to request a custom piece from Yours Crafts Woman. Here's what I have in mind: ";

export const INTERNATIONAL_MESSAGE =
  "Hi! I'm outside India and would love to order from Yours Crafts Woman. Can you help?";

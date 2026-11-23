// Same card ids as the app (mobile/src/game/cards.ts): "ai-" + FNV-1a 32-bit of the normalized text, base 36.
// Keep the two in step, or AI card stats won't line up with their text.
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}
const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");
export const aiCardId = (text: string) => "ai-" + fnv1a(normalize(text));

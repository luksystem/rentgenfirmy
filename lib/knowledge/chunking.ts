const DEFAULT_CHUNK_SIZE = 1500;
const DEFAULT_CHUNK_OVERLAP = 150;

/**
 * Dzieli długi tekst na wycinki o rozmiarze ~`chunkSize` znaków, starając się przerywać
 * na granicy akapitu/zdania, z niewielkim zakładkowym nakładaniem się (`overlap`) dla kontekstu.
 */
export function chunkText(
  rawText: string,
  options?: { chunkSize?: number; overlap?: number },
): string[] {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = Math.min(options?.overlap ?? DEFAULT_CHUNK_OVERLAP, chunkSize - 1);

  const text = rawText.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (!text) {
    return [];
  }
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      const window = text.slice(start, end);
      const breakCandidates = [
        window.lastIndexOf("\n\n"),
        window.lastIndexOf(". "),
        window.lastIndexOf("\n"),
      ].filter((index) => index > chunkSize * 0.4);
      const breakAt = breakCandidates.length > 0 ? Math.max(...breakCandidates) : -1;
      if (breakAt > -1) {
        end = start + breakAt + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= text.length) {
      break;
    }
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

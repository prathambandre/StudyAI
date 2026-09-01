interface PDFResult {
  text: string;
  pageCount: number;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<PDFResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

  const pageCount = doc.numPages;

  let fullText = "";
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += pageText + "\n\n";
  }

  void (doc as unknown as { destroy: () => Promise<void> }).destroy();
  return {
    text: fullText.trim(),
    pageCount,
  };
}

export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start + overlap >= text.length) break;
  }

  return chunks;
}

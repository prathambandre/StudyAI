interface PDFResult {
  pages: string[];
  pageCount: number;
}

interface PdfJsWorkerGlobal {
  pdfjsWorker?: {
    WorkerMessageHandler: unknown;
  };
}

const PDFJS_VERSION = "6.3.289";

export async function extractTextFromPDF(buffer: Buffer): Promise<PDFResult> {
  // Run pdf.js entirely on the main thread. Next.js's bundler can't resolve
  // pdf.js's dynamic `import(workerSrc)`, so instead of spawning a worker we
  // register the worker's message handler on the main thread, which makes
  // pdf.js parse synchronously without ever touching workerSrc.
  const g = globalThis as PdfJsWorkerGlobal;
  if (!g.pdfjsWorker) {
    const { WorkerMessageHandler } = await import(
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
    g.pdfjsWorker = { WorkerMessageHandler };
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    // Maps non-embedded PDF fonts (silences pdf.js's standard-fonts warning
    // and improves extraction on PDFs that don't embed their fonts).
    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`,
  });
  const doc = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText.trim());
  }

  void (loadingTask as unknown as { destroy: () => Promise<void> }).destroy();
  return { pages, pageCount: pages.length };
}

export interface Chunk {
  content: string;
  pageNumber: number;
}

export function chunkPages(
  pages: string[],
  chunkSize: number = 1000,
  overlap: number = 200
): Chunk[] {
  const chunks: Chunk[] = [];

  pages.forEach((pageText, pageIndex) => {
    let start = 0;
    while (start < pageText.length) {
      const end = Math.min(start + chunkSize, pageText.length);
      chunks.push({
        content: pageText.slice(start, end).trim(),
        pageNumber: pageIndex + 1,
      });
      start = end - overlap;
      if (start >= pageText.length || end === pageText.length) break;
    }
  });

  return chunks.filter((c) => c.content.length > 0);
}
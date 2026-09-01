interface PDFResult {
  text: string;
  pageCount: number;
}

interface PdfJsWorkerGlobal {
  pdfjsWorker?: {
    WorkerMessageHandler: unknown;
  };
}

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
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const doc = await loadingTask.promise;

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

  void (loadingTask as unknown as { destroy: () => Promise<void> }).destroy();
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

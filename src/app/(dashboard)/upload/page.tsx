"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  File as FileIcon,
  FileText,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type StepId = "extract" | "embed" | "index";

interface StepState {
  id: StepId;
  label: string;
  active: string;
}

const steps: StepState[] = [
  { id: "extract", label: "Extracting text...", active: "Extracting text..." },
  { id: "embed", label: "Generating embeddings...", active: "Generating embeddings..." },
  { id: "index", label: "Indexing document...", active: "Indexing document..." },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function getPageCount(file: File): Promise<number | null> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = doc.numPages;
    await (doc as unknown as { destroy: () => Promise<void> }).destroy();
    return pages;
  } catch {
    return null;
  }
}

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<StepId | null>(null);
  const [stepProgress, setStepProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [completeDocId, setCompleteDocId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (candidate: File | undefined | null) => {
    if (!candidate) return;
    if (candidate.type !== "application/pdf" && !candidate.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a valid PDF file.");
      return;
    }
    setError(null);
    setFile(candidate);
    setTitle(candidate.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " "));
    const pages = await getPageCount(candidate);
    setPageCount(pages);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const candidate = e.dataTransfer.files?.[0];
      void handleFile(candidate);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setTitle("");
    setPageCount(null);
    setError(null);
    setLoading(false);
    setCurrentStep(null);
    setStepProgress(0);
    setCompleted(false);
    setCompleteDocId(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const processUpload = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setCompleted(false);
    setStepProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim() || file.name.replace(/\.pdf$/i, ""));

    const animateStep = (target: number, label: StepId) =>
      new Promise<void>((resolvePromise) => {
        setCurrentStep(label);
        let value = 0;
        const tick = () => {
          value += Math.random() * 18 + 6;
          if (value >= target) {
            setStepProgress(target);
            resolvePromise();
            return;
          }
          setStepProgress(value);
          setTimeout(tick, 120);
        };
        tick();
      });

    try {
      await animateStep(30, "extract");
      await animateStep(60, "embed");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Upload failed (${res.status})`);
      }

      await animateStep(98, "index");
      setStepProgress(100);
      setCurrentStep(null);
      setCompleted(true);
      setCompleteDocId(data?.documentId ?? null);

      toast("Document uploaded successfully!", "success");
    } catch (e) {
      setCurrentStep(null);
      setLoading(false);
      const message = e instanceof Error ? e.message : "Upload failed. Please try again.";
      setError(message);
      toast(message, "error");
    }
  }, [file, title, toast]);

  useEffect(() => {
    if (!completed) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) router.push(completeDocId ? `/chat?document=${completeDocId}` : "/chat");
    }, 1800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [completed, completeDocId, router]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto flex w-full max-w-2xl flex-col gap-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Upload a document
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Drop a PDF and we&apos;ll extract, embed, and index it so you can chat and study.
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
        >
          {error}
        </motion.div>
      )}

      {/* Drag and drop zone */}
      {!file && !loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            onDragOver={onDragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed bg-white/50 px-6 py-16 text-center transition-all duration-200 dark:bg-gray-900/40",
              dragActive
                ? "border-apple-blue bg-apple-blue/5 shadow-lg shadow-apple-blue/10"
                : "border-gray-300 dark:border-gray-700 hover:border-apple-blue/60 hover:bg-white/70 dark:hover:bg-gray-800/50"
            )}
          >
            <motion.div
              animate={dragActive ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
                dragActive
                  ? "bg-apple-blue text-white"
                  : "bg-apple-blue/10 text-apple-blue"
              )}
            >
              <UploadCloud className="h-8 w-8" />
            </motion.div>
            <div className="space-y-1">
              <p className="text-base font-medium text-gray-800 dark:text-gray-100">
                {dragActive ? "Drop your PDF here" : "Drag & drop your PDF here"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                or{" "}
                <span className="font-medium text-apple-blue">browse files</span>
              </p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              PDF files only, up to 50 MB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </div>
        </motion.div>
      )}

      {/* File selected preview */}
      {file && !loading && !completed && (
        <>
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-apple-blue/10 text-apple-blue">
                <FileIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {file.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {formatBytes(file.size)}
                  {pageCount !== null && ` · ${pageCount} page${pageCount === 1 ? "" : "s"}`}
                </p>
              </div>
              <button
                onClick={reset}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </Card>

          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your document a title"
            icon={<FileText className="h-4 w-4" />}
          />

          <Button
            size="lg"
            className="w-full"
            icon={<UploadCloud className="h-4 w-4" />}
            onClick={() => void processUpload()}
          >
            Process &amp; Upload
          </Button>
        </>
      )}

      {/* Processing states */}
      {loading && !completed && (
        <Card className="p-6">
          <AnimatePresence mode="wait">
            <div key={currentStep ?? "extract"}>
              <div className="mb-4 flex items-center gap-3">
                {steps.map((step, i) => {
                  const isActive = currentStep === step.id;
                  const isDone =
                    (currentStep && steps.findIndex((s) => s.id === currentStep) > i) ||
                    (currentStep === null && stepProgress >= 100);
                  return (
                    <FragmentStep
                      key={step.id}
                      index={i}
                      active={isActive}
                      done={isDone}
                    />
                  );
                })}
              </div>
              <div className="mb-4 flex items-center gap-2">
                {currentStep ? (
                  <Loader2 className="h-4 w-4 animate-spin text-apple-blue" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {steps.find((s) => s.id === currentStep)?.active ?? "Complete!"}
                </p>
              </div>
              <ProgressBar value={stepProgress} height={8} showLabel />
            </div>
          </AnimatePresence>
        </Card>
      )}

      {/* Complete */}
      {completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
        >
          <Card className="flex flex-col items-center gap-4 p-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"
            >
              <CheckCircle2 className="h-9 w-9" />
            </motion.div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Complete!
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your document is ready. Heading to chat...
              </p>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

function FragmentStep({
  index,
  active,
  done,
}: {
  index: number;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
          done
            ? "bg-emerald-500 text-white"
            : active
              ? "bg-apple-blue text-white"
              : "bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        )}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
      </div>
      <div
        className={cn(
          "rounded-full transition-colors",
          done
            ? "bg-emerald-500"
            : active
              ? "bg-apple-blue"
              : "bg-gray-200 dark:bg-gray-800",
          index === 0 ? "h-1.5 w-full" : "h-1.5 w-10"
        )}
      />
    </div>
  );
}

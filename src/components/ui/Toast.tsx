"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 3000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

const iconMap: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
};

const bgMap: Record<ToastType, string> = {
  success:
    "bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/60",
  error:
    "bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800/60",
  info: "bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800/60",
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 backdrop-blur-xl shadow-lg",
        bgMap[toast.type]
      )}
    >
      {iconMap[toast.type]}
      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-2 rounded-md p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

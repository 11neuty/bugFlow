"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { ToastViewport, type ToastTone } from "@/components/ui/Toast";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((currentToasts) =>
          currentToasts.filter((item) => item.id !== toast.id),
        );
      }, 3500),
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [toasts]);

  return (
    <ToastContext.Provider
      value={{
        pushToast: (toast) => {
          setToasts((currentToasts) => [
            ...currentToasts,
            {
              id: crypto.randomUUID(),
              ...toast,
            },
          ]);
        },
      }}
    >
      {children}
      <ToastViewport
        toasts={toasts}
        onDismiss={(id) => {
          setToasts((currentToasts) =>
            currentToasts.filter((toast) => toast.id !== id),
          );
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}

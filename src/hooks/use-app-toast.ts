"use client";

import { useMemo } from "react";

import { toast, useToast } from "@/hooks/use-toast";

import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

export const APP_TOAST_DURATION_MS = 10_000;

type AppToastVariant = Extract<ToastProps["variant"], "default" | "success" | "error">;

export interface AppToastOptions {
  readonly title?: string;
  readonly description: string;
  readonly action?: ToastActionElement;
  readonly duration?: number;
  readonly testId?: string;
}

interface InternalToastOptions extends AppToastOptions {
  readonly fallbackTitle: string;
  readonly variant: AppToastVariant;
}

function showAppToast({
  title,
  description,
  action,
  duration,
  testId,
  fallbackTitle,
  variant,
}: InternalToastOptions): ReturnType<typeof toast> {
  return toast({
    title: title ?? fallbackTitle,
    description,
    action,
    duration: duration ?? APP_TOAST_DURATION_MS,
    variant,
    "data-testid": testId ?? "app-toast",
  });
}

export function showSuccessToast(options: AppToastOptions): ReturnType<typeof toast> {
  return showAppToast({
    ...options,
    fallbackTitle: "Accion completada",
    variant: "success",
  });
}

export function showErrorToast(options: AppToastOptions): ReturnType<typeof toast> {
  return showAppToast({
    ...options,
    fallbackTitle: "No se pudo completar la accion",
    variant: "error",
  });
}

export function showInfoToast(options: AppToastOptions): ReturnType<typeof toast> {
  return showAppToast({
    ...options,
    fallbackTitle: "Aviso",
    variant: "default",
  });
}

interface AppToastApi {
  readonly success: (options: AppToastOptions) => ReturnType<typeof toast>;
  readonly error: (options: AppToastOptions) => ReturnType<typeof toast>;
  readonly info: (options: AppToastOptions) => ReturnType<typeof toast>;
  readonly dismiss: (toastId?: string) => void;
}

export function useAppToast(): AppToastApi {
  const { dismiss } = useToast();

  return useMemo(
    () => ({
      success: showSuccessToast,
      error: showErrorToast,
      info: showInfoToast,
      dismiss,
    }),
    [dismiss],
  );
}

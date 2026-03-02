"use client"

import { AlertCircle, CheckCircle2, Info } from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { APP_TOAST_DURATION_MS } from "@/hooks/use-app-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

const toastDecor = {
  default: {
    icon: Info,
    iconWrapperClassName:
      "bg-slate-900 text-white shadow-[0_14px_24px_rgba(15,23,42,0.18)]",
    descriptionClassName: "text-slate-600",
  },
  success: {
    icon: CheckCircle2,
    iconWrapperClassName:
      "bg-emerald-600 text-white shadow-[0_14px_24px_rgba(5,150,105,0.28)]",
    descriptionClassName: "text-emerald-900/80",
  },
  error: {
    icon: AlertCircle,
    iconWrapperClassName:
      "bg-rose-600 text-white shadow-[0_14px_24px_rgba(225,29,72,0.25)]",
    descriptionClassName: "text-rose-900/80",
  },
  destructive: {
    icon: AlertCircle,
    iconWrapperClassName:
      "bg-rose-600 text-white shadow-[0_14px_24px_rgba(225,29,72,0.25)]",
    descriptionClassName: "text-rose-900/80",
  },
} as const

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={APP_TOAST_DURATION_MS} swipeDirection="right">
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const decor = toastDecor[variant ?? "default"]
        const Icon = decor.icon

        return (
          <Toast key={id} variant={variant} {...props}>
            <div
              aria-hidden
              className={[
                "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl",
                decor.iconWrapperClassName,
              ].join(" ")}
            >
              <Icon className="size-5" strokeWidth={2.3} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription className={decor.descriptionClassName}>
                    {description}
                  </ToastDescription>
                )}
              </div>

              {action ? <div className="mt-3">{action}</div> : null}
            </div>

            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

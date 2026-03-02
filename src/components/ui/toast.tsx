"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

type ToastRootProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
  VariantProps<typeof toastVariants> & {
    "data-testid"?: string
  }

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "pointer-events-none fixed inset-x-0 top-4 z-[120] flex max-h-screen flex-col gap-3 px-4 sm:left-auto sm:right-5 sm:top-5 sm:w-full sm:max-w-[26rem] sm:px-0",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-[1.65rem] border px-4 py-4 pr-12 shadow-[0_22px_48px_rgba(15,23,42,0.18)] backdrop-blur-sm transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:animate-out data-[swipe=end]:fade-out-80 data-[swipe=end]:slide-out-to-right-full data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-full data-[state=closed]:sm:slide-out-to-right-full data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-right-full",
  {
    variants: {
      variant: {
        default:
          "toast-default border-slate-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] text-slate-900",
        success:
          "success border-emerald-200/90 bg-[linear-gradient(135deg,rgba(244,255,250,0.98),rgba(222,247,236,0.98))] text-emerald-950",
        error:
          "error border-rose-200/90 bg-[linear-gradient(135deg,rgba(255,247,247,0.98),rgba(255,232,236,0.98))] text-rose-950",
        destructive:
          "destructive group border-rose-200/90 bg-[linear-gradient(135deg,rgba(255,247,247,0.98),rgba(255,232,236,0.98))] text-rose-950",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastRootProps
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-rose-200 group-[.destructive]:text-rose-700 group-[.destructive]:hover:bg-rose-50 group-[.error]:border-rose-200 group-[.error]:text-rose-700 group-[.error]:hover:bg-rose-50 group-[.success]:border-emerald-200 group-[.success]:text-emerald-700 group-[.success]:hover:bg-emerald-50",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full border border-white/60 bg-white/80 text-slate-500 transition-colors hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 group-[.destructive]:border-rose-100 group-[.destructive]:bg-white/75 group-[.destructive]:text-rose-500 group-[.error]:border-rose-100 group-[.error]:bg-white/75 group-[.error]:text-rose-500 group-[.success]:border-emerald-100 group-[.success]:bg-white/75 group-[.success]:text-emerald-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-[1rem] font-semibold leading-5 tracking-tight", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-[0.95rem] leading-6 text-slate-600 opacity-100", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = ToastRootProps

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}

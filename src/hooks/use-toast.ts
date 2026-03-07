"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import { APP_TOAST_DURATION_MS, TOAST_REMOVE_DELAY_MS } from "@/hooks/toast-constants"
import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
const toastDismissTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const clearToastTimeout = (
  timeouts: Map<string, ReturnType<typeof setTimeout>>,
  toastId: string
) => {
  const timeout = timeouts.get(toastId)
  if (timeout) {
    clearTimeout(timeout)
    timeouts.delete(toastId)
  }
}

const clearToastTimers = (toastId: string) => {
  clearToastTimeout(toastTimeouts, toastId)
  clearToastTimeout(toastDismissTimeouts, toastId)
}

const addToDismissQueue = (toast: ToasterToast) => {
  clearToastTimeout(toastDismissTimeouts, toast.id)

  const duration =
    typeof toast.duration === "number" && Number.isFinite(toast.duration) && toast.duration > 0
      ? toast.duration
      : APP_TOAST_DURATION_MS

  const timeout = setTimeout(() => {
    toastDismissTimeouts.delete(toast.id)
    dispatch({
      type: "DISMISS_TOAST",
      toastId: toast.id,
    })
  }, duration)

  toastDismissTimeouts.set(toast.id, timeout)
}

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY_MS)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST": {
      addToDismissQueue(action.toast)

      const nextToasts = [action.toast, ...state.toasts].slice(0, TOAST_LIMIT)
      state.toasts
        .filter((toast) => !nextToasts.some((nextToast) => nextToast.id === toast.id))
        .forEach((toast) => {
          clearToastTimers(toast.id)
        })

      return {
        ...state,
        toasts: nextToasts,
      }
    }

    case "UPDATE_TOAST": {
      const nextToasts = state.toasts.map((toast) => {
        if (toast.id !== action.toast.id) {
          return toast
        }

        const nextToast = { ...toast, ...action.toast }
        if (nextToast.open === false) {
          clearToastTimeout(toastDismissTimeouts, nextToast.id)
        } else {
          addToDismissQueue(nextToast)
        }

        return nextToast
      })

      return {
        ...state,
        toasts: nextToasts,
      }
    }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        clearToastTimeout(toastDismissTimeouts, toastId)
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          clearToastTimeout(toastDismissTimeouts, toast.id)
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        state.toasts.forEach((toast) => {
          clearToastTimers(toast.id)
        })
        return {
          ...state,
          toasts: [],
        }
      }

      clearToastTimers(action.toastId)
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

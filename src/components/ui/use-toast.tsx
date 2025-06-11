import * as React from "react"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success" | "warning"
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  toast: (toast: Omit<Toast, "id">) => string
  dismiss: (toastId?: string) => void
  dismissAll: () => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  
  return context
}

// Toast Provider Component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const timeoutsRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map())

  const toast = React.useCallback((toastData: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const duration = toastData.duration ?? 5000
    
    const newToast: Toast = {
      ...toastData,
      id,
      duration
    }
    
    setToasts((prev) => [...prev, newToast])
    
    // Auto-dismiss after duration
    if (duration > 0) {
      const timeout = setTimeout(() => {
        dismiss(id)
      }, duration)
      
      timeoutsRef.current.set(id, timeout)
    }
    
    return id
  }, [])

  const dismiss = React.useCallback((toastId?: string) => {
    if (!toastId) {
      // Dismiss the oldest toast
      setToasts((prev) => {
        if (prev.length === 0) return prev
        const [first, ...rest] = prev
        
        // Clear timeout
        const timeout = timeoutsRef.current.get(first.id)
        if (timeout) {
          clearTimeout(timeout)
          timeoutsRef.current.delete(first.id)
        }
        
        return rest
      })
    } else {
      // Dismiss specific toast
      setToasts((prev) => prev.filter((t) => t.id !== toastId))
      
      // Clear timeout
      const timeout = timeoutsRef.current.get(toastId)
      if (timeout) {
        clearTimeout(timeout)
        timeoutsRef.current.delete(toastId)
      }
    }
  }, [])

  const dismissAll = React.useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
    timeoutsRef.current.clear()
    
    setToasts([])
  }, [])

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
    }
  }, [])

  const value = React.useMemo(
    () => ({
      toasts,
      toast,
      dismiss,
      dismissAll
    }),
    [toasts, toast, dismiss, dismissAll]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

// Note: Use useToast() hook directly in components instead of utility functions
// to avoid React Hook rule violations

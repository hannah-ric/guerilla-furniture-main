import React from "react"
import { Toast, ToastDescription, ToastTitle } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Toaster() {
  const { toasts, dismiss } = useToast()
  
  if (!toasts.length) return null
  
  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-2 md:max-w-[420px] pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="relative pointer-events-auto animate-in slide-in-from-right-full"
        >
          <Toast variant={toast.variant}>
            <div className="grid gap-1">
              {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
              {toast.description && (
                <ToastDescription>{toast.description}</ToastDescription>
              )}
              {toast.action && (
                <Button
                  size="sm"
                  variant={toast.variant === "destructive" ? "destructive" : "secondary"}
                  onClick={toast.action.onClick}
                  className="mt-2"
                >
                  {toast.action.label}
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => dismiss(toast.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Toast>
        </div>
      ))}
    </div>
  )
} 
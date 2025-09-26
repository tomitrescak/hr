'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: Toast = { id, type, message, duration }
    
    setToasts(prev => [...prev, toast])
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const getToastStyles = () => {
    const baseStyles = "flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg max-w-md animate-in slide-in-from-right"
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-green-50 border border-green-200 text-green-800`
      case 'error':
        return `${baseStyles} bg-red-50 border border-red-200 text-red-800`
      case 'warning':
        return `${baseStyles} bg-yellow-50 border border-yellow-200 text-yellow-800`
      case 'info':
        return `${baseStyles} bg-blue-50 border border-blue-200 text-blue-800`
      default:
        return `${baseStyles} bg-gray-50 border border-gray-200 text-gray-800`
    }
  }

  const getIcon = () => {
    const iconProps = { className: "h-5 w-5 flex-shrink-0" }
    
    switch (toast.type) {
      case 'success':
        return <CheckCircle {...iconProps} className="h-5 w-5 flex-shrink-0 text-green-600" />
      case 'error':
        return <XCircle {...iconProps} className="h-5 w-5 flex-shrink-0 text-red-600" />
      case 'warning':
        return <AlertCircle {...iconProps} className="h-5 w-5 flex-shrink-0 text-yellow-600" />
      case 'info':
        return <AlertCircle {...iconProps} className="h-5 w-5 flex-shrink-0 text-blue-600" />
      default:
        return <AlertCircle {...iconProps} />
    }
  }

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 rounded-full p-1 hover:bg-black/5 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Convenience functions
export const toast = {
  success: (message: string, duration?: number) => {
    // This will be implemented when used within the ToastProvider
  },
  error: (message: string, duration?: number) => {
    // This will be implemented when used within the ToastProvider
  },
  warning: (message: string, duration?: number) => {
    // This will be implemented when used within the ToastProvider
  },
  info: (message: string, duration?: number) => {
    // This will be implemented when used within the ToastProvider
  },
}
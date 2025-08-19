import { toast as baseToast } from "@/components/ui/use-toast"

// Convenience methods for different toast types
export const toast = {
  success: (message: string, options?: { description?: string } | string) => {
    const description = typeof options === 'string' ? options : options?.description;
    return baseToast({
      title: message,
      description,
      variant: "success",
    })
  },
  
  error: (message: string, options?: { description?: string } | string) => {
    const description = typeof options === 'string' ? options : options?.description;
    return baseToast({
      title: message,
      description,
      variant: "error",
    })
  },
  
  warning: (message: string, options?: { description?: string } | string) => {
    const description = typeof options === 'string' ? options : options?.description;
    return baseToast({
      title: message,
      description,
      variant: "warning",
    })
  },
  
  info: (message: string, options?: { description?: string } | string) => {
    const description = typeof options === 'string' ? options : options?.description;
    return baseToast({
      title: message,
      description,
      variant: "info",
    })
  },
  
  // Default toast (for backward compatibility)
  message: (message: string, options?: { description?: string } | string) => {
    const description = typeof options === 'string' ? options : options?.description;
    return baseToast({
      title: message,
      description,
      variant: "default",
    })
  },
  
  // For loading states
  loading: (message: string, options?: { description?: string } | string) => {
    const description = typeof options === 'string' ? options : options?.description;
    return baseToast({
      title: message,
      description,
      variant: "info",
      duration: 0, // Don't auto-dismiss loading toasts
    })
  },
  
  // Promise-based toast for async operations
  promise: async <T>(
    promise: Promise<T>,
    messages: {
      loading?: string
      success?: string | ((data: T) => string)
      error?: string | ((error: Error) => string)
    }
  ): Promise<T> => {
    const loadingToast = messages.loading ? baseToast({
      title: messages.loading,
      variant: "info",
      duration: 0, // Don't auto-dismiss loading toasts
    }) : null
    
    try {
      const result = await promise
      loadingToast?.dismiss()
      
      if (messages.success) {
        const successMessage = typeof messages.success === 'function' 
          ? messages.success(result) 
          : messages.success
        baseToast({
          title: successMessage,
          variant: "success",
        })
      }
      
      return result
    } catch (error) {
      loadingToast?.dismiss()
      
      if (messages.error) {
        const errorMessage = typeof messages.error === 'function' 
          ? messages.error(error as Error) 
          : messages.error
        baseToast({
          title: errorMessage,
          variant: "error",
        })
      }
      
      throw error
    }
  },
}

// Export the base toast for advanced usage
export { baseToast }
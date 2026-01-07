import { useCallback, useState } from 'react'
import { message } from 'antd'

// Hook for handling async operations with loading and error states
export const useAsync = <T, Args extends unknown[]>(
  asyncFunction: (...args: Args) => Promise<T>
) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T | null>(null)

  const execute = useCallback(
    async (...args: Args) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await asyncFunction(...args)
        setData(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [asyncFunction]
  )

  return { execute, isLoading, error, data }
}

// Hook for handling form submission with success/error messages
export const useFormSubmit = <T, Args extends unknown[]>(
  submitFunction: (...args: Args) => Promise<T>,
  options?: {
    successMessage?: string
    errorMessage?: string
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
  }
) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = useCallback(
    async (...args: Args) => {
      setIsSubmitting(true)
      try {
        const result = await submitFunction(...args)
        if (options?.successMessage) {
          message.success(options.successMessage)
        }
        options?.onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        message.error(options?.errorMessage || error.message || 'Operace selhala')
        options?.onError?.(error)
        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
    [submitFunction, options]
  )

  return { submit, isSubmitting }
}

// Hook for debounced value
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useState(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  })

  return debouncedValue
}

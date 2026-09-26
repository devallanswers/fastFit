import { useState, useCallback } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    setState({ data: null, loading: true, error: null })
    try {
      const data = await asyncFn()
      setState({ data, loading: false, error: null })
      return data
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Erro desconhecido'
      setState(prev => ({ ...prev, loading: false, error }))
      throw e
    }
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, execute, reset }
}

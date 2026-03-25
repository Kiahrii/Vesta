import { useCallback, useEffect, useRef, useState } from 'react';

const getErrorMessage = (error, fallbackMessage) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return fallbackMessage;
};

export function useSupabaseQuery(fetcher, options = {}) {
  const { initialData = null, deps = [], resetDataOnLoad = true, errorMessage = 'Unable to load data.' } = options;
  const initialValueRef = useRef(typeof initialData === 'function' ? initialData() : initialData);
  const [data, setData] = useState(initialValueRef.current);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError('');

    if (resetDataOnLoad) {
      setData(initialValueRef.current);
    }

    try {
      const result = await fetcher();
      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return null;
      }

      const nextData = result ?? initialValueRef.current;
      setData(nextData);
      setLoading(false);
      return nextData;
    } catch (fetchError) {
      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return null;
      }

      setData(initialValueRef.current);
      setError(getErrorMessage(fetchError, errorMessage));
      setLoading(false);
      return null;
    }
  }, [fetcher, resetDataOnLoad, errorMessage, ...deps]);

  useEffect(() => {
    run();
  }, [run]);

  return {
    data,
    loading,
    error,
    refetch: run
  };
}

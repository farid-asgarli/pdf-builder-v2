/**
 * useDebounce Hook
 *
 * A generic hook for debouncing values.
 * Useful for delaying expensive operations like API calls
 * until the user has stopped typing/interacting.
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook to debounce a value
 *
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds (default: 500ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * function SearchComponent() {
 *   const [searchTerm, setSearchTerm] = useState("");
 *   const debouncedSearchTerm = useDebounce(searchTerm, 300);
 *
 *   useEffect(() => {
 *     if (debouncedSearchTerm) {
 *       // Perform search with debounced value
 *       searchApi(debouncedSearchTerm);
 *     }
 *   }, [debouncedSearchTerm]);
 *
 *   return (
 *     <input
 *       value={searchTerm}
 *       onChange={(e) => setSearchTerm(e.target.value)}
 *     />
 *   );
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook to create a debounced callback function
 *
 * @param callback - The function to debounce
 * @param delay - The debounce delay in milliseconds (default: 500ms)
 * @returns A debounced version of the callback and a cancel function
 *
 * @example
 * ```tsx
 * function SaveComponent() {
 *   const { debouncedCallback: save, cancel } = useDebouncedCallback(
 *     (data: SaveData) => {
 *       saveToApi(data);
 *     },
 *     1000
 *   );
 *
 *   const handleChange = (data: SaveData) => {
 *     save(data); // Will be debounced
 *   };
 *
 *   return <Editor onChange={handleChange} />;
 * }
 * ```
 */
export function useDebouncedCallback<
  T extends (...args: Parameters<T>) => void,
>(
  callback: T,
  delay: number = 500
): {
  debouncedCallback: (...args: Parameters<T>) => void;
  cancel: () => void;
  isPending: boolean;
} {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  const [isPending, setIsPending] = useState(false);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setIsPending(false);
    }
  }, []);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      cancel();
      setIsPending(true);

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timeoutRef.current = null;
        setIsPending(false);
      }, delay);
    },
    [delay, cancel]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return { debouncedCallback, cancel, isPending };
}

/**
 * Hook to debounce a value with immediate option
 *
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds
 * @param options - Configuration options
 * @returns Object with debounced value and control functions
 *
 * @example
 * ```tsx
 * function SearchComponent() {
 *   const [searchTerm, setSearchTerm] = useState("");
 *   const { debouncedValue, isDebouncing, flush } = useDebounceWithOptions(
 *     searchTerm,
 *     300,
 *     { leading: true }
 *   );
 *
 *   return (
 *     <div>
 *       <input
 *         value={searchTerm}
 *         onChange={(e) => setSearchTerm(e.target.value)}
 *       />
 *       {isDebouncing && <span>Typing...</span>}
 *       <button onClick={flush}>Search Now</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDebounceWithOptions<T>(
  value: T,
  delay: number,
  options: {
    /** Execute on the leading edge of the timeout */
    leading?: boolean;
    /** Maximum time to wait before forcing execution */
    maxWait?: number;
  } = {}
): {
  debouncedValue: T;
  isDebouncing: boolean;
  flush: () => void;
  cancel: () => void;
} {
  const { leading = false, maxWait } = options;

  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastValueRef = useRef<T>(value);
  const leadingExecutedRef = useRef(false);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
      maxWaitTimeoutRef.current = null;
    }
    setIsDebouncing(false);
    leadingExecutedRef.current = false;
  }, []);

  const flush = useCallback(() => {
    cancel();
    setDebouncedValue(lastValueRef.current);
  }, [cancel]);

  // Track previous value to detect changes for leading edge
  const prevValueRef = useRef<T>(value);

  // Handle leading edge execution outside of effect to avoid synchronous setState in effect
  // This pattern is intentional: we update state during render when leading edge is triggered
  // to provide immediate feedback without cascading renders from effects.
  if (
    leading &&
    value !== prevValueRef.current &&
    !leadingExecutedRef.current
  ) {
    prevValueRef.current = value;
    setDebouncedValue(value);
    leadingExecutedRef.current = true;
  }

  useEffect(() => {
    lastValueRef.current = value;

    // Skip effect body if leading edge was already handled this render
    if (leading && leadingExecutedRef.current && value === debouncedValue) {
      return;
    }

    setIsDebouncing(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
      leadingExecutedRef.current = false;
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
        maxWaitTimeoutRef.current = null;
      }
    }, delay);

    // Handle maxWait
    if (maxWait && !maxWaitTimeoutRef.current) {
      maxWaitTimeoutRef.current = setTimeout(() => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setDebouncedValue(lastValueRef.current);
        setIsDebouncing(false);
        leadingExecutedRef.current = false;
        maxWaitTimeoutRef.current = null;
      }, maxWait);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay, leading, maxWait]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return { debouncedValue, isDebouncing, flush, cancel };
}

export default useDebounce;

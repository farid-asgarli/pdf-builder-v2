/**
 * API Error Utilities
 * Helper functions for handling and displaying API errors
 */

import { ApiError } from "./client";

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Extract a user-friendly message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred";
}

/**
 * Get validation errors from an API error if available
 */
export function getValidationErrors(
  error: unknown
): { field?: string; message: string }[] {
  if (!isApiError(error) || !error.validationErrors) {
    return [];
  }

  return error.validationErrors.map((e) => ({
    field: e.propertyPath,
    message: e.message,
  }));
}

/**
 * Check if error indicates user needs to retry
 */
export function isRetryableError(error: unknown): boolean {
  if (!isApiError(error)) {
    return false;
  }

  // Network errors, timeouts, and 5xx errors are typically retryable
  return (
    error.isNetworkError ||
    error.isTimeout ||
    (error.status >= 500 && error.status < 600)
  );
}

/**
 * Check if error indicates user needs to re-authenticate
 */
export function requiresAuthentication(error: unknown): boolean {
  return isApiError(error) && error.status === 401;
}

/**
 * Format validation errors for form display
 */
export function formatValidationErrorsForForm(
  error: unknown
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!isApiError(error) || !error.validationErrors) {
    return errors;
  }

  for (const validationError of error.validationErrors) {
    const field = validationError.propertyPath || "_root";
    // If multiple errors for same field, join them
    if (errors[field]) {
      errors[field] = `${errors[field]}. ${validationError.message}`;
    } else {
      errors[field] = validationError.message;
    }
  }

  return errors;
}

/**
 * Create a toast-friendly error object
 */
export function toToastError(error: unknown): {
  title: string;
  description: string;
  variant: "default" | "destructive";
} {
  if (isApiError(error)) {
    return {
      title: error.isServerError
        ? "Server Error"
        : error.isValidationError
          ? "Validation Error"
          : error.isNetworkError
            ? "Connection Error"
            : "Error",
      description: error.userMessage,
      variant: "destructive",
    };
  }

  return {
    title: "Error",
    description: getErrorMessage(error),
    variant: "destructive",
  };
}

/**
 * Log error to console with structured format (for debugging)
 */
export function logError(error: unknown, context?: string): void {
  if (isApiError(error)) {
    console.error(`[${context || "API Error"}]`, error.toJSON());
  } else if (error instanceof Error) {
    console.error(`[${context || "Error"}]`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  } else {
    console.error(`[${context || "Unknown Error"}]`, error);
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = (error) => isRetryableError(error),
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelayMs
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

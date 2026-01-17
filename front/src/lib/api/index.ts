/**
 * API exports
 *
 * This module provides a unified API layer for communicating with the
 * PDFBuilder backend. It includes:
 * - API client with request/response interceptors
 * - Error handling utilities
 * - Typed endpoint functions for each API domain
 */

// Core API client
export {
  apiClient,
  api,
  ApiError,
  type ApiErrorResponse,
  type ProblemDetails,
  type ValidationErrorDetail,
} from "./client";

// Error handling utilities
export {
  isApiError,
  getErrorMessage,
  getValidationErrors,
  isRetryableError,
  requiresAuthentication,
  formatValidationErrorsForForm,
  toToastError,
  logError,
  withRetry,
} from "./error-utils";

// API Endpoints
export * from "./endpoints";

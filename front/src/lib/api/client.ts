import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { apiConfig } from "@/config/api";

/**
 * RFC 7807 ProblemDetails format from backend
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  // Custom extensions from backend
  correlationId?: string;
  timestamp?: string;
  errorCode?: string;
  nodeId?: string;
  nodePath?: string;
  componentType?: string;
  expression?: string;
  propertyName?: string;
  errorPosition?: number;
  templateId?: string;
  templateName?: string;
  validationErrors?: ValidationErrorDetail[];
  exception?: string;
  stackTrace?: string;
}

/**
 * Validation error detail from backend
 */
export interface ValidationErrorDetail {
  code: string;
  message: string;
  propertyPath?: string;
  nodeId?: string;
  severity?: "Error" | "Warning";
}

/**
 * Legacy API Error Response type (kept for backward compatibility)
 * @deprecated Use ProblemDetails instead
 */
export interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
  traceId?: string;
}

/**
 * Custom API Error class with typed response
 * Handles RFC 7807 ProblemDetails format from backend
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly correlationId?: string;
  public readonly details?: Record<string, string[]>;
  public readonly validationErrors?: ValidationErrorDetail[];
  public readonly nodeId?: string;
  public readonly nodePath?: string;
  public readonly componentType?: string;
  public readonly expression?: string;
  public readonly propertyName?: string;
  public readonly isNetworkError: boolean;
  public readonly isTimeout: boolean;
  public readonly isCancelled: boolean;

  constructor(options: {
    message: string;
    status: number;
    code?: string;
    correlationId?: string;
    details?: Record<string, string[]>;
    validationErrors?: ValidationErrorDetail[];
    nodeId?: string;
    nodePath?: string;
    componentType?: string;
    expression?: string;
    propertyName?: string;
    isNetworkError?: boolean;
    isTimeout?: boolean;
    isCancelled?: boolean;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.correlationId = options.correlationId;
    this.details = options.details;
    this.validationErrors = options.validationErrors;
    this.nodeId = options.nodeId;
    this.nodePath = options.nodePath;
    this.componentType = options.componentType;
    this.expression = options.expression;
    this.propertyName = options.propertyName;
    this.isNetworkError = options.isNetworkError ?? false;
    this.isTimeout = options.isTimeout ?? false;
    this.isCancelled = options.isCancelled ?? false;
  }

  /**
   * Check if error is a validation error (422)
   */
  get isValidationError(): boolean {
    return this.status === 422;
  }

  /**
   * Check if error is a client error (4xx)
   */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  get isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if error is an authorization error (401 or 403)
   */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /**
   * Check if error is a not found error (404)
   */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /**
   * Get a user-friendly error message
   */
  get userMessage(): string {
    if (this.isNetworkError) {
      return "Unable to connect to server. Please check your internet connection.";
    }
    if (this.isTimeout) {
      return "The request timed out. Please try again.";
    }
    if (this.isCancelled) {
      return "The request was cancelled.";
    }
    if (this.isValidationError && this.validationErrors?.length) {
      return this.validationErrors.map((e) => e.message).join(". ");
    }
    if (this.isServerError) {
      return "A server error occurred. Please try again later.";
    }
    return this.message;
  }

  /**
   * Convert to a plain object for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      correlationId: this.correlationId,
      validationErrors: this.validationErrors,
      nodeId: this.nodeId,
      isNetworkError: this.isNetworkError,
      isTimeout: this.isTimeout,
    };
  }
}

/**
 * Parse error response from backend
 * Handles both ProblemDetails (RFC 7807) and legacy formats
 */
function parseErrorResponse(
  error: AxiosError<ProblemDetails | ApiErrorResponse>
): ApiError {
  // Handle cancellation
  if (axios.isCancel(error)) {
    return new ApiError({
      message: "Request was cancelled",
      status: 0,
      code: "REQUEST_CANCELLED",
      isCancelled: true,
    });
  }

  // Handle timeout
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return new ApiError({
      message: "Request timed out",
      status: 0,
      code: "TIMEOUT",
      isTimeout: true,
    });
  }

  // Handle network errors (no response)
  if (!error.response) {
    return new ApiError({
      message: error.message || "Network error",
      status: 0,
      code: "NETWORK_ERROR",
      isNetworkError: true,
    });
  }

  const { status, data } = error.response;

  // Check if response is ProblemDetails format
  if (data && "title" in data) {
    const problemDetails = data as ProblemDetails;
    return new ApiError({
      message: problemDetails.detail || problemDetails.title,
      status,
      code: problemDetails.errorCode,
      correlationId: problemDetails.correlationId,
      validationErrors: problemDetails.validationErrors,
      nodeId: problemDetails.nodeId,
      nodePath: problemDetails.nodePath,
      componentType: problemDetails.componentType,
      expression: problemDetails.expression,
      propertyName: problemDetails.propertyName,
    });
  }

  // Handle legacy format
  if (data && "message" in data) {
    const legacyData = data as ApiErrorResponse;
    return new ApiError({
      message: legacyData.message,
      status,
      code: legacyData.code,
      correlationId: legacyData.traceId,
      details: legacyData.details,
    });
  }

  // Fallback for unexpected error formats
  return new ApiError({
    message: error.message || "An unexpected error occurred",
    status,
    code: "UNKNOWN_ERROR",
  });
}

/**
 * Create and configure the Axios instance
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: apiConfig.baseUrl,
    timeout: apiConfig.timeout,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    // Ensure we can access error response data
    validateStatus: (status) => status >= 200 && status < 300,
  });

  // Request interceptor
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Generate request ID for tracking
      const requestId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString();
      config.headers.set("X-Request-ID", requestId);

      // Add auth token if available (for future auth implementation)
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("auth_token")
          : null;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Log requests in debug mode
      if (apiConfig.debug) {
        // eslint-disable-next-line no-console
        console.info(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
          requestId,
          params: config.params,
          data: config.data,
        });
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(
        parseErrorResponse(
          error as AxiosError<ProblemDetails | ApiErrorResponse>
        )
      );
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log responses in debug mode
      if (apiConfig.debug) {
        // eslint-disable-next-line no-console
        console.info(`[API] Response ${response.status}`, {
          url: response.config.url,
          data: response.data,
        });
      }
      return response;
    },
    (error: AxiosError<ProblemDetails | ApiErrorResponse>) => {
      const apiError = parseErrorResponse(error);

      // Log errors
      if (apiConfig.debug || apiError.isServerError) {
        console.error("[API] Error", apiError.toJSON());
      }

      // Handle specific status codes for side effects
      if (apiError.status === 401 && typeof window !== "undefined") {
        // Unauthorized - clear token
        localStorage.removeItem("auth_token");
        // Optionally dispatch an event for auth state management
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }

      throw apiError;
    }
  );

  return client;
}

// Create the API client singleton
export const apiClient = createApiClient();

/**
 * Type-safe request helper functions
 */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.get<T>(url, config).then((res) => res.data),

  post: <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> => apiClient.post<T>(url, data, config).then((res) => res.data),

  put: <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> => apiClient.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> =>
    apiClient.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.delete<T>(url, config).then((res) => res.data),

  /**
   * Download a file (e.g., PDF) from the API
   */
  download: async (url: string, filename: string): Promise<void> => {
    const response = await apiClient.get(url, {
      responseType: "blob",
    });

    // Create a download link
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Upload a file to the API
   */
  upload: async <T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<T> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<T>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });

    return response.data;
  },
};

export default apiClient;

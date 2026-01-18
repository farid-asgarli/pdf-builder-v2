/**
 * API Configuration
 * Centralized configuration for API endpoints and settings
 */

export const apiConfig = {
  /** Base URL for the backend API */
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5273",

  /** Request timeout in milliseconds */
  timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000,

  /** Maximum file upload size in bytes */
  maxFileSize: Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE) || 10485760, // 10MB

  /** Allowed image formats for upload */
  allowedImageFormats: (
    process.env.NEXT_PUBLIC_ALLOWED_IMAGE_FORMATS || "png,jpg,jpeg,webp,svg"
  ).split(","),

  /** Debug mode flag */
  debug: process.env.NEXT_PUBLIC_DEBUG === "true",
} as const;

/**
 * API Endpoints
 * All API endpoint paths used by the frontend
 */
export const endpoints = {
  // PDF Generation
  pdf: {
    generate: "/api/pdf/generate",
    preview: "/api/pdf/preview",
  },

  // Validation
  validation: {
    validate: "/api/validation/validate",
  },

  // Templates
  templates: {
    list: "/api/templates",
    get: (id: string) => `/api/templates/${id}`,
    create: "/api/templates",
    update: (id: string) => `/api/templates/${id}`,
    delete: (id: string) => `/api/templates/${id}`,
    duplicate: (id: string) => `/api/templates/${id}/duplicate`,
  },

  // Assets (images, fonts, etc.)
  assets: {
    upload: "/api/assets/upload",
    get: (id: string) => `/api/assets/${id}`,
  },
} as const;

export type ApiEndpoints = typeof endpoints;

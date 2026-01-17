/**
 * Image Upload API Endpoints
 * Aligned with backend PDFBuilder.API.Controllers.ImagesController
 */

import { api, apiClient } from "../client";
import type {
  ImageUploadResponse,
  BatchImageUploadResponse,
} from "@/types/api";

/**
 * Images API base URL
 */
const IMAGES_BASE = "/api/images";

/**
 * Image upload options
 */
export interface ImageUploadOptions {
  /** Whether to auto-resize large images */
  autoResize?: boolean;
  /** Maximum width for resizing */
  maxWidth?: number;
  /** Maximum height for resizing */
  maxHeight?: number;
  /** Compression quality (1-100) */
  quality?: number;
  /** Output format (jpeg, png, webp) */
  outputFormat?: "jpeg" | "png" | "webp";
  /** Custom filename (without extension) */
  customFilename?: string;
}

/**
 * Batch upload options
 */
export interface BatchUploadOptions {
  /** Whether to auto-resize large images */
  autoResize?: boolean;
  /** Compression quality (1-100) */
  quality?: number;
  /** Operation ID for SignalR progress tracking */
  operationId?: string;
}

/**
 * Images API
 */
export const imagesApi = {
  /**
   * Upload a single image file
   * POST /api/images/upload
   *
   * @param file - The image file to upload
   * @param options - Upload options
   * @param onProgress - Progress callback (0-100)
   * @returns Upload response with image details
   */
  upload: async (
    file: File,
    options?: ImageUploadOptions,
    onProgress?: (progress: number) => void
  ): Promise<ImageUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    // Build query params from options
    const params = new URLSearchParams();
    if (options?.autoResize !== undefined) {
      params.append("autoResize", String(options.autoResize));
    }
    if (options?.maxWidth) {
      params.append("maxWidth", String(options.maxWidth));
    }
    if (options?.maxHeight) {
      params.append("maxHeight", String(options.maxHeight));
    }
    if (options?.quality) {
      params.append("quality", String(options.quality));
    }
    if (options?.outputFormat) {
      params.append("outputFormat", options.outputFormat);
    }
    if (options?.customFilename) {
      params.append("customFilename", options.customFilename);
    }

    const queryString = params.toString();
    const url = queryString
      ? `${IMAGES_BASE}/upload?${queryString}`
      : `${IMAGES_BASE}/upload`;

    const response = await apiClient.post<ImageUploadResponse>(url, formData, {
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

  /**
   * Upload multiple image files
   * POST /api/images/upload/batch
   *
   * @param files - Array of image files to upload
   * @param options - Batch upload options
   * @param onProgress - Progress callback (0-100)
   * @returns Batch upload response
   */
  uploadBatch: async (
    files: File[],
    options?: BatchUploadOptions,
    onProgress?: (progress: number) => void
  ): Promise<BatchImageUploadResponse> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    // Build query params from options
    const params = new URLSearchParams();
    if (options?.autoResize !== undefined) {
      params.append("autoResize", String(options.autoResize));
    }
    if (options?.quality) {
      params.append("quality", String(options.quality));
    }
    if (options?.operationId) {
      params.append("operationId", options.operationId);
    }

    const queryString = params.toString();
    const url = queryString
      ? `${IMAGES_BASE}/upload/batch?${queryString}`
      : `${IMAGES_BASE}/upload/batch`;

    const response = await apiClient.post<BatchImageUploadResponse>(
      url,
      formData,
      {
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
      }
    );

    return response.data;
  },

  /**
   * Get an image by ID
   * GET /api/images/{id}
   *
   * @param id - Image ID
   * @returns Image URL or blob
   */
  getById: async (id: string): Promise<string> => {
    return `${IMAGES_BASE}/${id}`;
  },

  /**
   * Get image metadata by ID
   * GET /api/images/{id}/metadata
   *
   * @param id - Image ID
   * @returns Image metadata
   */
  getMetadata: async (id: string): Promise<ImageUploadResponse> => {
    return api.get<ImageUploadResponse>(`${IMAGES_BASE}/${id}/metadata`);
  },

  /**
   * Delete an image by ID
   * DELETE /api/images/{id}
   *
   * @param id - Image ID
   * @returns Success status
   */
  delete: async (id: string): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>(`${IMAGES_BASE}/${id}`);
  },

  /**
   * Get the full URL for an image
   *
   * @param imageUrl - Relative image URL or ID
   * @returns Full URL to the image
   */
  getFullUrl: (imageUrl: string): string => {
    // If already a full URL, return as-is
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // If it's a relative URL, prepend the API base
    const apiBaseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_API_URL || "";

    return `${apiBaseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  },
};

/**
 * Helper to validate file before upload
 */
export function validateImageFile(
  file: File,
  options?: {
    maxSizeBytes?: number;
    allowedTypes?: string[];
  }
): { valid: boolean; error?: string } {
  const maxSize = options?.maxSizeBytes || 10 * 1024 * 1024; // 10MB default
  const allowedTypes = options?.allowedTypes || [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed (${Math.round(maxSize / 1024 / 1024)}MB)`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Helper to convert File to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/xxx;base64, prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Helper to get image dimensions from File
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default imagesApi;

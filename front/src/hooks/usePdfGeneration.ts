/**
 * PDF Generation Hook
 *
 * React Query-based hook for PDF generation with:
 * - Build JSON payload from canvas state (header/content/footer)
 * - POST to /api/pdf/generate
 * - Loading/error state management
 * - Download generated PDF
 * - Preview URL generation
 * - Template-based generation support
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { pdfApi } from "@/lib/api/endpoints/pdf";
import { useCanvasStore } from "@/store/canvas-store";
import { useTemplateStore } from "@/store/template-store";
import { usePreviewStore } from "@/store/preview-store";
import { toTemplateLayoutDto } from "@/types/template";
import type {
  GeneratePdfRequest,
  GenerateFromTemplateRequest,
  PdfGenerationResponse,
  PdfMetadataDto,
  GenerationOptionsDto,
} from "@/types/api";

// ============================================================================
// TYPES
// ============================================================================

/**
 * PDF generation options for the hook
 */
export interface PdfGenerationOptions {
  /** Custom filename for the generated PDF (without extension) */
  filename?: string;
  /** PDF document metadata */
  metadata?: PdfMetadataDto;
  /** Generation options (compression, quality, etc.) */
  options?: GenerationOptionsDto;
  /** Data context for expression evaluation */
  data?: Record<string, unknown>;
}

/**
 * Result of building the PDF payload
 */
export interface BuildPayloadResult {
  /** Whether the payload was built successfully */
  success: boolean;
  /** The generated request payload */
  request?: GeneratePdfRequest;
  /** Error message if building failed */
  error?: string;
}

/**
 * Return type for the usePdfGeneration hook
 */
export interface UsePdfGenerationReturn {
  // State
  /** Whether a PDF generation is in progress */
  isGenerating: boolean;
  /** Whether a preview is being generated */
  isGeneratingPreview: boolean;
  /** Whether the download is in progress */
  isDownloading: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Last generation response */
  lastResponse: PdfGenerationResponse | null;

  // Actions
  /** Generate PDF from current canvas state and download */
  generateAndDownload: (options?: PdfGenerationOptions) => Promise<void>;
  /** Generate PDF from current canvas state and return response */
  generate: (options?: PdfGenerationOptions) => Promise<PdfGenerationResponse>;
  /** Generate PDF preview URL for display */
  generatePreview: (options?: PdfGenerationOptions) => Promise<string>;
  /** Generate PDF from a saved template */
  generateFromTemplate: (
    templateId: string,
    options?: Omit<PdfGenerationOptions, "pageSettings">
  ) => Promise<PdfGenerationResponse>;
  /** Generate PDF from template and download */
  generateFromTemplateAndDownload: (
    templateId: string,
    options?: Omit<PdfGenerationOptions, "pageSettings">
  ) => Promise<void>;
  /** Build the request payload from canvas state (useful for debugging) */
  buildPayload: (options?: PdfGenerationOptions) => BuildPayloadResult;
  /** Clear the error state */
  clearError: () => void;
  /** Reset all state */
  reset: () => void;
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const pdfGenerationKeys = {
  all: ["pdf-generation"] as const,
  generate: () => [...pdfGenerationKeys.all, "generate"] as const,
  preview: () => [...pdfGenerationKeys.all, "preview"] as const,
  fromTemplate: (templateId: string) =>
    [...pdfGenerationKeys.all, "from-template", templateId] as const,
};

// ============================================================================
// PAYLOAD BUILDER
// ============================================================================

import type { TemplateStructure } from "@/store/canvas-store";

/**
 * Build the PDF generation request payload from canvas template structure
 * Uses the full header/content/footer layout
 */
function buildPdfRequest(
  templateStructure: TemplateStructure,
  options: PdfGenerationOptions = {}
): GeneratePdfRequest {
  const { filename, metadata, options: genOptions, data } = options;

  // Convert frontend template structure to backend TemplateLayoutDto
  const templateLayout = toTemplateLayoutDto(templateStructure);

  const request: GeneratePdfRequest = {
    templateLayout,
  };

  // Add optional fields only if provided
  if (data && Object.keys(data).length > 0) {
    request.data = data;
  }

  if (filename) {
    request.filename = filename;
  }

  if (metadata) {
    request.metadata = metadata;
  }

  if (genOptions) {
    request.options = genOptions;
  }

  return request;
}

/**
 * Build the template generation request payload
 */
function buildTemplateRequest(
  options: PdfGenerationOptions = {}
): GenerateFromTemplateRequest {
  const { filename, options: genOptions, data } = options;

  const request: GenerateFromTemplateRequest = {};

  if (data && Object.keys(data).length > 0) {
    request.data = data;
  }

  if (filename) {
    request.filename = filename;
  }

  if (genOptions) {
    request.options = genOptions;
  }

  return request;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for PDF generation from canvas state
 *
 * Provides methods to generate PDFs, download them, and create preview URLs.
 * Integrates with canvas store, template store, and preview store.
 *
 * @example
 * ```tsx
 * function ExportButton() {
 *   const {
 *     generateAndDownload,
 *     isGenerating,
 *     error
 *   } = usePdfGeneration();
 *
 *   const handleExport = async () => {
 *     await generateAndDownload({
 *       filename: "my-document",
 *       data: { customerName: "John Doe" }
 *     });
 *   };
 *
 *   return (
 *     <Button
 *       onClick={handleExport}
 *       disabled={isGenerating}
 *     >
 *       {isGenerating ? "Generating..." : "Export PDF"}
 *     </Button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Generate preview for display
 * function PreviewPane() {
 *   const { generatePreview, isGeneratingPreview } = usePdfGeneration();
 *   const [previewUrl, setPreviewUrl] = useState<string | null>(null);
 *
 *   const refreshPreview = async () => {
 *     const url = await generatePreview();
 *     setPreviewUrl(url);
 *   };
 *
 *   return (
 *     <div>
 *       {previewUrl && <iframe src={previewUrl} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePdfGeneration(): UsePdfGenerationReturn {
  const queryClient = useQueryClient();

  // Get canvas state - use exportToJson to get full template structure
  const content = useCanvasStore((state) => state.content);
  const exportToJson = useCanvasStore((state) => state.exportToJson);

  // Get template state for test data
  const template = useTemplateStore((state) => state.template);

  // Preview store for preview panel integration
  const previewStore = usePreviewStore();

  // ========================================
  // Generate PDF Mutation
  // ========================================
  const generateMutation = useMutation({
    mutationKey: pdfGenerationKeys.generate(),
    mutationFn: async (request: GeneratePdfRequest) => {
      return pdfApi.generate(request);
    },
    onError: (error) => {
      console.error("[usePdfGeneration] Generation failed:", error);
    },
  });

  // ========================================
  // Generate and Download Mutation
  // ========================================
  const downloadMutation = useMutation({
    mutationKey: [...pdfGenerationKeys.generate(), "download"],
    mutationFn: async ({
      request,
      filename,
    }: {
      request: GeneratePdfRequest;
      filename?: string;
    }) => {
      await pdfApi.generateAndDownload(request, filename);
    },
    onError: (error) => {
      console.error("[usePdfGeneration] Download failed:", error);
    },
  });

  // ========================================
  // Generate Preview Mutation
  // ========================================
  const previewMutation = useMutation({
    mutationKey: pdfGenerationKeys.preview(),
    mutationFn: async (request: GeneratePdfRequest) => {
      previewStore.setLoading(true);
      try {
        const url = await pdfApi.generatePreview(request);
        previewStore.setPdfUrl(url);
        return url;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Preview generation failed";
        previewStore.setError(message);
        throw error;
      }
    },
    onError: (error) => {
      console.error("[usePdfGeneration] Preview generation failed:", error);
    },
  });

  // ========================================
  // Generate from Template Mutation
  // ========================================
  const templateMutation = useMutation({
    mutationKey: pdfGenerationKeys.fromTemplate(""),
    mutationFn: async ({
      templateId,
      request,
    }: {
      templateId: string;
      request: GenerateFromTemplateRequest;
    }) => {
      return pdfApi.generateFromTemplate(templateId, request);
    },
    onError: (error) => {
      console.error("[usePdfGeneration] Template generation failed:", error);
    },
  });

  // ========================================
  // Template Download Mutation
  // ========================================
  const templateDownloadMutation = useMutation({
    mutationKey: [...pdfGenerationKeys.fromTemplate(""), "download"],
    mutationFn: async ({
      templateId,
      request,
      filename,
    }: {
      templateId: string;
      request: GenerateFromTemplateRequest;
      filename?: string;
    }) => {
      await pdfApi.generateFromTemplateAndDownload(
        templateId,
        request,
        filename
      );
    },
    onError: (error) => {
      console.error("[usePdfGeneration] Template download failed:", error);
    },
  });

  // ========================================
  // Build Payload
  // ========================================
  const buildPayload = useCallback(
    (options: PdfGenerationOptions = {}): BuildPayloadResult => {
      if (!content) {
        return {
          success: false,
          error: "No layout found. Add components to the canvas first.",
        };
      }

      try {
        // Get the full template structure from canvas store
        const templateStructure = exportToJson();

        // Merge options with template test data
        const mergedOptions: PdfGenerationOptions = {
          ...options,
          // Use template test data if not overridden
          data: options.data ?? template?.testData,
        };

        const request = buildPdfRequest(templateStructure, mergedOptions);

        return {
          success: true,
          request,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to build PDF payload";
        return {
          success: false,
          error: message,
        };
      }
    },
    [content, exportToJson, template]
  );

  // ========================================
  // Generate and Download
  // ========================================
  const generateAndDownload = useCallback(
    async (options: PdfGenerationOptions = {}): Promise<void> => {
      const payload = buildPayload(options);

      if (!payload.success || !payload.request) {
        throw new Error(payload.error ?? "Failed to build PDF request");
      }

      await downloadMutation.mutateAsync({
        request: payload.request,
        filename: options.filename,
      });
    },
    [buildPayload, downloadMutation]
  );

  // ========================================
  // Generate
  // ========================================
  const generate = useCallback(
    async (
      options: PdfGenerationOptions = {}
    ): Promise<PdfGenerationResponse> => {
      const payload = buildPayload(options);

      if (!payload.success || !payload.request) {
        throw new Error(payload.error ?? "Failed to build PDF request");
      }

      return generateMutation.mutateAsync(payload.request);
    },
    [buildPayload, generateMutation]
  );

  // ========================================
  // Generate Preview
  // ========================================
  const generatePreview = useCallback(
    async (options: PdfGenerationOptions = {}): Promise<string> => {
      const payload = buildPayload(options);

      if (!payload.success || !payload.request) {
        throw new Error(payload.error ?? "Failed to build PDF request");
      }

      return previewMutation.mutateAsync(payload.request);
    },
    [buildPayload, previewMutation]
  );

  // ========================================
  // Generate from Template
  // ========================================
  const generateFromTemplate = useCallback(
    async (
      templateId: string,
      options: Omit<PdfGenerationOptions, "pageSettings"> = {}
    ): Promise<PdfGenerationResponse> => {
      const request = buildTemplateRequest(options);
      return templateMutation.mutateAsync({ templateId, request });
    },
    [templateMutation]
  );

  // ========================================
  // Generate from Template and Download
  // ========================================
  const generateFromTemplateAndDownload = useCallback(
    async (
      templateId: string,
      options: Omit<PdfGenerationOptions, "pageSettings"> = {}
    ): Promise<void> => {
      const request = buildTemplateRequest(options);
      await templateDownloadMutation.mutateAsync({
        templateId,
        request,
        filename: options.filename,
      });
    },
    [templateDownloadMutation]
  );

  // ========================================
  // Clear Error
  // ========================================
  const clearError = useCallback(() => {
    generateMutation.reset();
    downloadMutation.reset();
    previewMutation.reset();
    templateMutation.reset();
    templateDownloadMutation.reset();
    previewStore.setError(null);
  }, [
    generateMutation,
    downloadMutation,
    previewMutation,
    templateMutation,
    templateDownloadMutation,
    previewStore,
  ]);

  // ========================================
  // Reset
  // ========================================
  const reset = useCallback(() => {
    clearError();
    previewStore.reset();
    queryClient.removeQueries({ queryKey: pdfGenerationKeys.all });
  }, [clearError, previewStore, queryClient]);

  // ========================================
  // Computed State
  // ========================================
  const isGenerating = generateMutation.isPending || templateMutation.isPending;

  const isGeneratingPreview = previewMutation.isPending;

  const isDownloading =
    downloadMutation.isPending || templateDownloadMutation.isPending;

  // Extract error values for simpler dependency tracking (React Compiler compatible)
  const generateError = generateMutation.error;
  const downloadError = downloadMutation.error;
  const previewError = previewMutation.error;
  const templateError = templateMutation.error;
  const templateDownloadError = templateDownloadMutation.error;

  const error = useMemo(() => {
    const errors = [
      generateError,
      downloadError,
      previewError,
      templateError,
      templateDownloadError,
    ];

    for (const err of errors) {
      if (err) {
        return err instanceof Error ? err.message : "PDF generation failed";
      }
    }

    return null;
  }, [
    generateError,
    downloadError,
    previewError,
    templateError,
    templateDownloadError,
  ]);

  // Extract data values for simpler dependency tracking
  const generateData = generateMutation.data;
  const templateData = templateMutation.data;

  const lastResponse = useMemo(() => {
    return generateData ?? templateData ?? null;
  }, [generateData, templateData]);

  return {
    // State
    isGenerating,
    isGeneratingPreview,
    isDownloading,
    error,
    lastResponse,

    // Actions
    generateAndDownload,
    generate,
    generatePreview,
    generateFromTemplate,
    generateFromTemplateAndDownload,
    buildPayload,
    clearError,
    reset,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to check if PDF generation is possible
 * (i.e., there's content on the canvas)
 */
export function useCanGeneratePdf(): boolean {
  const content = useCanvasStore((state) => state.content);
  return content !== null;
}

/**
 * Hook to get the current PDF generation status
 * Useful for showing status in multiple components
 */
export function usePdfGenerationStatus() {
  const {
    isGenerating,
    isGeneratingPreview,
    isDownloading,
    error,
    lastResponse,
  } = usePdfGeneration();

  return {
    isGenerating,
    isGeneratingPreview,
    isDownloading,
    error,
    lastResponse,
    isAnyOperationPending: isGenerating || isGeneratingPreview || isDownloading,
  };
}

export default usePdfGeneration;

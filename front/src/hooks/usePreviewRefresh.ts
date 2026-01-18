/**
 * usePreviewRefresh Hook
 *
 * Automatically triggers PDF preview generation when canvas state changes.
 * Features:
 * - Debounced updates to prevent excessive API calls
 * - Configurable auto-refresh
 * - Manual refresh trigger
 * - Loading and error state management
 */
"use client";

import { useEffect, useCallback, useRef } from "react";
import { useDebouncedCallback } from "./useDebounce";
import { usePdfGeneration } from "./usePdfGeneration";
import { useCanvasStore } from "@/store/canvas-store";
import { usePreviewStore } from "@/store/preview-store";
import { useTemplateStore } from "@/store/template-store";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for the usePreviewRefresh hook
 */
export interface UsePreviewRefreshOptions {
  /** Whether to automatically refresh when canvas changes (default: true) */
  autoRefresh?: boolean;
  /** Debounce delay in milliseconds (default: 1000ms) */
  debounceDelay?: number;
  /** Whether the preview panel is enabled/visible (default: true) */
  enabled?: boolean;
  /** Callback when preview generation starts */
  onGenerateStart?: () => void;
  /** Callback when preview generation succeeds */
  onGenerateSuccess?: (url: string) => void;
  /** Callback when preview generation fails */
  onGenerateError?: (error: string) => void;
}

/**
 * Return type for the usePreviewRefresh hook
 */
export interface UsePreviewRefreshReturn {
  /** Current preview URL (blob URL) */
  previewUrl: string | null;
  /** Whether preview is currently being generated */
  isLoading: boolean;
  /** Error message if preview generation failed */
  error: string | null;
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Current zoom level (0.5-2) */
  zoom: number;
  /** Whether preview panel is open */
  isOpen: boolean;
  /** Whether a refresh is pending (debouncing) */
  isRefreshPending: boolean;
  /** Manually trigger a preview refresh */
  refresh: () => Promise<void>;
  /** Clear the current error */
  clearError: () => void;
  /** Open the preview panel */
  openPreview: () => void;
  /** Close the preview panel */
  closePreview: () => void;
  /** Toggle the preview panel */
  togglePreview: () => void;
  /** Navigate to next page */
  nextPage: () => void;
  /** Navigate to previous page */
  previousPage: () => void;
  /** Go to a specific page */
  goToPage: (page: number) => void;
  /** Set zoom level */
  setZoom: (zoom: number) => void;
  /** Zoom in */
  zoomIn: () => void;
  /** Zoom out */
  zoomOut: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default debounce delay for preview refresh (1 second) */
const DEFAULT_DEBOUNCE_DELAY = 1000;

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for automatic PDF preview refresh on canvas changes
 *
 * @param options - Configuration options
 * @returns Preview state and control functions
 *
 * @example
 * ```tsx
 * function PreviewPane() {
 *   const {
 *     previewUrl,
 *     isLoading,
 *     error,
 *     currentPage,
 *     totalPages,
 *     nextPage,
 *     previousPage,
 *     refresh,
 *   } = usePreviewRefresh({ debounceDelay: 500 });
 *
 *   return (
 *     <div>
 *       {isLoading && <LoadingSpinner />}
 *       {error && <ErrorMessage message={error} />}
 *       {previewUrl && (
 *         <>
 *           <PdfViewer url={previewUrl} />
 *           <PageNavigation
 *             current={currentPage}
 *             total={totalPages}
 *             onNext={nextPage}
 *             onPrevious={previousPage}
 *           />
 *         </>
 *       )}
 *       <button onClick={refresh}>Refresh Preview</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePreviewRefresh(
  options: UsePreviewRefreshOptions = {}
): UsePreviewRefreshReturn {
  const {
    autoRefresh = true,
    debounceDelay = DEFAULT_DEBOUNCE_DELAY,
    enabled = true,
    onGenerateStart,
    onGenerateSuccess,
    onGenerateError,
  } = options;

  // Get canvas state for change detection
  const content = useCanvasStore((state) => state.content);
  const lastModified = useCanvasStore((state) => state.lastModified);

  // Get template test data for preview generation
  const testData = useTemplateStore((state) => state.template?.testData);

  // Preview store state
  const previewStore = usePreviewStore();
  const {
    isOpen,
    isLoading,
    error,
    pdfUrl: previewUrl,
    currentPage,
    totalPages,
    zoom,
    openPreview,
    closePreview,
    togglePreview,
    nextPage,
    previousPage,
    goToPage,
    setZoom,
    zoomIn,
    zoomOut,
    setError,
  } = previewStore;

  // PDF generation hook
  const { generatePreview, clearError: clearGenerationError } =
    usePdfGeneration();

  // Track whether we're waiting for debounced refresh
  const { debouncedCallback: debouncedRefresh, isPending: isRefreshPending } =
    useDebouncedCallback(async () => {
      if (!enabled || !isOpen || !content) {
        return;
      }

      onGenerateStart?.();

      try {
        const url = await generatePreview({
          data: testData ?? undefined,
        });
        onGenerateSuccess?.(url);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Preview generation failed";
        onGenerateError?.(errorMessage);
      }
    }, debounceDelay);

  // Ref to track if this is the initial mount
  const isInitialMount = useRef(true);

  // Ref to track the last timestamp we processed
  const lastProcessedTimestamp = useRef<number | null>(null);

  // Auto-refresh when canvas changes
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Skip if auto-refresh is disabled
    if (!autoRefresh || !enabled || !isOpen) {
      return;
    }

    // Skip if there's no content layout
    if (!content) {
      return;
    }

    // Skip if we've already processed this timestamp
    if (lastModified === lastProcessedTimestamp.current) {
      return;
    }

    lastProcessedTimestamp.current = lastModified;

    // Trigger debounced refresh
    debouncedRefresh();
  }, [lastModified, content, autoRefresh, enabled, isOpen, debouncedRefresh]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!content) {
      setError("No layout to preview. Add components to the canvas first.");
      return;
    }

    onGenerateStart?.();

    try {
      const url = await generatePreview({
        data: testData ?? undefined,
      });
      onGenerateSuccess?.(url);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Preview generation failed";
      setError(errorMessage);
      onGenerateError?.(errorMessage);
    }
  }, [
    content,
    testData,
    generatePreview,
    setError,
    onGenerateStart,
    onGenerateSuccess,
    onGenerateError,
  ]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
    clearGenerationError();
  }, [setError, clearGenerationError]);

  return {
    previewUrl,
    isLoading,
    error,
    currentPage,
    totalPages,
    zoom,
    isOpen,
    isRefreshPending,
    refresh,
    clearError,
    openPreview,
    closePreview,
    togglePreview,
    nextPage,
    previousPage,
    goToPage,
    setZoom,
    zoomIn,
    zoomOut,
  };
}

/**
 * Hook to get just the preview visibility state
 * Useful for components that only need to know if preview is open
 */
export function usePreviewVisibility() {
  const isOpen = usePreviewStore((state) => state.isOpen);
  const openPreview = usePreviewStore((state) => state.openPreview);
  const closePreview = usePreviewStore((state) => state.closePreview);
  const togglePreview = usePreviewStore((state) => state.togglePreview);

  return {
    isOpen,
    openPreview,
    closePreview,
    togglePreview,
  };
}

/**
 * Hook to get just the preview loading state
 * Useful for showing loading indicators in multiple places
 */
export function usePreviewLoading() {
  const isLoading = usePreviewStore((state) => state.isLoading);
  const error = usePreviewStore((state) => state.error);

  return {
    isLoading,
    error,
  };
}

/**
 * Hook to get preview pagination state
 * Useful for page navigation controls
 */
export function usePreviewPagination() {
  const currentPage = usePreviewStore((state) => state.currentPage);
  const totalPages = usePreviewStore((state) => state.totalPages);
  const nextPage = usePreviewStore((state) => state.nextPage);
  const previousPage = usePreviewStore((state) => state.previousPage);
  const goToPage = usePreviewStore((state) => state.goToPage);

  return {
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    nextPage,
    previousPage,
    goToPage,
  };
}

/**
 * Hook to get preview zoom state
 * Useful for zoom controls
 */
export function usePreviewZoom() {
  const zoom = usePreviewStore((state) => state.zoom);
  const setZoom = usePreviewStore((state) => state.setZoom);
  const zoomIn = usePreviewStore((state) => state.zoomIn);
  const zoomOut = usePreviewStore((state) => state.zoomOut);

  return {
    zoom,
    zoomPercentage: Math.round(zoom * 100),
    setZoom,
    zoomIn,
    zoomOut,
  };
}

export default usePreviewRefresh;

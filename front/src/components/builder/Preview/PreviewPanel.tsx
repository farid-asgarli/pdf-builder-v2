/**
 * PreviewPanel Component
 *
 * Main preview panel that integrates:
 * - PdfViewer for rendering PDFs
 * - PreviewToolbar for controls
 * - Loading states and error handling
 * - Debounced auto-refresh on canvas changes
 */
"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  FileWarning,
} from "lucide-react";
import { PdfViewer } from "./PdfViewer";
import { PreviewToolbar } from "./PreviewToolbar";
import { usePreviewRefresh } from "@/hooks/usePreviewRefresh";
import { usePdfGeneration } from "@/hooks/usePdfGeneration";
import { usePreviewStore } from "@/store/preview-store";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the PreviewPanel component
 */
export interface PreviewPanelProps {
  /** Whether to auto-refresh when canvas changes (default: true) */
  autoRefresh?: boolean;
  /** Debounce delay for auto-refresh in ms (default: 1000) */
  debounceDelay?: number;
  /** Additional className for the panel */
  className?: string;
  /** Whether to show the toolbar (default: true) */
  showToolbar?: boolean;
  /** Panel position - affects layout */
  position?: "right" | "bottom" | "floating";
  /** Default width for right position */
  defaultWidth?: number;
  /** Default height for bottom position */
  defaultHeight?: number;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Error display with retry button
 */
function PreviewError({
  error,
  onRetry,
  isLoading,
}: {
  error: string;
  onRetry: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
        <AlertCircle className="text-destructive h-8 w-8" />
      </div>
      <div className="max-w-75 space-y-2">
        <h3 className="text-destructive font-semibold">Preview Failed</h3>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isLoading}
        className="gap-2"
      >
        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        {isLoading ? "Retrying..." : "Retry"}
      </Button>
    </div>
  );
}

/**
 * Empty state when no preview is available
 */
function PreviewEmptyState({
  onGenerate,
  isLoading,
}: {
  onGenerate: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
        <FileWarning className="text-muted-foreground h-8 w-8" />
      </div>
      <div className="max-w-75 space-y-2">
        <h3 className="font-semibold">No Preview Available</h3>
        <p className="text-muted-foreground text-sm">
          Add components to the canvas and generate a preview to see your PDF.
        </p>
      </div>
      <Button
        variant="default"
        size="sm"
        onClick={onGenerate}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Eye className="h-4 w-4" />
            Generate Preview
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * Loading overlay during preview generation
 */
function PreviewLoadingOverlay({ message = "Generating preview..." }) {
  return (
    <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}

/**
 * Preview toggle button for collapsed state
 */
export function PreviewToggleButton({
  isOpen,
  onClick,
  isLoading,
  className,
}: {
  isOpen: boolean;
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={onClick}
          className={cn("gap-2", className)}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isOpen ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {isOpen ? "Hide Preview" : "Show Preview"}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isOpen ? "Hide PDF preview panel" : "Show PDF preview panel"}
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PreviewPanel component - Main PDF preview panel with auto-refresh
 *
 * @example
 * ```tsx
 * function Builder() {
 *   return (
 *     <div className="flex">
 *       <Canvas />
 *       <PreviewPanel
 *         autoRefresh
 *         debounceDelay={1000}
 *         position="right"
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export const PreviewPanel = memo(function PreviewPanel({
  autoRefresh = true,
  debounceDelay = 1000,
  className,
  showToolbar = true,
  position = "right",
  defaultWidth = 400,
  defaultHeight = 400,
}: PreviewPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Use preview refresh hook for auto-refresh functionality
  const {
    previewUrl,
    isLoading,
    error,
    currentPage,
    totalPages,
    zoom,
    isOpen,
    isRefreshPending,
    refresh,
    clearError: _clearError,
    closePreview,
    nextPage,
    previousPage,
    goToPage,
    setZoom,
    zoomIn,
    zoomOut,
  } = usePreviewRefresh({
    autoRefresh,
    debounceDelay,
    enabled: true,
  });

  // PDF generation for download
  const { generateAndDownload, isDownloading: _isDownloading } =
    usePdfGeneration();

  // Get page info setter from preview store
  const setPageInfo = usePreviewStore((state) => state.setPageInfo);

  // Handle document load success - update total pages
  const handleDocumentLoadSuccess = useCallback(
    (numPages: number) => {
      setPageInfo(currentPage, numPages);
    },
    [currentPage, setPageInfo]
  );

  // Handle download
  const handleDownload = useCallback(async () => {
    try {
      await generateAndDownload({ filename: "preview" });
    } catch (err) {
      console.error("[PreviewPanel] Download failed:", err);
    }
  }, [generateAndDownload]);

  // Handle fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts if preview is open
      if (!isOpen) return;

      // Escape to close fullscreen or panel
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          closePreview();
        }
        return;
      }

      // Arrow keys for page navigation (when not in input)
      if (
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        if (e.key === "ArrowLeft" || e.key === "PageUp") {
          e.preventDefault();
          previousPage();
        } else if (e.key === "ArrowRight" || e.key === "PageDown") {
          e.preventDefault();
          nextPage();
        }
      }

      // Ctrl/Cmd + Plus/Minus for zoom
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          zoomIn();
        } else if (e.key === "-") {
          e.preventDefault();
          zoomOut();
        } else if (e.key === "0") {
          e.preventDefault();
          setZoom(1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    isFullscreen,
    closePreview,
    previousPage,
    nextPage,
    zoomIn,
    zoomOut,
    setZoom,
  ]);

  // Don't render if closed (unless we want to show a toggle)
  if (!isOpen) {
    return null;
  }

  // Calculate dimensions based on position and fullscreen
  const panelStyle: React.CSSProperties = isFullscreen
    ? {
        position: "fixed",
        inset: 0,
        zIndex: 50,
      }
    : position === "right"
      ? {
          width: defaultWidth,
          minWidth: 300,
          maxWidth: 600,
        }
      : position === "bottom"
        ? {
            height: defaultHeight,
            minHeight: 200,
            maxHeight: 600,
          }
        : {};

  return (
    <div
      className={cn(
        "bg-background flex flex-col border-l",
        isFullscreen && "fixed inset-0 z-50 border-0",
        position === "bottom" && "border-t border-l-0",
        position === "floating" &&
          "absolute top-4 right-4 rounded-lg border shadow-2xl",
        className
      )}
      style={panelStyle}
    >
      {/* Toolbar */}
      {showToolbar && (
        <PreviewToolbar
          currentPage={currentPage}
          totalPages={totalPages}
          zoom={zoom}
          isLoading={isLoading}
          isRefreshPending={isRefreshPending}
          isFullscreen={isFullscreen}
          onNextPage={nextPage}
          onPreviousPage={previousPage}
          onGoToPage={goToPage}
          onSetZoom={setZoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onRefresh={refresh}
          onClose={closePreview}
          onToggleFullscreen={handleToggleFullscreen}
          onDownload={handleDownload}
        />
      )}

      {/* Content area */}
      <div className="relative flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div
            className={cn(
              "flex min-h-full items-center justify-center p-4",
              isLoading && "pointer-events-none"
            )}
          >
            {/* Error state */}
            {error && !isLoading && (
              <PreviewError
                error={error}
                onRetry={refresh}
                isLoading={isLoading}
              />
            )}

            {/* Empty state */}
            {!error && !previewUrl && !isLoading && (
              <PreviewEmptyState onGenerate={refresh} isLoading={isLoading} />
            )}

            {/* PDF viewer */}
            {!error && previewUrl && (
              <PdfViewer
                source={previewUrl}
                currentPage={currentPage}
                zoom={zoom}
                totalPages={totalPages}
                onDocumentLoadSuccess={handleDocumentLoadSuccess}
                showPageNumber={totalPages > 1}
                className="w-full"
              />
            )}
          </div>
        </ScrollArea>

        {/* Loading overlay */}
        {isLoading && (
          <PreviewLoadingOverlay
            message={
              isRefreshPending ? "Updating preview..." : "Generating preview..."
            }
          />
        )}
      </div>

      {/* Status bar (optional) */}
      {(isLoading || isRefreshPending) && (
        <div className="bg-muted/50 text-muted-foreground flex items-center justify-center gap-2 border-t px-3 py-1.5 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          {isRefreshPending
            ? "Changes detected, updating preview..."
            : "Generating preview..."}
        </div>
      )}
    </div>
  );
});

// Default export
export default PreviewPanel;

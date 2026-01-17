/**
 * PdfViewer Component
 *
 * Core PDF rendering component using react-pdf.
 * Renders PDF pages with configurable zoom and handles
 * page loading states.
 */
"use client";

import { useState, useCallback, useRef, memo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { DocumentProps, PageProps } from "react-pdf";
import { cn } from "@/lib/utils";
import { Loader2, FileWarning, FileX } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
// Using CDN for the worker to avoid build issues with Next.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the PdfViewer component
 */
export interface PdfViewerProps {
  /** PDF source - can be URL, base64 data URI, or File object */
  source: string | File | null;
  /** Current page number (1-indexed) */
  currentPage?: number;
  /** Zoom level (0.5-2, where 1 = 100%) */
  zoom?: number;
  /** Width of the container (optional, defaults to fit container) */
  width?: number;
  /** Whether to render text layer for text selection */
  renderTextLayer?: boolean;
  /** Whether to render annotation layer for links */
  renderAnnotationLayer?: boolean;
  /** Callback when document loads successfully */
  onDocumentLoadSuccess?: (numPages: number) => void;
  /** Callback when document fails to load */
  onDocumentLoadError?: (error: Error) => void;
  /** Callback when page loads successfully */
  onPageLoadSuccess?: (pageNumber: number) => void;
  /** Callback when page fails to load */
  onPageLoadError?: (error: Error) => void;
  /** Additional className for the container */
  className?: string;
  /** Whether to show page number overlay */
  showPageNumber?: boolean;
  /** Total pages (for page number display) */
  totalPages?: number;
}

/**
 * Loading spinner for PDF loading states
 */
function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

/**
 * Error display component
 */
function ErrorDisplay({
  title,
  message,
  icon: Icon = FileX,
}: {
  title: string;
  message?: string;
  icon?: typeof FileX;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
        <Icon className="text-destructive h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-destructive text-sm font-medium">{title}</p>
        {message && (
          <p className="text-muted-foreground max-w-62.5 text-xs">{message}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state when no PDF is loaded
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
        <FileWarning className="text-muted-foreground h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm font-medium">
          No preview available
        </p>
        <p className="text-muted-foreground max-w-62.5 text-xs">
          Add components to the canvas and click refresh to generate a preview
        </p>
      </div>
    </div>
  );
}

/**
 * Page number overlay
 */
function PageNumberOverlay({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  return (
    <div className="bg-background/90 absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border px-3 py-1 text-xs font-medium shadow-md">
      Page {currentPage} of {totalPages}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PDF Viewer component that renders PDF documents using react-pdf
 *
 * @example
 * ```tsx
 * <PdfViewer
 *   source={previewUrl}
 *   currentPage={1}
 *   zoom={1}
 *   onDocumentLoadSuccess={(numPages) => setTotalPages(numPages)}
 * />
 * ```
 */
export const PdfViewer = memo(function PdfViewer({
  source,
  currentPage = 1,
  zoom = 1,
  width,
  renderTextLayer = true,
  renderAnnotationLayer = true,
  onDocumentLoadSuccess,
  onDocumentLoadError,
  onPageLoadSuccess,
  onPageLoadError,
  className,
  showPageNumber = true,
  totalPages = 1,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [documentError, setDocumentError] = useState<Error | null>(null);
  const [pageError, setPageError] = useState<Error | null>(null);

  // Track previous source to detect changes
  const prevSourceRef = useRef(source);

  // Reset state when source changes (using ref comparison to avoid synchronous setState in effect)
  // This pattern is intentional: we update state during render when source changes to avoid
  // cascading renders that would occur if we used useEffect for this synchronization.
  // eslint-disable-next-line react-hooks/refs
  if (source && source !== prevSourceRef.current) {
    // eslint-disable-next-line react-hooks/refs
    prevSourceRef.current = source;
    // These state updates are intentional during render when source changes
    setDocumentError(null);
    setPageError(null);
    setIsDocumentLoading(true);
  }

  // Handle document load success
  const handleDocumentLoadSuccess = useCallback(
    (document: { numPages: number }) => {
      setNumPages(document.numPages);
      setIsDocumentLoading(false);
      setDocumentError(null);
      onDocumentLoadSuccess?.(document.numPages);
    },
    [onDocumentLoadSuccess]
  );

  // Handle document load error
  const handleDocumentLoadError = useCallback(
    (error: Error) => {
      console.error("[PdfViewer] Document load error:", error);
      setDocumentError(error);
      setIsDocumentLoading(false);
      onDocumentLoadError?.(error);
    },
    [onDocumentLoadError]
  );

  // Handle page load success
  const handlePageLoadSuccess = useCallback(
    (page: { pageNumber: number }) => {
      setIsPageLoading(false);
      setPageError(null);
      onPageLoadSuccess?.(page.pageNumber);
    },
    [onPageLoadSuccess]
  );

  // Handle page load error
  const handlePageLoadError = useCallback(
    (error: Error) => {
      console.error("[PdfViewer] Page load error:", error);
      setPageError(error);
      setIsPageLoading(false);
      onPageLoadError?.(error);
    },
    [onPageLoadError]
  );

  // Handle page render started (reserved for future use)
  const _handlePageLoadingStart = useCallback(() => {
    setIsPageLoading(true);
    setPageError(null);
  }, []);

  // No source provided
  if (!source) {
    return (
      <div
        className={cn(
          "bg-muted/30 flex min-h-50 items-center justify-center rounded-lg",
          className
        )}
      >
        <EmptyState />
      </div>
    );
  }

  // Document error
  if (documentError) {
    return (
      <div
        className={cn(
          "bg-muted/30 flex min-h-50 items-center justify-center rounded-lg",
          className
        )}
      >
        <ErrorDisplay
          title="Failed to load PDF"
          message={documentError.message}
          icon={FileX}
        />
      </div>
    );
  }

  // Calculate scale based on zoom
  const scale = zoom;

  return (
    <div
      className={cn(
        "bg-muted/30 relative flex items-center justify-center overflow-hidden rounded-lg",
        className
      )}
    >
      <Document
        file={source}
        onLoadSuccess={handleDocumentLoadSuccess}
        onLoadError={handleDocumentLoadError}
        loading={<LoadingSpinner message="Loading PDF..." />}
        error={
          <ErrorDisplay
            title="Failed to load PDF"
            message="Unable to load the PDF document"
          />
        }
        className="flex items-center justify-center"
      >
        <div className="relative">
          <Page
            pageNumber={currentPage}
            scale={scale}
            width={width}
            renderTextLayer={renderTextLayer}
            renderAnnotationLayer={renderAnnotationLayer}
            onLoadSuccess={handlePageLoadSuccess}
            onLoadError={handlePageLoadError}
            onRenderSuccess={() => setIsPageLoading(false)}
            loading={
              <div className="flex items-center justify-center p-8">
                <LoadingSpinner message="Rendering page..." />
              </div>
            }
            error={
              <ErrorDisplay
                title="Failed to render page"
                message="Unable to render this page"
              />
            }
            className="shadow-lg"
          />

          {/* Page loading overlay */}
          {isPageLoading && (
            <div className="bg-background/50 absolute inset-0 flex items-center justify-center backdrop-blur-sm">
              <LoadingSpinner message="Rendering..." />
            </div>
          )}

          {/* Page error overlay */}
          {pageError && !isPageLoading && (
            <div className="bg-background/80 absolute inset-0 flex items-center justify-center">
              <ErrorDisplay
                title="Page error"
                message={pageError.message}
                icon={FileWarning}
              />
            </div>
          )}
        </div>
      </Document>

      {/* Page number overlay */}
      {showPageNumber && numPages && numPages > 1 && (
        <PageNumberOverlay
          currentPage={currentPage}
          totalPages={totalPages || numPages}
        />
      )}

      {/* Loading overlay during initial document load */}
      {isDocumentLoading && (
        <div className="bg-background/80 absolute inset-0 flex items-center justify-center backdrop-blur-sm">
          <LoadingSpinner message="Loading PDF document..." />
        </div>
      )}
    </div>
  );
});

// Default export
export default PdfViewer;

// Type exports for external use
export type { DocumentProps as PdfDocumentProps, PageProps as PdfPageProps };

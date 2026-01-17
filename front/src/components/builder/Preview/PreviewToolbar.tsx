/**
 * PreviewToolbar Component
 *
 * Toolbar for the PDF preview panel with:
 * - Page navigation (prev/next, page input)
 * - Zoom controls
 * - Refresh button
 * - Close button
 */
"use client";

import { memo, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  X,
  Maximize2,
  Minimize2,
  Download,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the PreviewToolbar component
 */
export interface PreviewToolbarProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Current zoom level (0.5-2, where 1 = 100%) */
  zoom: number;
  /** Whether the preview is currently loading */
  isLoading?: boolean;
  /** Whether refresh is pending (debouncing) */
  isRefreshPending?: boolean;
  /** Whether the panel is in fullscreen mode */
  isFullscreen?: boolean;
  /** Callback when navigating to the next page */
  onNextPage?: () => void;
  /** Callback when navigating to the previous page */
  onPreviousPage?: () => void;
  /** Callback when going to a specific page */
  onGoToPage?: (page: number) => void;
  /** Callback when zoom changes */
  onSetZoom?: (zoom: number) => void;
  /** Callback when zooming in */
  onZoomIn?: () => void;
  /** Callback when zooming out */
  onZoomOut?: () => void;
  /** Callback when refresh is requested */
  onRefresh?: () => void;
  /** Callback when close is requested */
  onClose?: () => void;
  /** Callback when fullscreen toggle is requested */
  onToggleFullscreen?: () => void;
  /** Callback when download is requested */
  onDownload?: () => void;
  /** Additional className */
  className?: string;
}

// ============================================================================
// ZOOM PRESETS
// ============================================================================

const ZOOM_PRESETS = [
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1 },
  { label: "125%", value: 1.25 },
  { label: "150%", value: 1.5 },
  { label: "200%", value: 2 },
] as const;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Page navigation controls
 */
function PageNavigation({
  currentPage,
  totalPages,
  isLoading,
  onNextPage,
  onPreviousPage,
  onGoToPage,
}: {
  currentPage: number;
  totalPages: number;
  isLoading?: boolean;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  onGoToPage?: (page: number) => void;
}) {
  const [inputValue, setInputValue] = useState(String(currentPage));

  // Sync input value with current page
  useEffect(() => {
    setInputValue(String(currentPage));
  }, [currentPage]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    []
  );

  const handleInputBlur = useCallback(() => {
    const page = parseInt(inputValue, 10);
    if (
      !isNaN(page) &&
      page >= 1 &&
      page <= totalPages &&
      page !== currentPage
    ) {
      onGoToPage?.(page);
    } else {
      setInputValue(String(currentPage));
    }
  }, [inputValue, totalPages, currentPage, onGoToPage]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleInputBlur();
        (e.target as HTMLInputElement).blur();
      } else if (e.key === "Escape") {
        setInputValue(String(currentPage));
        (e.target as HTMLInputElement).blur();
      }
    },
    [handleInputBlur, currentPage]
  );

  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onPreviousPage}
            disabled={!hasPreviousPage || isLoading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Previous page</TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-1 text-sm">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          className="h-7 w-10 px-1 text-center text-xs"
          disabled={isLoading || totalPages <= 1}
          aria-label="Current page number"
        />
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground w-6 text-center">
          {totalPages}
        </span>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onNextPage}
            disabled={!hasNextPage || isLoading}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Next page</TooltipContent>
      </Tooltip>
    </div>
  );
}

/**
 * Zoom controls
 */
function ZoomControls({
  zoom,
  isLoading,
  onSetZoom,
  onZoomIn,
  onZoomOut,
}: {
  zoom: number;
  isLoading?: boolean;
  onSetZoom?: (zoom: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}) {
  const zoomPercentage = Math.round(zoom * 100);
  const canZoomIn = zoom < 2;
  const canZoomOut = zoom > 0.5;

  const handleZoomPresetClick = useCallback(
    (value: number) => {
      onSetZoom?.(value);
    },
    [onSetZoom]
  );

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onZoomOut}
            disabled={!canZoomOut || isLoading}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Zoom out</TooltipContent>
      </Tooltip>

      <div className="group relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 min-w-15 px-2 text-xs"
          disabled={isLoading}
        >
          {zoomPercentage}%
        </Button>

        {/* Zoom presets dropdown */}
        <div className="bg-popover absolute top-full left-1/2 z-50 mt-1 hidden min-w-20 -translate-x-1/2 flex-col rounded-md border shadow-lg group-hover:flex">
          {ZOOM_PRESETS.map((preset) => (
            <button
              key={preset.value}
              className={cn(
                "hover:bg-accent px-3 py-1.5 text-left text-xs",
                zoom === preset.value && "bg-accent"
              )}
              onClick={() => handleZoomPresetClick(preset.value)}
              disabled={isLoading}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onZoomIn}
            disabled={!canZoomIn || isLoading}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Zoom in</TooltipContent>
      </Tooltip>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PreviewToolbar component with page navigation, zoom controls, and actions
 *
 * @example
 * ```tsx
 * <PreviewToolbar
 *   currentPage={1}
 *   totalPages={5}
 *   zoom={1}
 *   onNextPage={nextPage}
 *   onPreviousPage={previousPage}
 *   onZoomIn={zoomIn}
 *   onZoomOut={zoomOut}
 *   onRefresh={refresh}
 *   onClose={closePreview}
 * />
 * ```
 */
export const PreviewToolbar = memo(function PreviewToolbar({
  currentPage,
  totalPages,
  zoom,
  isLoading = false,
  isRefreshPending = false,
  isFullscreen = false,
  onNextPage,
  onPreviousPage,
  onGoToPage,
  onSetZoom,
  onZoomIn,
  onZoomOut,
  onRefresh,
  onClose,
  onToggleFullscreen,
  onDownload,
  className,
}: PreviewToolbarProps) {
  return (
    <div
      className={cn(
        "bg-background/95 supports-backdrop-filter:bg-background/60 flex items-center justify-between gap-2 border-b px-3 py-2 backdrop-blur",
        className
      )}
    >
      {/* Left section: Page navigation */}
      <PageNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        isLoading={isLoading}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
        onGoToPage={onGoToPage}
      />

      {/* Center section: Zoom controls */}
      <ZoomControls
        zoom={zoom}
        isLoading={isLoading}
        onSetZoom={onSetZoom}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />

      {/* Right section: Actions */}
      <div className="flex items-center gap-1">
        {/* Refresh button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh preview"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  (isLoading || isRefreshPending) && "animate-spin"
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isRefreshPending ? "Refreshing..." : "Refresh preview"}
          </TooltipContent>
        </Tooltip>

        {/* Download button */}
        {onDownload && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onDownload}
                disabled={isLoading}
                aria-label="Download PDF"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Download PDF</TooltipContent>
          </Tooltip>
        )}

        {/* Fullscreen toggle */}
        {onToggleFullscreen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onToggleFullscreen}
                disabled={isLoading}
                aria-label={
                  isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                }
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Separator */}
        <div className="bg-border mx-1 h-4 w-px" />

        {/* Close button */}
        {onClose && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Close preview</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
});

// Default export
export default PreviewToolbar;

/**
 * Canvas Component
 * Main canvas area for the PDF builder with zoom, pan, and grid support
 *
 * Features:
 * - Zoom controls (25%, 50%, 75%, 100%, 125%, 150%, 200%)
 * - Pan functionality (mouse drag, touch, wheel)
 * - Grid background (dots, lines, or dashed)
 * - Optional ruler guides
 * - Drop zone for drag and drop
 * - Keyboard shortcuts support
 */
"use client";

import { useCallback, useRef, useEffect, useState, memo } from "react";
import { cn } from "@/lib/utils";
import { useCanvasViewStore } from "@/store/canvas-view-store";
import { useInteractionStore } from "@/store/interaction-store";
import { useCanvasZoom } from "@/hooks/useCanvasZoom";
import { useCanvasPan } from "@/hooks/useCanvasPan";
import { CanvasGrid, type GridPattern } from "./CanvasGrid";
import { CanvasRulers } from "./CanvasRuler";
import { CanvasToolbar } from "./CanvasToolbar";
import { SnapGrid } from "./Guides";
import { ResizeModeIndicator } from "./ResizeModeIndicator";
import type { Point, Size } from "@/types/canvas";

// ============================================================================
// Types
// ============================================================================

export interface CanvasProps {
  /** Children to render inside the canvas (component tree) */
  children?: React.ReactNode;
  /** Content dimensions for zoom-to-fit calculation */
  contentSize?: Size;
  /** Grid pattern type */
  gridPattern?: GridPattern;
  /** Whether to enable keyboard shortcuts */
  enableKeyboardShortcuts?: boolean;
  /** Whether pan requires holding space key */
  panWithSpaceKey?: boolean;
  /** Show toolbar */
  showToolbar?: boolean;
  /** Toolbar position */
  toolbarPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Callback when canvas is clicked (deselect) */
  onCanvasClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default content size for zoom-to-fit */
const DEFAULT_CONTENT_SIZE: Size = { width: 595, height: 842 }; // A4 in pixels at 72 DPI

/** Ruler thickness in pixels */
const RULER_THICKNESS = 20;

// ============================================================================
// Component
// ============================================================================

/**
 * Main Canvas component with zoom, pan, and grid functionality
 */
function CanvasComponent({
  children,
  contentSize = DEFAULT_CONTENT_SIZE,
  gridPattern = "dots",
  enableKeyboardShortcuts = true,
  panWithSpaceKey = false,
  showToolbar = true,
  toolbarPosition = "bottom-left",
  onCanvasClick,
  className,
}: CanvasProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Local state for viewport size
  const [viewportSize, setViewportSize] = useState<Size>({
    width: 0,
    height: 0,
  });

  // Store state
  const showGrid = useCanvasViewStore((state) => state.config.showGrid);
  const showRulers = useCanvasViewStore((state) => state.config.showRulers);
  const gridSize = useCanvasViewStore((state) => state.config.gridSize);
  const snapToGrid = useCanvasViewStore((state) => state.config.snapToGrid);
  const toggleGrid = useCanvasViewStore((state) => state.toggleGrid);
  const toggleRulers = useCanvasViewStore((state) => state.toggleRulers);
  const toggleSnapToGrid = useCanvasViewStore(
    (state) => state.toggleSnapToGrid
  );
  const resetView = useCanvasViewStore((state) => state.resetView);

  // Interaction store state for resize mode indicator
  const activeInteraction = useInteractionStore(
    (state) => state.activeInteraction
  );
  const resizeState = useInteractionStore((state) => state.resize);
  const multiResizeState = useInteractionStore((state) => state.multiResize);

  // Determine if resizing and current modes
  const isResizing =
    activeInteraction === "resize" || activeInteraction === "multi-resize";
  const resizeModes = {
    aspectRatioLocked:
      resizeState?.lockAspectRatio ??
      multiResizeState?.lockAspectRatio ??
      false,
    snapToGrid:
      resizeState?.snapToIncrement ??
      multiResizeState?.snapToIncrement ??
      false,
    previewMode:
      resizeState?.ignoreConstraints ??
      multiResizeState?.ignoreConstraints ??
      false,
  };

  // Zoom hook
  const {
    zoom,
    zoomIn,
    zoomOut,
    setZoom,
    zoomToFit,
    canZoomIn,
    canZoomOut,
    handleWheelZoom,
  } = useCanvasZoom({ enableKeyboard: enableKeyboardShortcuts });

  // Pan hook
  const { pan, isPanning, panHandlers, isSpaceHeld } = useCanvasPan({
    enableMousePan: true,
    enableTouchPan: true,
    enableWheelPan: true,
    requireSpaceKey: panWithSpaceKey,
  });

  // ========================================
  // Viewport Size Tracking
  // ========================================

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setViewportSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    // Initial size
    updateSize();

    // ResizeObserver for responsive updates
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // ========================================
  // Event Handlers
  // ========================================

  /**
   * Handle wheel events for zoom (when Ctrl/Cmd held) or pan
   */
  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();

      if (rect && (event.ctrlKey || event.metaKey)) {
        // Zoom with mouse position
        const mousePosition: Point = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
        handleWheelZoom(event, mousePosition);
      } else {
        // Pan via wheel
        panHandlers.onWheel(event);
      }
    },
    [handleWheelZoom, panHandlers]
  );

  /**
   * Handle zoom to fit
   */
  const handleZoomToFit = useCallback(() => {
    zoomToFit(contentSize, viewportSize);
  }, [zoomToFit, contentSize, viewportSize]);

  /**
   * Handle canvas click (background click to deselect)
   */
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent) => {
      // Only trigger if clicking directly on the canvas background
      if (event.target === canvasRef.current) {
        onCanvasClick?.();
      }
    },
    [onCanvasClick]
  );

  /**
   * Handle reset view (zoom + pan)
   */
  const handleResetView = useCallback(() => {
    resetView();
  }, [resetView]);

  // ========================================
  // Cursor Style
  // ========================================

  const getCursorStyle = (): string => {
    if (isPanning) return "grabbing";
    if (panWithSpaceKey && isSpaceHeld) return "grab";
    return "default";
  };

  // ========================================
  // Calculate canvas transform
  // ========================================

  const canvasStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: "0 0",
    width: contentSize.width,
    height: contentSize.height,
  };

  return (
    <div
      ref={containerRef}
      className={cn("bg-muted/30 relative flex-1 overflow-hidden", className)}
      style={{ cursor: getCursorStyle() }}
    >
      {/* Rulers */}
      {showRulers && (
        <CanvasRulers
          width={viewportSize.width}
          height={viewportSize.height}
          zoom={zoom}
          pan={pan}
          visible={showRulers}
          thickness={RULER_THICKNESS}
        />
      )}

      {/* Canvas viewport */}
      <div
        className={cn(
          "absolute overflow-hidden",
          showRulers ? "top-5 left-5" : "inset-0"
        )}
        style={{
          width: showRulers
            ? viewportSize.width - RULER_THICKNESS
            : viewportSize.width,
          height: showRulers
            ? viewportSize.height - RULER_THICKNESS
            : viewportSize.height,
        }}
        onMouseDown={panHandlers.onMouseDown}
        onMouseMove={panHandlers.onMouseMove}
        onMouseUp={panHandlers.onMouseUp}
        onMouseLeave={panHandlers.onMouseLeave}
        onTouchStart={panHandlers.onTouchStart}
        onTouchMove={panHandlers.onTouchMove}
        onTouchEnd={panHandlers.onTouchEnd}
        onWheel={handleWheel}
      >
        {/* Grid background (fixed position, covers viewport) */}
        <CanvasGrid
          gridSize={gridSize}
          zoom={zoom}
          pattern={gridPattern}
          visible={showGrid}
        />

        {/* Snap grid overlay (visible during resize/transform operations) */}
        <SnapGrid
          gridSize={gridSize}
          zoom={zoom}
          snapEnabled={snapToGrid}
          viewportSize={viewportSize}
          canvasOffset={pan}
        />

        {/* Transformed canvas content */}
        <div
          ref={canvasRef}
          className="bg-background border-border absolute border shadow-lg"
          style={canvasStyle}
          onClick={handleCanvasClick}
        >
          {/* Page/content area */}
          <div className="relative h-full w-full">{children}</div>
        </div>
      </div>

      {/* Toolbar */}
      {showToolbar && (
        <CanvasToolbar
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onSetZoom={setZoom}
          onResetZoom={handleResetView}
          onZoomToFit={handleZoomToFit}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          showGrid={showGrid}
          onToggleGrid={toggleGrid}
          showRulers={showRulers}
          onToggleRulers={toggleRulers}
          snapToGrid={snapToGrid}
          onToggleSnapToGrid={toggleSnapToGrid}
          position={toolbarPosition}
        />
      )}

      {/* Resize mode indicator - shows during resize operations */}
      <ResizeModeIndicator
        isResizing={isResizing}
        modes={resizeModes}
        position="top-center"
      />

      {/* Pan indicator (when space is held) */}
      {panWithSpaceKey && isSpaceHeld && !isPanning && (
        <div className="bg-primary text-primary-foreground absolute top-3 left-1/2 z-40 -translate-x-1/2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg">
          Click and drag to pan
        </div>
      )}
    </div>
  );
}

export const Canvas = memo(CanvasComponent);
Canvas.displayName = "Canvas";

export default Canvas;

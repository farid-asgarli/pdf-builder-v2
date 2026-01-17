/**
 * Image Renderer
 * Visual renderer for Image components in the canvas
 *
 * Features:
 * - Display actual image from URL/base64 source
 * - Placeholder when no source is provided
 * - Expression syntax support for dynamic sources ({{ data.imageUrl }})
 * - Fit mode visualization
 * - Loading and error states
 * - Selection state handling
 * - Dimension indicators
 */
"use client";

import React, { memo, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { RendererProps } from "./types";
import { RENDERER_CONTAINER_STYLES, COMPONENT_CATEGORY_COLORS } from "./types";
import { ComponentLabel } from "./ComponentRenderer";
import { registerRenderer } from "./registry";
import type { ImageProperties } from "@/types/properties";
import { ComponentType } from "@/types/component";
import {
  Image as ImageIcon,
  ImageOff,
  Loader2,
  Variable,
  Maximize,
  Minimize,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Image renderer
 */
export interface ImageRendererProps extends RendererProps {
  /** Preview data context for expression evaluation */
  previewData?: Record<string, unknown>;
  /** Whether to show expression syntax or resolved values */
  showExpressions?: boolean;
  /** Maximum display dimensions (for performance) */
  maxDisplayWidth?: number;
  maxDisplayHeight?: number;
}

/**
 * Image loading state
 */
type ImageLoadState = "idle" | "loading" | "loaded" | "error";

// ============================================================================
// Constants
// ============================================================================

/** Regex to match expression syntax {{ expression }} */
const EXPRESSION_REGEX = /\{\{([^}]+)\}\}/g;

/** Default placeholder dimensions */
const DEFAULT_PLACEHOLDER_WIDTH = 200;
const DEFAULT_PLACEHOLDER_HEIGHT = 150;

/** Maximum display dimensions to prevent oversized images */
const MAX_DISPLAY_WIDTH = 400;
const MAX_DISPLAY_HEIGHT = 300;

/** Minimum dimensions for the image container */
const MIN_IMAGE_WIDTH = 60;
const MIN_IMAGE_HEIGHT = 40;

/** Image fit mode labels */
const FIT_MODE_LABELS: Record<string, string> = {
  fill: "Fill",
  contain: "Contain",
  cover: "Cover",
  width: "Fit Width",
  height: "Fit Height",
  area: "Fit Area",
  unproportional: "Stretch",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a string contains expression syntax
 */
function isExpression(source: string): boolean {
  EXPRESSION_REGEX.lastIndex = 0;
  return EXPRESSION_REGEX.test(source);
}

/**
 * Extract expression content from {{ expression }}
 */
function extractExpression(source: string): string | null {
  EXPRESSION_REGEX.lastIndex = 0;
  const match = EXPRESSION_REGEX.exec(source);
  return match ? match[1].trim() : null;
}

/**
 * Resolve an expression path against data context
 */
function resolveExpression(
  expression: string,
  data: Record<string, unknown>
): string | undefined {
  try {
    const parts = expression.split(".");
    let value: unknown = data;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value != null ? String(value) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Check if a URL is valid for display
 */
function isValidImageSource(source: string): boolean {
  if (!source) return false;
  // Support http(s) URLs, data URLs, and relative paths
  return (
    source.startsWith("http://") ||
    source.startsWith("https://") ||
    source.startsWith("data:image/") ||
    source.startsWith("/") ||
    source.startsWith("./")
  );
}

/**
 * Calculate constrained dimensions while maintaining aspect ratio
 */
function calculateDisplayDimensions(
  width: number | undefined,
  height: number | undefined,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const w = width ?? DEFAULT_PLACEHOLDER_WIDTH;
  const h = height ?? DEFAULT_PLACEHOLDER_HEIGHT;

  // Calculate scale factors
  const scaleX = maxWidth / w;
  const scaleY = maxHeight / h;
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up

  return {
    width: Math.max(MIN_IMAGE_WIDTH, Math.round(w * scale)),
    height: Math.max(MIN_IMAGE_HEIGHT, Math.round(h * scale)),
  };
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Placeholder component for when no image source is set
 */
const ImagePlaceholder = memo(function ImagePlaceholder({
  width,
  height,
  message = "No image source",
}: {
  width: number;
  height: number;
  message?: string;
}) {
  return (
    <div
      className="bg-muted/50 flex flex-col items-center justify-center gap-2 rounded border border-dashed border-green-500/30"
      style={{ width, height }}
    >
      <ImageIcon className="h-8 w-8 text-green-500/40" />
      <span className="text-muted-foreground text-center text-[10px]">
        {message}
      </span>
    </div>
  );
});

ImagePlaceholder.displayName = "ImagePlaceholder";

/**
 * Expression indicator for dynamic image sources
 */
const ExpressionIndicator = memo(function ExpressionIndicator({
  expression,
  resolved,
}: {
  expression: string;
  resolved?: string;
}) {
  return (
    <div className="bg-muted/80 absolute right-1 bottom-1 left-1 flex items-center gap-1 rounded px-1.5 py-0.5">
      <Variable className="h-3 w-3 text-amber-500" />
      <span className="truncate font-mono text-[9px] text-amber-600">
        {`{{ ${expression} }}`}
      </span>
      {resolved && (
        <span className="text-muted-foreground ml-auto text-[9px]">
          → {truncateUrl(resolved)}
        </span>
      )}
    </div>
  );
});

ExpressionIndicator.displayName = "ExpressionIndicator";

/**
 * Truncate URL for display
 */
function truncateUrl(url: string, maxLength = 30): string {
  if (url.length <= maxLength) return url;
  // Show beginning and end of URL
  const start = url.slice(0, 15);
  const end = url.slice(-12);
  return `${start}...${end}`;
}

/**
 * Loading indicator for image
 */
const LoadingIndicator = memo(function LoadingIndicator({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <div
      className="bg-muted/30 flex items-center justify-center rounded border border-green-500/20"
      style={{ width, height }}
    >
      <Loader2 className="h-6 w-6 animate-spin text-green-500/60" />
    </div>
  );
});

LoadingIndicator.displayName = "LoadingIndicator";

/**
 * Error indicator for failed image load
 */
const ErrorIndicator = memo(function ErrorIndicator({
  width,
  height,
  message = "Failed to load image",
}: {
  width: number;
  height: number;
  message?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded border border-dashed border-red-500/30 bg-red-500/5"
      style={{ width, height }}
    >
      <ImageOff className="h-6 w-6 text-red-500/60" />
      <span className="text-center text-[10px] text-red-500/80">{message}</span>
    </div>
  );
});

ErrorIndicator.displayName = "ErrorIndicator";

/**
 * Image loader component that handles loading state internally
 * Using key prop to reset state when source changes
 */
const ImageLoader = memo(function ImageLoader({
  src,
  width,
  height,
  fitStyle,
}: {
  src: string;
  width: number;
  height: number;
  fitStyle: string;
}) {
  const [loadState, setLoadState] = useState<ImageLoadState>("loading");

  const handleLoad = useCallback(() => {
    setLoadState("loaded");
  }, []);

  const handleError = useCallback(() => {
    setLoadState("error");
  }, []);

  if (loadState === "loading") {
    return (
      <>
        <LoadingIndicator width={width} height={height} />
        {/* Hidden image to trigger load - using native img for external/dynamic URLs */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="hidden"
          onLoad={handleLoad}
          onError={handleError}
        />
      </>
    );
  }

  if (loadState === "error") {
    return (
      <ErrorIndicator width={width} height={height} message="Failed to load" />
    );
  }

  // Loaded image - using native img for external/dynamic URLs from expressions
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={cn("rounded", fitStyle)}
      style={{
        width,
        height,
        maxWidth: "100%",
      }}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
});

ImageLoader.displayName = "ImageLoader";

// ============================================================================
// Component
// ============================================================================

/**
 * Image Renderer Component
 * Renders an image component with placeholder, loading, and error states
 */
function ImageRendererComponent({
  node,
  depth,
  isSelected,
  isPrimarySelection,
  isHovered,
  isDropTarget,
  onClick,
  onDoubleClick,
  onContextMenu,
  className,
  previewData,
  showExpressions = true,
  maxDisplayWidth = MAX_DISPLAY_WIDTH,
  maxDisplayHeight = MAX_DISPLAY_HEIGHT,
}: ImageRendererProps) {
  // ========================================
  // Computed Values (compute before state to use in key)
  // ========================================

  const properties = node.properties as unknown as ImageProperties;
  const source = properties.source ?? "";
  const fit = properties.fit ?? "contain";

  // Check if source is an expression
  const sourceIsExpression = isExpression(source);
  const expressionContent = sourceIsExpression
    ? extractExpression(source)
    : null;

  // Resolve expression if preview data is available
  const resolvedSource = useMemo(() => {
    if (!sourceIsExpression || !previewData || !expressionContent) {
      return source;
    }
    return resolveExpression(expressionContent, previewData) ?? "";
  }, [sourceIsExpression, previewData, expressionContent, source]);

  // Determine if we have a valid source to display
  const hasValidSource = isValidImageSource(
    sourceIsExpression ? resolvedSource : source
  );
  const displaySource = sourceIsExpression ? resolvedSource : source;

  // Calculate display dimensions
  const dimensions = useMemo(() => {
    return calculateDisplayDimensions(
      properties.width,
      properties.height,
      maxDisplayWidth,
      maxDisplayHeight
    );
  }, [properties.width, properties.height, maxDisplayWidth, maxDisplayHeight]);

  // Fit mode styles for object-fit
  const fitStyle = useMemo(() => {
    switch (fit) {
      case "fill":
        return "object-fill";
      case "contain":
        return "object-contain";
      case "cover":
        return "object-cover";
      case "unproportional":
        return "object-fill";
      default:
        return "object-contain";
    }
  }, [fit]);

  // ========================================
  // Event Handlers
  // ========================================

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(e, node.id);
    },
    [onClick, node.id]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick?.(e, node.id);
    },
    [onDoubleClick, node.id]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(e, node.id);
    },
    [onContextMenu, node.id]
  );

  // ========================================
  // Render
  // ========================================

  return (
    <div
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        "inline-block rounded border p-1",
        COMPONENT_CATEGORY_COLORS.content,
        isSelected && RENDERER_CONTAINER_STYLES.selected,
        isPrimarySelection && RENDERER_CONTAINER_STYLES.primarySelected,
        isHovered && !isSelected && RENDERER_CONTAINER_STYLES.hovered,
        isDropTarget && RENDERER_CONTAINER_STYLES.dropTarget,
        className
      )}
      style={{
        marginLeft: depth > 0 ? 4 : 0,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      data-component-id={node.id}
      data-component-type={node.type}
      data-depth={depth}
      role="img"
      aria-label={`Image component${hasValidSource ? "" : " (no source)"}`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="Image" />

      {/* Image header with icon and info */}
      <div className="mb-1 flex items-center gap-1.5">
        <ImageIcon className="h-3 w-3 text-green-500/70" />
        <span className="text-[10px] font-medium tracking-wide text-green-600/80 uppercase">
          Image
        </span>

        {/* Dimensions display */}
        {(properties.width || properties.height) && (
          <span className="text-muted-foreground ml-auto flex items-center gap-0.5 text-[9px]">
            {properties.width && `${properties.width}pt`}
            {properties.width && properties.height && " × "}
            {properties.height && `${properties.height}pt`}
          </span>
        )}

        {/* Fit mode indicator */}
        {fit !== "contain" && (
          <span className="bg-muted text-muted-foreground flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px]">
            {fit === "cover" ? (
              <Maximize className="h-2.5 w-2.5" />
            ) : (
              <Minimize className="h-2.5 w-2.5" />
            )}
            {FIT_MODE_LABELS[fit] || fit}
          </span>
        )}
      </div>

      {/* Image display area */}
      <div className="relative overflow-hidden rounded">
        {!hasValidSource ? (
          // No valid source - show placeholder
          <ImagePlaceholder
            width={dimensions.width}
            height={dimensions.height}
            message={
              sourceIsExpression
                ? `Expression: {{ ${expressionContent} }}`
                : "Set image source"
            }
          />
        ) : (
          // Use key to reset ImageLoader state when source changes
          <ImageLoader
            key={displaySource}
            src={displaySource}
            width={dimensions.width}
            height={dimensions.height}
            fitStyle={fitStyle}
          />
        )}

        {/* Expression indicator overlay */}
        {showExpressions && sourceIsExpression && expressionContent && (
          <ExpressionIndicator
            expression={expressionContent}
            resolved={hasValidSource ? resolvedSource : undefined}
          />
        )}
      </div>

      {/* Source URL hint (truncated) */}
      {hasValidSource && !sourceIsExpression && isSelected && (
        <div className="text-muted-foreground mt-1 truncate text-[9px]">
          {truncateUrl(displaySource, 40)}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports & Registration
// ============================================================================

export const ImageRenderer = memo(ImageRendererComponent);
ImageRenderer.displayName = "ImageRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.Image, ImageRenderer);

export default ImageRenderer;

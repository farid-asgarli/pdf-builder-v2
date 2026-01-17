/**
 * QR Code Renderer
 * Visual renderer for QR Code components in the canvas
 *
 * Features:
 * - Visual QR code pattern preview (stylized representation)
 * - Expression syntax support for dynamic values ({{ data.field }})
 * - Configurable size visualization
 * - Selection state handling
 * - Value preview display
 */
"use client";

import React, { memo, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { RendererProps } from "./types";
import { RENDERER_CONTAINER_STYLES, COMPONENT_CATEGORY_COLORS } from "./types";
import { ComponentLabel } from "./ComponentRenderer";
import { registerRenderer } from "./registry";
import type { QRCodeProperties } from "@/types/properties";
import { ComponentType } from "@/types/component";
import { QrCode, Variable } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to QRCode renderer
 */
export interface QRCodeRendererProps extends RendererProps {
  /** Preview data context for expression evaluation */
  previewData?: Record<string, unknown>;
  /** Whether to show expression syntax or resolved values */
  showExpressions?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default QR code size in pixels (for canvas display) */
const DEFAULT_QR_SIZE = 100;

/** Minimum QR code size for display */
const MIN_QR_SIZE = 40;

/** Maximum QR code size for display (to prevent oversized elements) */
const MAX_QR_SIZE = 200;

/** Regex to match expression syntax {{ expression }} */
const EXPRESSION_REGEX = /\{\{([^}]+)\}\}/g;

/** Maximum length for value preview */
const MAX_VALUE_PREVIEW_LENGTH = 30;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the effective QR code properties with defaults
 */
function getEffectiveProperties(
  nodeProperties: Record<string, unknown> | undefined
): QRCodeProperties {
  const props = (nodeProperties || {}) as Partial<QRCodeProperties>;

  return {
    value: props.value ?? "",
    size: props.size,
  };
}

/**
 * Check if a string contains expression syntax
 */
function isExpression(value: string): boolean {
  EXPRESSION_REGEX.lastIndex = 0;
  return EXPRESSION_REGEX.test(value);
}

/**
 * Extract expression content from {{ expression }}
 */
function extractExpression(value: string): string | null {
  EXPRESSION_REGEX.lastIndex = 0;
  const match = EXPRESSION_REGEX.exec(value);
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
    let result: unknown = data;

    for (const part of parts) {
      if (result && typeof result === "object" && part in result) {
        result = (result as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return result != null ? String(result) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Truncate text if it exceeds max length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "…";
}

/**
 * Calculate display size for QR code (constrained to min/max)
 */
function calculateDisplaySize(size: number | undefined): number {
  const baseSize = size ?? DEFAULT_QR_SIZE;
  return Math.min(Math.max(baseSize, MIN_QR_SIZE), MAX_QR_SIZE);
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Stylized QR code pattern for visual preview
 * Creates a pseudo-random pattern that resembles a QR code
 */
const QRCodePattern = memo(function QRCodePattern({
  size,
  hasValue,
}: {
  size: number;
  hasValue: boolean;
}) {
  // Generate a fixed pattern for consistent display
  const gridSize = 7; // 7x7 modules like a QR code finder pattern

  // Create a simple pattern that looks like a QR code
  // Fixed pattern based on typical QR code structure
  const pattern = useMemo(() => {
    // QR code-like pattern with finder patterns in corners
    const grid: boolean[][] = [];

    for (let row = 0; row < gridSize; row++) {
      grid[row] = [];
      for (let col = 0; col < gridSize; col++) {
        // Finder pattern in top-left corner
        const isTopLeftFinder =
          row < 3 &&
          col < 3 &&
          (row === 0 ||
            row === 2 ||
            col === 0 ||
            col === 2 ||
            (row === 1 && col === 1));
        // Finder pattern in top-right corner
        const isTopRightFinder =
          row < 3 &&
          col >= 4 &&
          (row === 0 ||
            row === 2 ||
            col === 4 ||
            col === 6 ||
            (row === 1 && col === 5));
        // Finder pattern in bottom-left corner
        const isBottomLeftFinder =
          row >= 4 &&
          col < 3 &&
          (row === 4 ||
            row === 6 ||
            col === 0 ||
            col === 2 ||
            (row === 5 && col === 1));
        // Data area - pseudo-random pattern
        const isData =
          !isTopLeftFinder &&
          !isTopRightFinder &&
          !isBottomLeftFinder &&
          ((row + col) % 2 === 0 || (row * col) % 3 === 0);

        grid[row][col] =
          isTopLeftFinder || isTopRightFinder || isBottomLeftFinder || isData;
      }
    }

    return grid;
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-sm",
        hasValue ? "bg-white" : "bg-gray-100"
      )}
      style={{ width: size, height: size }}
    >
      {/* QR code modules */}
      <div className="absolute inset-1">
        <svg
          viewBox={`0 0 ${gridSize} ${gridSize}`}
          className="h-full w-full"
          style={{ shapeRendering: "crispEdges" }}
        >
          {pattern.map((row, rowIndex) =>
            row.map((filled, colIndex) =>
              filled ? (
                <rect
                  key={`${rowIndex}-${colIndex}`}
                  x={colIndex}
                  y={rowIndex}
                  width={1}
                  height={1}
                  className={hasValue ? "fill-gray-900" : "fill-gray-400"}
                />
              ) : null
            )
          )}
        </svg>
      </div>

      {/* Overlay icon when no value */}
      {!hasValue && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
          <QrCode className="h-8 w-8 text-gray-400" />
        </div>
      )}
    </div>
  );
});

QRCodePattern.displayName = "QRCodePattern";

/**
 * Value preview with expression handling
 */
const ValuePreview = memo(function ValuePreview({
  value,
  resolvedValue,
  showExpression,
}: {
  value: string;
  resolvedValue?: string;
  showExpression: boolean;
}) {
  const hasExpression = isExpression(value);
  const expression = hasExpression ? extractExpression(value) : null;
  const displayValue = resolvedValue ?? value;

  if (!value) {
    return (
      <span className="text-muted-foreground text-[10px] italic">
        No value set
      </span>
    );
  }

  if (hasExpression && showExpression) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 px-1 font-mono text-[10px] text-amber-700 dark:text-amber-400"
        title={
          resolvedValue
            ? `Resolves to: ${resolvedValue}`
            : "Expression (no data context)"
        }
      >
        <Variable className="h-2.5 w-2.5 shrink-0 opacity-70" />
        <span className="opacity-50">{"{{ "}</span>
        {expression}
        <span className="opacity-50">{" }}"}</span>
      </span>
    );
  }

  return (
    <span
      className="text-muted-foreground text-[10px]"
      title={
        displayValue.length > MAX_VALUE_PREVIEW_LENGTH
          ? displayValue
          : undefined
      }
    >
      {truncateText(displayValue, MAX_VALUE_PREVIEW_LENGTH)}
    </span>
  );
});

ValuePreview.displayName = "ValuePreview";

/**
 * Size indicator badge
 */
const SizeBadge = memo(function SizeBadge({
  size,
}: {
  size: number | undefined;
}) {
  if (size === undefined) return null;

  return <div className="text-muted-foreground text-[9px]">{size}px</div>;
});

SizeBadge.displayName = "SizeBadge";

// ============================================================================
// Main Component
// ============================================================================

/**
 * QR Code Renderer Component
 * Renders a visual representation of a QR Code component in the canvas
 */
export const QRCodeRenderer = memo(function QRCodeRenderer({
  node,
  depth,
  isSelected = false,
  isPrimarySelection = false,
  isHovered = false,
  isDropTarget = false,
  onClick,
  onDoubleClick,
  onContextMenu,
  className,
  previewData,
  showExpressions = true,
}: QRCodeRendererProps) {
  // Extract properties with defaults
  const properties = useMemo(
    () => getEffectiveProperties(node.properties),
    [node.properties]
  );

  const { value, size } = properties;
  const displaySize = calculateDisplaySize(size);
  const hasValue = Boolean(value && value.trim());

  // Resolve expression if data context is available
  const resolvedValue = useMemo(() => {
    if (!value || !previewData) return undefined;
    const expression = extractExpression(value);
    if (expression) {
      return resolveExpression(expression, previewData);
    }
    return value;
  }, [value, previewData]);

  // Event handlers
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onClick?.(event, node.id);
    },
    [onClick, node.id]
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onDoubleClick?.(event, node.id);
    },
    [onDoubleClick, node.id]
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onContextMenu?.(event, node.id);
    },
    [onContextMenu, node.id]
  );

  // Container classes
  const containerClasses = cn(
    RENDERER_CONTAINER_STYLES.container,
    COMPONENT_CATEGORY_COLORS.content,
    "border p-3",
    isSelected && !isPrimarySelection && RENDERER_CONTAINER_STYLES.selected,
    isPrimarySelection && RENDERER_CONTAINER_STYLES.primarySelected,
    isHovered && !isSelected && RENDERER_CONTAINER_STYLES.hovered,
    isDropTarget && RENDERER_CONTAINER_STYLES.dropTarget,
    "cursor-pointer select-none",
    className
  );

  return (
    <div
      className={containerClasses}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`QR Code component: ${value || "empty"}`}
      data-component-type="QRCode"
      data-component-id={node.id}
      data-depth={depth}
    >
      {/* Component label (shown on hover) */}
      <ComponentLabel type="QRCode" />

      {/* QR code display */}
      <div className="flex flex-col items-center gap-2">
        {/* Visual QR code pattern */}
        <QRCodePattern size={displaySize} hasValue={hasValue} />

        {/* Value preview */}
        <div className="flex flex-col items-center gap-0.5">
          <ValuePreview
            value={value}
            resolvedValue={resolvedValue}
            showExpression={showExpressions}
          />
          <SizeBadge size={size} />
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="bg-primary absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full">
          <QrCode className="text-primary-foreground h-2.5 w-2.5" />
        </div>
      )}
    </div>
  );
});

QRCodeRenderer.displayName = "QRCodeRenderer";

// ============================================================================
// Registry
// ============================================================================

// Self-register the renderer
registerRenderer(ComponentType.QRCode, QRCodeRenderer);

export default QRCodeRenderer;

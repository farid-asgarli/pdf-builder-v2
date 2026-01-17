/**
 * Barcode Renderer
 * Visual renderer for Barcode components in the canvas
 *
 * Features:
 * - Visual barcode pattern preview (stylized representation)
 * - Support for multiple barcode formats (Code128, EAN, UPC, etc.)
 * - Expression syntax support for dynamic values ({{ data.field }})
 * - Format-specific visual patterns
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
import type { BarcodeProperties } from "@/types/properties";
import type { BarcodeFormat } from "@/types/component";
import { ComponentType } from "@/types/component";
import { Barcode, Variable } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Barcode renderer
 */
export interface BarcodeRendererProps extends RendererProps {
  /** Preview data context for expression evaluation */
  previewData?: Record<string, unknown>;
  /** Whether to show expression syntax or resolved values */
  showExpressions?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default barcode dimensions */
const DEFAULT_BARCODE_WIDTH = 160;
const DEFAULT_BARCODE_HEIGHT = 60;

/** Minimum barcode dimensions */
const _MIN_BARCODE_WIDTH = 80;
const _MIN_BARCODE_HEIGHT = 30;

/** Default barcode format */
const DEFAULT_FORMAT: BarcodeFormat = "code128";

/** Regex to match expression syntax {{ expression }} */
const EXPRESSION_REGEX = /\{\{([^}]+)\}\}/g;

/** Maximum length for value preview */
const MAX_VALUE_PREVIEW_LENGTH = 25;

/** Format display labels */
const FORMAT_LABELS: Record<BarcodeFormat, string> = {
  code128: "Code 128",
  ean8: "EAN-8",
  ean13: "EAN-13",
  upca: "UPC-A",
  code39: "Code 39",
  dataMatrix: "Data Matrix",
  pdf417: "PDF417",
};

/** Format-specific bar patterns (simplified visual representations) */
const FORMAT_PATTERNS: Record<BarcodeFormat, number[]> = {
  // Pattern arrays represent bar widths (1-4 units)
  code128: [
    2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1, 2, 3, 1,
    1,
  ],
  ean8: [
    1, 1, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1,
  ],
  ean13: [
    1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1,
    1, 2, 1, 1, 1,
  ],
  upca: [
    1, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1,
    1,
  ],
  code39: [3, 1, 1, 1, 3, 1, 1, 1, 1, 3, 1, 1, 3, 1, 1, 1, 3, 1, 1, 1, 1, 3],
  dataMatrix: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 2D pattern simplified
  pdf417: [
    2, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1,
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the effective barcode properties with defaults
 */
function getEffectiveProperties(
  nodeProperties: Record<string, unknown> | undefined
): BarcodeProperties {
  const props = (nodeProperties || {}) as Partial<BarcodeProperties>;

  return {
    value: props.value ?? "",
    format: props.format ?? DEFAULT_FORMAT,
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
 * Check if the format is a 2D barcode (special rendering)
 */
function is2DFormat(format: BarcodeFormat): boolean {
  return format === "dataMatrix" || format === "pdf417";
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Standard 1D barcode pattern visualization
 */
const BarcodePattern1D = memo(function BarcodePattern1D({
  format,
  width,
  height,
  hasValue,
}: {
  format: BarcodeFormat;
  width: number;
  height: number;
  hasValue: boolean;
}) {
  const pattern = FORMAT_PATTERNS[format] || FORMAT_PATTERNS.code128;
  const totalUnits = pattern.reduce((sum, w) => sum + w, 0);
  const unitWidth = width / totalUnits;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      style={{ shapeRendering: "crispEdges" }}
      preserveAspectRatio="none"
    >
      {/* Quiet zone (white background) */}
      <rect x={0} y={0} width={width} height={height} fill="white" />

      {/* Barcode bars */}
      {
        pattern.reduce<{ elements: React.ReactNode[]; x: number }>(
          (acc, barWidth, index) => {
            const isBar = index % 2 === 0;
            const currentX = acc.x;
            const nextX = acc.x + barWidth * unitWidth;

            if (isBar) {
              acc.elements.push(
                <rect
                  key={index}
                  x={currentX}
                  y={0}
                  width={barWidth * unitWidth}
                  height={height}
                  className={hasValue ? "fill-gray-900" : "fill-gray-400"}
                />
              );
            }

            return { elements: acc.elements, x: nextX };
          },
          { elements: [], x: 0 }
        ).elements
      }
    </svg>
  );
});

BarcodePattern1D.displayName = "BarcodePattern1D";

/**
 * 2D barcode pattern visualization (Data Matrix, PDF417)
 */
const BarcodePattern2D = memo(function BarcodePattern2D({
  format,
  width,
  height,
  hasValue,
}: {
  format: BarcodeFormat;
  width: number;
  height: number;
  hasValue: boolean;
}) {
  // Generate a grid pattern for 2D barcodes
  const gridSize = format === "dataMatrix" ? 10 : 8;
  const moduleWidth = width / gridSize;
  const moduleHeight = height / (format === "dataMatrix" ? gridSize : 4);

  // Create pseudo-random but consistent pattern
  const pattern = useMemo(() => {
    const grid: boolean[][] = [];
    const rows = format === "dataMatrix" ? gridSize : 4;

    for (let row = 0; row < rows; row++) {
      grid[row] = [];
      for (let col = 0; col < gridSize; col++) {
        // Data Matrix has L-shaped finder pattern
        if (format === "dataMatrix") {
          const isLeftEdge = col === 0;
          const isBottomEdge = row === rows - 1;
          const isTopEdge = row === 0 && col % 2 === 0;
          const isRightEdge = col === gridSize - 1 && row % 2 === 1;
          const isData = (row + col) % 2 === 0 || (row * col) % 3 === 1;
          grid[row][col] =
            isLeftEdge || isBottomEdge || isTopEdge || isRightEdge || isData;
        } else {
          // PDF417 stacked pattern
          const isStartCode = col < 2;
          const isStopCode = col >= gridSize - 2;
          const isData = (row + col) % 2 === 0 || (row * 2 + col) % 3 === 0;
          grid[row][col] = isStartCode || isStopCode || isData;
        }
      }
    }
    return grid;
  }, [format, gridSize]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      style={{ shapeRendering: "crispEdges" }}
    >
      {/* Background */}
      <rect x={0} y={0} width={width} height={height} fill="white" />

      {/* 2D pattern */}
      {pattern.map((row, rowIndex) =>
        row.map((filled, colIndex) =>
          filled ? (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex * moduleWidth}
              y={rowIndex * moduleHeight}
              width={moduleWidth}
              height={moduleHeight}
              className={hasValue ? "fill-gray-900" : "fill-gray-400"}
            />
          ) : null
        )
      )}
    </svg>
  );
});

BarcodePattern2D.displayName = "BarcodePattern2D";

/**
 * Complete barcode visual with border
 */
const BarcodeVisual = memo(function BarcodeVisual({
  format,
  hasValue,
}: {
  format: BarcodeFormat;
  hasValue: boolean;
}) {
  const is2D = is2DFormat(format);
  const width = is2D ? 80 : DEFAULT_BARCODE_WIDTH;
  const height = is2D ? 80 : DEFAULT_BARCODE_HEIGHT;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded border",
        hasValue ? "border-gray-300 bg-white" : "border-gray-200 bg-gray-50"
      )}
      style={{ width, height }}
    >
      {is2D ? (
        <BarcodePattern2D
          format={format}
          width={width}
          height={height}
          hasValue={hasValue}
        />
      ) : (
        <BarcodePattern1D
          format={format}
          width={width}
          height={height}
          hasValue={hasValue}
        />
      )}

      {/* Overlay icon when no value */}
      {!hasValue && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <Barcode className="h-6 w-6 text-gray-400" />
        </div>
      )}
    </div>
  );
});

BarcodeVisual.displayName = "BarcodeVisual";

/**
 * Format badge
 */
const FormatBadge = memo(function FormatBadge({
  format,
}: {
  format: BarcodeFormat;
}) {
  return (
    <div className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[9px] font-medium">
      {FORMAT_LABELS[format] || format}
    </div>
  );
});

FormatBadge.displayName = "FormatBadge";

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
      className="text-muted-foreground font-mono text-[10px]"
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

// ============================================================================
// Main Component
// ============================================================================

/**
 * Barcode Renderer Component
 * Renders a visual representation of a Barcode component in the canvas
 */
export const BarcodeRenderer = memo(function BarcodeRenderer({
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
}: BarcodeRendererProps) {
  // Extract properties with defaults
  const properties = useMemo(
    () => getEffectiveProperties(node.properties),
    [node.properties]
  );

  const { value, format } = properties;
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
      aria-label={`Barcode component (${FORMAT_LABELS[format]}): ${value || "empty"}`}
      data-component-type="Barcode"
      data-component-id={node.id}
      data-depth={depth}
    >
      {/* Component label (shown on hover) */}
      <ComponentLabel type="Barcode" />

      {/* Barcode display */}
      <div className="flex flex-col items-center gap-2">
        {/* Visual barcode pattern */}
        <BarcodeVisual format={format} hasValue={hasValue} />

        {/* Info row: format badge and value */}
        <div className="flex flex-col items-center gap-1">
          <FormatBadge format={format} />
          <ValuePreview
            value={value}
            resolvedValue={resolvedValue}
            showExpression={showExpressions}
          />
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="bg-primary absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full">
          <Barcode className="text-primary-foreground h-2.5 w-2.5" />
        </div>
      )}
    </div>
  );
});

BarcodeRenderer.displayName = "BarcodeRenderer";

// ============================================================================
// Registry
// ============================================================================

// Self-register the renderer
registerRenderer(ComponentType.Barcode, BarcodeRenderer);

export default BarcodeRenderer;

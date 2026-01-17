/**
 * Scale Renderer
 * Visual renderer for Scale components in the canvas
 *
 * Features:
 * - Visual scale indicator showing scale factor
 * - Support for uniform, horizontal, and vertical scaling
 * - Interactive scale preview with scaled content
 * - Percentage display for scale factors
 * - Visual grid overlay showing scale effect
 * - Selection state handling
 * - Child content rendering with scale transform applied
 */
"use client";

import React, { memo, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { RendererProps } from "./types";
import { RENDERER_CONTAINER_STYLES, COMPONENT_CATEGORY_COLORS } from "./types";
import {
  ChildRenderer,
  EmptyContainerPlaceholder,
  ComponentLabel,
} from "./ComponentRenderer";
import { registerRenderer } from "./registry";
import type { ScaleProperties } from "@/types/properties";
import { ComponentType } from "@/types/component";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  MoveHorizontal,
  MoveVertical,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Scale renderer
 */
export interface ScaleRendererProps extends RendererProps {
  /** Override scale values (for preview) */
  previewScale?: Partial<ScaleProperties>;
  /** Whether to show scale indicator */
  showScaleIndicator?: boolean;
}

/**
 * Resolved scale values
 */
interface ResolvedScale {
  x: number;
  y: number;
  isUniform: boolean;
}

/**
 * Scale mode type
 */
type ScaleMode = "uniform" | "horizontal" | "vertical" | "non-uniform" | "none";

// ============================================================================
// Constants
// ============================================================================

/** Default scale factor */
const DEFAULT_SCALE = 1;

/** Indicator bar width */
const INDICATOR_WIDTH = 50;

/** Indicator bar height */
const INDICATOR_HEIGHT = 8;

/** Transformation component color (pink) */
const SCALE_COLOR = "rgba(236, 72, 153, 0.3)"; // pink-500/30
const SCALE_BORDER_COLOR = "rgba(236, 72, 153, 0.6)"; // pink-500/60
const SCALE_ACCENT = "rgba(236, 72, 153, 1)"; // pink-500

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve scale properties into x and y values
 * Individual axis factors take precedence over uniform factor
 */
function resolveScale(properties: ScaleProperties): ResolvedScale {
  const uniformFactor = properties.factor ?? DEFAULT_SCALE;
  const factorX = properties.factorX ?? uniformFactor;
  const factorY = properties.factorY ?? uniformFactor;

  // Check if both factors are explicitly set differently
  const hasExplicitX = properties.factorX !== undefined;
  const hasExplicitY = properties.factorY !== undefined;
  const isUniform = (!hasExplicitX && !hasExplicitY) || factorX === factorY;

  return {
    x: factorX,
    y: factorY,
    isUniform,
  };
}

/**
 * Get the scale mode based on properties
 */
function getScaleMode(scale: ResolvedScale): ScaleMode {
  if (scale.x === 1 && scale.y === 1) return "none";
  if (scale.isUniform) return "uniform";
  if (scale.y === 1 && scale.x !== 1) return "horizontal";
  if (scale.x === 1 && scale.y !== 1) return "vertical";
  return "non-uniform";
}

/**
 * Format scale factor for display
 */
function formatScale(factor: number): string {
  if (factor === 1) return "100%";
  return `${Math.round(factor * 100)}%`;
}

/**
 * Format scale factor as multiplier
 */
function formatScaleMultiplier(factor: number): string {
  if (factor === 1) return "1×";
  return `${factor.toFixed(2)}×`;
}

/**
 * Get summary text for scale configuration
 */
function getScaleSummary(scale: ResolvedScale): string {
  const mode = getScaleMode(scale);

  switch (mode) {
    case "none":
      return "none";
    case "uniform":
      return formatScale(scale.x);
    case "horizontal":
      return `X: ${formatScale(scale.x)}`;
    case "vertical":
      return `Y: ${formatScale(scale.y)}`;
    case "non-uniform":
      return `X:${formatScale(scale.x)} Y:${formatScale(scale.y)}`;
  }
}

/**
 * Check if any scaling is applied
 */
function hasScaling(scale: ResolvedScale): boolean {
  return scale.x !== 1 || scale.y !== 1;
}

/**
 * Check if scale is enlarging or reducing
 */
function isEnlarging(scale: ResolvedScale): boolean {
  return scale.x > 1 || scale.y > 1;
}

/**
 * Clamp scale factor for visual preview (avoid extreme values)
 */
function clampVisualScale(factor: number, min = 0.25, max = 3): number {
  return Math.max(min, Math.min(max, factor));
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Scale indicator bar component
 * Shows a horizontal bar representing the scale factor
 */
const ScaleIndicatorBar = memo(function ScaleIndicatorBar({
  factor,
  label,
  direction,
  isVisible,
}: {
  factor: number;
  label: string;
  direction: "horizontal" | "vertical";
  isVisible: boolean;
}) {
  if (!isVisible || factor === 1) return null;

  // Calculate visual width/height based on scale factor (clamped for display)
  const visualFactor = clampVisualScale(factor, 0.5, 2);
  const fillPercent = Math.min(visualFactor * 50, 100); // 1.0 = 50%, 2.0 = 100%

  const isHorizontal = direction === "horizontal";

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        isHorizontal ? "flex-row" : "flex-col"
      )}
    >
      {/* Label */}
      <span className="text-[8px] font-medium text-pink-600/80">{label}</span>

      {/* Bar container */}
      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: isHorizontal ? INDICATOR_WIDTH : INDICATOR_HEIGHT,
          height: isHorizontal ? INDICATOR_HEIGHT : INDICATOR_WIDTH,
          backgroundColor: SCALE_COLOR,
          border: `1px solid ${SCALE_BORDER_COLOR}`,
        }}
      >
        {/* Fill bar */}
        <div
          className="absolute rounded-full transition-all"
          style={{
            backgroundColor: SCALE_ACCENT,
            opacity: 0.7,
            ...(isHorizontal
              ? {
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${fillPercent}%`,
                }
              : {
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: `${fillPercent}%`,
                }),
          }}
        />

        {/* 1x marker */}
        <div
          className="absolute"
          style={{
            backgroundColor: SCALE_BORDER_COLOR,
            ...(isHorizontal
              ? {
                  left: "50%",
                  top: 0,
                  bottom: 0,
                  width: 1,
                }
              : {
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: 1,
                }),
          }}
        />
      </div>

      {/* Value */}
      <span className="text-[8px] font-medium text-pink-600">
        {formatScaleMultiplier(factor)}
      </span>
    </div>
  );
});

ScaleIndicatorBar.displayName = "ScaleIndicatorBar";

/**
 * Scale indicator component
 * Shows scale bars for X and Y factors
 */
const ScaleIndicator = memo(function ScaleIndicator({
  scale,
  isVisible,
}: {
  scale: ResolvedScale;
  isVisible: boolean;
}) {
  if (!isVisible || !hasScaling(scale)) return null;

  const mode = getScaleMode(scale);

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-2 right-2 flex flex-col gap-1.5 rounded p-1.5",
        "opacity-0 transition-opacity group-hover:opacity-100"
      )}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        border: `1px solid ${SCALE_BORDER_COLOR}`,
      }}
      aria-hidden="true"
    >
      {/* Uniform scale */}
      {mode === "uniform" && (
        <ScaleIndicatorBar
          factor={scale.x}
          label="Scale"
          direction="horizontal"
          isVisible={true}
        />
      )}

      {/* Non-uniform scale - show both axes */}
      {(mode === "horizontal" ||
        mode === "vertical" ||
        mode === "non-uniform") && (
        <>
          {(mode === "horizontal" || mode === "non-uniform") && (
            <ScaleIndicatorBar
              factor={scale.x}
              label="X"
              direction="horizontal"
              isVisible={true}
            />
          )}
          {(mode === "vertical" || mode === "non-uniform") && (
            <ScaleIndicatorBar
              factor={scale.y}
              label="Y"
              direction="horizontal"
              isVisible={true}
            />
          )}
        </>
      )}
    </div>
  );
});

ScaleIndicator.displayName = "ScaleIndicator";

/**
 * Scale icon component for the header
 */
const ScaleIcon = memo(function ScaleIcon({ scale }: { scale: ResolvedScale }) {
  const mode = getScaleMode(scale);
  const enlarging = isEnlarging(scale);

  switch (mode) {
    case "uniform":
      return enlarging ? (
        <ZoomIn className="h-3.5 w-3.5 text-pink-500/70" />
      ) : (
        <ZoomOut className="h-3.5 w-3.5 text-pink-500/70" />
      );
    case "horizontal":
      return <MoveHorizontal className="h-3.5 w-3.5 text-pink-500/70" />;
    case "vertical":
      return <MoveVertical className="h-3.5 w-3.5 text-pink-500/70" />;
    case "non-uniform":
      return <Maximize2 className="h-3.5 w-3.5 text-pink-500/70" />;
    case "none":
    default:
      return <ZoomIn className="h-3.5 w-3.5 text-pink-500/50" />;
  }
});

ScaleIcon.displayName = "ScaleIcon";

/**
 * Scale grid overlay component
 * Shows a visual grid to indicate scaling effect
 */
const ScaleGridOverlay = memo(function ScaleGridOverlay({
  scale,
  isVisible,
}: {
  scale: ResolvedScale;
  isVisible: boolean;
}) {
  if (!isVisible || !hasScaling(scale)) return null;

  // Grid cell base size
  const cellSize = 20;

  // Scaled cell sizes (visual representation)
  const scaledCellX = cellSize * clampVisualScale(scale.x, 0.5, 2);
  const scaledCellY = cellSize * clampVisualScale(scale.y, 0.5, 2);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        "opacity-0 transition-opacity group-hover:opacity-20"
      )}
    >
      <svg width="100%" height="100%">
        <defs>
          <pattern
            id={`scale-grid-${scale.x}-${scale.y}`}
            width={scaledCellX}
            height={scaledCellY}
            patternUnits="userSpaceOnUse"
          >
            <rect
              width={scaledCellX}
              height={scaledCellY}
              fill="none"
              stroke={SCALE_ACCENT}
              strokeWidth={0.5}
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`url(#scale-grid-${scale.x}-${scale.y})`}
        />
      </svg>
    </div>
  );
});

ScaleGridOverlay.displayName = "ScaleGridOverlay";

// ============================================================================
// Component
// ============================================================================

/**
 * Scale Renderer Component
 * Renders a scale wrapper component with visual scale indicators
 */
function ScaleRendererComponent({
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
  hideChildren,
  previewScale,
  showScaleIndicator = true,
}: ScaleRendererProps) {
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
  // Computed Values
  // ========================================

  const properties = node.properties as unknown as ScaleProperties;

  // Resolve scale values - merge preview properties inside useMemo
  const scale = useMemo(() => {
    const mergedProperties: ScaleProperties = previewScale
      ? { ...properties, ...previewScale }
      : properties;
    return resolveScale(mergedProperties);
  }, [properties, previewScale]);

  const hasAnyScaling = hasScaling(scale);
  const mode = getScaleMode(scale);
  const summary = getScaleSummary(scale);
  const enlarging = isEnlarging(scale);
  const hasChild = node.child !== undefined;

  // Visual scale factors (clamped for preview)
  const visualScaleX = clampVisualScale(scale.x);
  const visualScaleY = clampVisualScale(scale.y);

  // ========================================
  // Render
  // ========================================

  return (
    <div
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        "group relative",
        COMPONENT_CATEGORY_COLORS.transformation,
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
      role="region"
      aria-label={`Scale wrapper: ${summary}`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="Scale" />

      {/* Header with icon and info */}
      <div className="flex items-center gap-1.5 border-b border-pink-500/20 px-2 py-1.5">
        <ScaleIcon scale={scale} />
        <span className="text-[10px] font-medium tracking-wide text-pink-600/80 uppercase">
          Scale
        </span>

        {/* Scale summary */}
        <span className="text-muted-foreground ml-auto text-[9px]">
          {summary}
        </span>

        {/* Scale mode indicator */}
        {hasAnyScaling && (
          <span
            className={cn(
              "rounded px-1 py-0.5 text-[8px]",
              enlarging
                ? "bg-pink-500/20 text-pink-600"
                : "bg-pink-300/20 text-pink-500"
            )}
          >
            {enlarging ? "↑" : "↓"}
          </span>
        )}
      </div>

      {/* Content area with scale preview */}
      <div className="relative overflow-hidden p-2">
        {/* Scale indicator (shown on hover) */}
        <ScaleIndicator scale={scale} isVisible={showScaleIndicator} />

        {/* Scale grid overlay */}
        <ScaleGridOverlay scale={scale} isVisible={showScaleIndicator} />

        {/* Content with scale transform applied (visual preview) */}
        <div
          className="relative origin-top-left"
          style={{
            transform: hasAnyScaling
              ? `scale(${visualScaleX}, ${visualScaleY})`
              : undefined,
          }}
        >
          {!hideChildren && (
            <>
              {hasChild ? (
                <ChildRenderer
                  node={node.child!}
                  depth={depth + 1}
                  onClick={onClick}
                  onDoubleClick={onDoubleClick}
                  onContextMenu={onContextMenu}
                />
              ) : (
                <EmptyContainerPlaceholder message="Drop a component to scale" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Scale details indicator (shown when selected) */}
      {isSelected && hasAnyScaling && (
        <div className="text-muted-foreground absolute right-0 -bottom-5 left-0 flex justify-center text-[8px]">
          <span className="flex items-center gap-1 rounded bg-pink-500/80 px-1.5 py-0.5 text-white">
            {mode === "uniform" ? (
              <>
                <ZoomIn className="h-2.5 w-2.5" />
                <span>{formatScale(scale.x)}</span>
              </>
            ) : (
              <span>
                X:{formatScale(scale.x)} Y:{formatScale(scale.y)}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports & Registration
// ============================================================================

export const ScaleRenderer = memo(ScaleRendererComponent);
ScaleRenderer.displayName = "ScaleRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.Scale, ScaleRenderer);

export default ScaleRenderer;

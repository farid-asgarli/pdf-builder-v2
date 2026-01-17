/**
 * Translate Renderer
 * Visual renderer for Translate components in the canvas
 *
 * Features:
 * - Visual offset indicator showing X and Y translation
 * - Interactive preview with translated content
 * - Directional arrow indicators
 * - Offset value display in points
 * - Visual guide overlay showing translation effect
 * - Selection state handling
 * - Child content rendering with translate transform applied
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
import type { TranslateProperties } from "@/types/properties";
import { ComponentType } from "@/types/component";
import {
  Move,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  ArrowUpLeft,
  ArrowDownRight,
  ArrowDownLeft,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Translate renderer
 */
export interface TranslateRendererProps extends RendererProps {
  /** Override offset values (for preview) */
  previewOffset?: Partial<TranslateProperties>;
  /** Whether to show offset indicator */
  showOffsetIndicator?: boolean;
}

/**
 * Resolved offset values
 */
interface ResolvedOffset {
  x: number;
  y: number;
}

/**
 * Translation direction type
 */
type TranslateDirection =
  | "none"
  | "right"
  | "left"
  | "down"
  | "up"
  | "up-right"
  | "up-left"
  | "down-right"
  | "down-left";

// ============================================================================
// Constants
// ============================================================================

/** Default offset value */
const DEFAULT_OFFSET = 0;

/** Indicator size */
const INDICATOR_SIZE = 50;

/** Transformation component color (pink) */
const TRANSLATE_COLOR = "rgba(236, 72, 153, 0.3)"; // pink-500/30
const TRANSLATE_BORDER_COLOR = "rgba(236, 72, 153, 0.6)"; // pink-500/60
const TRANSLATE_ACCENT = "rgba(236, 72, 153, 1)"; // pink-500

/** Maximum visual offset for preview (to keep content visible) */
const MAX_VISUAL_OFFSET = 50;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve translate properties into x and y offset values
 */
function resolveOffset(properties: TranslateProperties): ResolvedOffset {
  return {
    x: properties.x ?? DEFAULT_OFFSET,
    y: properties.y ?? DEFAULT_OFFSET,
  };
}

/**
 * Get the translation direction based on offset values
 */
function getTranslateDirection(offset: ResolvedOffset): TranslateDirection {
  const { x, y } = offset;

  if (x === 0 && y === 0) return "none";
  if (x > 0 && y === 0) return "right";
  if (x < 0 && y === 0) return "left";
  if (x === 0 && y > 0) return "down";
  if (x === 0 && y < 0) return "up";
  if (x > 0 && y < 0) return "up-right";
  if (x < 0 && y < 0) return "up-left";
  if (x > 0 && y > 0) return "down-right";
  if (x < 0 && y > 0) return "down-left";

  return "none";
}

/**
 * Format offset value for display
 */
function formatOffset(value: number): string {
  if (value === 0) return "0";
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value)}pt`;
}

/**
 * Format offset pair for display
 */
function formatOffsetPair(offset: ResolvedOffset): string {
  return `X:${formatOffset(offset.x)} Y:${formatOffset(offset.y)}`;
}

/**
 * Get summary text for translate configuration
 */
function getTranslateSummary(offset: ResolvedOffset): string {
  const { x, y } = offset;

  if (x === 0 && y === 0) return "none";
  if (x !== 0 && y === 0) return `X: ${formatOffset(x)}`;
  if (x === 0 && y !== 0) return `Y: ${formatOffset(y)}`;
  return formatOffsetPair(offset);
}

/**
 * Check if any translation is applied
 */
function hasTranslation(offset: ResolvedOffset): boolean {
  return offset.x !== 0 || offset.y !== 0;
}

/**
 * Clamp offset value for visual preview (avoid extreme values)
 */
function clampVisualOffset(
  value: number,
  max: number = MAX_VISUAL_OFFSET
): number {
  return Math.max(-max, Math.min(max, value));
}

/**
 * Get the magnitude of the offset vector
 */
function getOffsetMagnitude(offset: ResolvedOffset): number {
  return Math.sqrt(offset.x * offset.x + offset.y * offset.y);
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Offset indicator component
 * Shows X and Y offset values with directional arrow
 */
const OffsetIndicator = memo(function OffsetIndicator({
  offset,
  isVisible,
}: {
  offset: ResolvedOffset;
  isVisible: boolean;
}) {
  if (!isVisible || !hasTranslation(offset)) return null;

  const size = INDICATOR_SIZE;
  const center = size / 2;

  // Calculate arrow end point based on offset direction
  // Normalize the offset vector for visual representation
  const magnitude = getOffsetMagnitude(offset);
  const normalizedX = magnitude > 0 ? (offset.x / magnitude) * 15 : 0;
  const normalizedY = magnitude > 0 ? (offset.y / magnitude) * 15 : 0;

  const arrowEndX = center + normalizedX;
  const arrowEndY = center + normalizedY;

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-2 right-2 flex flex-col gap-1.5 rounded p-1.5",
        "opacity-0 transition-opacity group-hover:opacity-100"
      )}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        border: `1px solid ${TRANSLATE_BORDER_COLOR}`,
      }}
      aria-hidden="true"
    >
      {/* Direction indicator */}
      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: TRANSLATE_COLOR,
          border: `1px solid ${TRANSLATE_BORDER_COLOR}`,
        }}
      >
        <svg width={size} height={size} className="overflow-visible">
          {/* Center dot (origin) */}
          <circle cx={center} cy={center} r={3} fill={TRANSLATE_BORDER_COLOR} />

          {/* Arrow showing direction */}
          {hasTranslation(offset) && (
            <>
              <line
                x1={center}
                y1={center}
                x2={arrowEndX}
                y2={arrowEndY}
                stroke={TRANSLATE_ACCENT}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <circle
                cx={arrowEndX}
                cy={arrowEndY}
                r={4}
                fill={TRANSLATE_ACCENT}
              />
            </>
          )}

          {/* Axis lines (light) */}
          <line
            x1={4}
            y1={center}
            x2={size - 4}
            y2={center}
            stroke={TRANSLATE_BORDER_COLOR}
            strokeWidth={1}
            strokeDasharray="2,2"
            opacity={0.5}
          />
          <line
            x1={center}
            y1={4}
            x2={center}
            y2={size - 4}
            stroke={TRANSLATE_BORDER_COLOR}
            strokeWidth={1}
            strokeDasharray="2,2"
            opacity={0.5}
          />
        </svg>
      </div>

      {/* Offset values */}
      <div className="flex flex-col gap-0.5 text-center">
        {offset.x !== 0 && (
          <span className="text-[8px] font-medium text-pink-600">
            X: {formatOffset(offset.x)}
          </span>
        )}
        {offset.y !== 0 && (
          <span className="text-[8px] font-medium text-pink-600">
            Y: {formatOffset(offset.y)}
          </span>
        )}
      </div>
    </div>
  );
});

OffsetIndicator.displayName = "OffsetIndicator";

/**
 * Translate icon component for the header
 */
const TranslateIcon = memo(function TranslateIcon({
  offset,
}: {
  offset: ResolvedOffset;
}) {
  const direction = getTranslateDirection(offset);

  switch (direction) {
    case "right":
      return <ArrowRight className="h-3.5 w-3.5 text-pink-500/70" />;
    case "left":
      return <ArrowLeft className="h-3.5 w-3.5 text-pink-500/70" />;
    case "down":
      return <ArrowDown className="h-3.5 w-3.5 text-pink-500/70" />;
    case "up":
      return <ArrowUp className="h-3.5 w-3.5 text-pink-500/70" />;
    case "up-right":
      return <ArrowUpRight className="h-3.5 w-3.5 text-pink-500/70" />;
    case "up-left":
      return <ArrowUpLeft className="h-3.5 w-3.5 text-pink-500/70" />;
    case "down-right":
      return <ArrowDownRight className="h-3.5 w-3.5 text-pink-500/70" />;
    case "down-left":
      return <ArrowDownLeft className="h-3.5 w-3.5 text-pink-500/70" />;
    case "none":
    default:
      return <Move className="h-3.5 w-3.5 text-pink-500/50" />;
  }
});

TranslateIcon.displayName = "TranslateIcon";

/**
 * Translation guide overlay component
 * Shows visual guides indicating the translation effect
 */
const TranslateGuideOverlay = memo(function TranslateGuideOverlay({
  offset,
  isVisible,
}: {
  offset: ResolvedOffset;
  isVisible: boolean;
}) {
  if (!isVisible || !hasTranslation(offset)) return null;

  // Clamp offset for visual representation
  const visualX = clampVisualOffset(offset.x);
  const visualY = clampVisualOffset(offset.y);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Original position indicator (ghost outline) */}
      <div
        className={cn(
          "absolute inset-2 rounded border-2 border-dashed",
          "opacity-0 transition-opacity group-hover:opacity-30"
        )}
        style={{
          borderColor: TRANSLATE_ACCENT,
          transform: `translate(${-visualX}px, ${-visualY}px)`,
        }}
      />

      {/* Movement line from original to current position */}
      <svg
        className={cn(
          "absolute inset-0",
          "opacity-0 transition-opacity group-hover:opacity-50"
        )}
        style={{ overflow: "visible" }}
      >
        <defs>
          <marker
            id="translate-arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={TRANSLATE_ACCENT}
              opacity={0.7}
            />
          </marker>
        </defs>
        <line
          x1="50%"
          y1="50%"
          x2={`calc(50% + ${visualX}px)`}
          y2={`calc(50% + ${visualY}px)`}
          stroke={TRANSLATE_ACCENT}
          strokeWidth={2}
          strokeDasharray="4,4"
          markerEnd="url(#translate-arrowhead)"
        />
      </svg>
    </div>
  );
});

TranslateGuideOverlay.displayName = "TranslateGuideOverlay";

/**
 * Offset axis indicator bar component
 * Shows a visual bar for X or Y offset
 */
const _OffsetAxisBar = memo(function OffsetAxisBar({
  value,
  axis,
  isVisible,
}: {
  value: number;
  axis: "x" | "y";
  isVisible: boolean;
}) {
  if (!isVisible || value === 0) return null;

  const isHorizontal = axis === "x";
  const isPositive = value > 0;
  const absValue = Math.abs(value);
  const clampedValue = Math.min(absValue, MAX_VISUAL_OFFSET);
  const barLength = (clampedValue / MAX_VISUAL_OFFSET) * 40;

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        isHorizontal ? "flex-row" : "flex-col"
      )}
    >
      <span className="text-[8px] font-medium text-pink-600/80 uppercase">
        {axis}
      </span>

      <div
        className="relative flex items-center justify-center"
        style={{
          width: isHorizontal ? 50 : 8,
          height: isHorizontal ? 8 : 50,
        }}
      >
        {/* Center line */}
        <div
          className="absolute"
          style={{
            backgroundColor: TRANSLATE_BORDER_COLOR,
            ...(isHorizontal
              ? { left: "50%", top: 0, bottom: 0, width: 1 }
              : { top: "50%", left: 0, right: 0, height: 1 }),
          }}
        />

        {/* Offset bar */}
        <div
          className="absolute rounded-full transition-all"
          style={{
            backgroundColor: TRANSLATE_ACCENT,
            opacity: 0.7,
            ...(isHorizontal
              ? {
                  top: 0,
                  bottom: 0,
                  width: barLength,
                  left: isPositive ? "50%" : `calc(50% - ${barLength}px)`,
                }
              : {
                  left: 0,
                  right: 0,
                  height: barLength,
                  top: isPositive ? "50%" : `calc(50% - ${barLength}px)`,
                }),
          }}
        />
      </div>

      <span className="text-[8px] font-medium text-pink-600">
        {formatOffset(value)}
      </span>
    </div>
  );
});

_OffsetAxisBar.displayName = "OffsetAxisBar";

// ============================================================================
// Component
// ============================================================================

/**
 * Translate Renderer Component
 * Renders a translation wrapper component with visual offset indicators
 */
function TranslateRendererComponent({
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
  previewOffset,
  showOffsetIndicator = true,
}: TranslateRendererProps) {
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

  const properties = node.properties as unknown as TranslateProperties;

  // Apply preview offset if provided
  const resolvedProperties = useMemo(() => {
    if (!previewOffset) return properties;
    return {
      ...properties,
      x: previewOffset.x ?? properties.x,
      y: previewOffset.y ?? properties.y,
    };
  }, [properties, previewOffset]);

  const offset = useMemo(
    () => resolveOffset(resolvedProperties),
    [resolvedProperties]
  );

  const hasOffset = hasTranslation(offset);
  const summary = getTranslateSummary(offset);
  const hasChild = node.child !== undefined;
  const direction = getTranslateDirection(offset);

  // Visual offset (clamped for preview)
  const visualOffsetX = clampVisualOffset(offset.x);
  const visualOffsetY = clampVisualOffset(offset.y);

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
      aria-label={`Translation wrapper: ${summary}`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="Translate" />

      {/* Header with icon and info */}
      <div className="flex items-center gap-1.5 border-b border-pink-500/20 px-2 py-1.5">
        <TranslateIcon offset={offset} />
        <span className="text-[10px] font-medium tracking-wide text-pink-600/80 uppercase">
          Translate
        </span>

        {/* Offset summary */}
        <span className="text-muted-foreground ml-auto text-[9px]">
          {summary}
        </span>

        {/* Direction indicator */}
        {hasOffset && (
          <span className="rounded bg-pink-500/20 px-1 py-0.5 text-[8px] text-pink-600">
            {direction !== "none" ? "↗" : ""}
          </span>
        )}
      </div>

      {/* Content area with translation preview */}
      <div className="relative overflow-hidden p-2">
        {/* Offset indicator (shown on hover) */}
        <OffsetIndicator offset={offset} isVisible={showOffsetIndicator} />

        {/* Translation guide overlay */}
        <TranslateGuideOverlay
          offset={offset}
          isVisible={showOffsetIndicator}
        />

        {/* Content with translate transform applied (visual preview) */}
        <div
          className="relative"
          style={{
            transform: hasOffset
              ? `translate(${visualOffsetX}px, ${visualOffsetY}px)`
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
                <EmptyContainerPlaceholder message="Drop a component to translate" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Offset details indicator (shown when selected) */}
      {isSelected && hasOffset && (
        <div className="text-muted-foreground absolute right-0 -bottom-5 left-0 flex justify-center text-[8px]">
          <span className="flex items-center gap-1 rounded bg-pink-500/80 px-1.5 py-0.5 text-white">
            <Move className="h-2.5 w-2.5" />
            <span>{formatOffsetPair(offset)}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports & Registration
// ============================================================================

export const TranslateRenderer = memo(TranslateRendererComponent);
TranslateRenderer.displayName = "TranslateRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.Translate, TranslateRenderer);

export default TranslateRenderer;

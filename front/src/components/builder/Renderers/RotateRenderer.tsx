/**
 * Rotate Renderer
 * Visual renderer for Rotate components in the canvas
 *
 * Features:
 * - Visual rotation indicator with angle display
 * - Interactive rotation preview showing rotated content
 * - Support for both constrained (90°) and free rotation angles
 * - Circular angle indicator with degree markers
 * - Selection state handling
 * - Child content rendering with rotation transform applied
 */
"use client";

import React, { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { RendererProps } from "./types";
import { RENDERER_CONTAINER_STYLES, COMPONENT_CATEGORY_COLORS } from "./types";
import {
  ChildRenderer,
  EmptyContainerPlaceholder,
  ComponentLabel,
} from "./ComponentRenderer";
import { registerRenderer } from "./registry";
import type { RotateProperties } from "@/types/properties";
import { ComponentType } from "@/types/component";
import { RotateCw, RotateCcw, RefreshCw } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Rotate renderer
 */
export interface RotateRendererProps extends RendererProps {
  /** Override rotation angle (for preview) */
  previewAngle?: number;
  /** Whether to show angle indicator */
  showAngleIndicator?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default rotation angle */
const DEFAULT_ROTATION_ANGLE = 0;

/** Size of the rotation indicator */
const INDICATOR_SIZE = 40;

/** Major tick marks (every 90 degrees) */
const MAJOR_TICKS = [0, 90, 180, 270];

/** Transformation component color (pink) */
const ROTATE_COLOR = "rgba(236, 72, 153, 0.3)"; // pink-500/30
const ROTATE_BORDER_COLOR = "rgba(236, 72, 153, 0.6)"; // pink-500/60
const ROTATE_ACCENT = "rgba(236, 72, 153, 1)"; // pink-500

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get rotation angle from properties
 */
function getRotationAngle(properties: RotateProperties): number {
  return properties.angle ?? DEFAULT_ROTATION_ANGLE;
}

/**
 * Normalize angle to -180 to 180 range
 */
function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  return normalized;
}

/**
 * Format angle for display
 */
function formatAngle(angle: number): string {
  const normalized = normalizeAngle(angle);
  return `${normalized}°`;
}

/**
 * Check if angle is a constrained rotation (multiple of 90)
 */
function isConstrainedRotation(angle: number): boolean {
  return angle !== 0 && angle % 90 === 0;
}

/**
 * Get rotation direction icon based on angle
 */
function getRotationDirection(
  angle: number
): "cw" | "ccw" | "flip" | "none" | "free" {
  if (angle === 0) return "none";
  if (angle === 180 || angle === -180) return "flip";
  if (angle > 0 && angle < 180) return "cw";
  if (angle > 180 || (angle < 0 && angle > -180)) return "ccw";
  if (angle < -180) return "cw";
  if (isConstrainedRotation(angle)) return angle > 0 ? "cw" : "ccw";
  return "free";
}

/**
 * Get summary text for rotation configuration
 */
function getRotationSummary(angle: number): string {
  if (angle === 0) return "none";
  if (angle === 90) return "90° CW";
  if (angle === -90 || angle === 270) return "90° CCW";
  if (angle === 180 || angle === -180) return "180°";
  return formatAngle(angle);
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Circular rotation angle indicator component
 * Shows the current rotation angle visually
 */
const RotationIndicator = memo(function RotationIndicator({
  angle,
  size = INDICATOR_SIZE,
  isVisible,
}: {
  angle: number;
  size?: number;
  isVisible: boolean;
}) {
  if (!isVisible) return null;

  const radius = (size - 4) / 2;
  const center = size / 2;

  // Calculate the rotation line end point
  const angleRad = ((angle - 90) * Math.PI) / 180; // -90 to start from top
  const lineEndX = center + radius * 0.8 * Math.cos(angleRad);
  const lineEndY = center + radius * 0.8 * Math.sin(angleRad);

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-2 right-2 rounded-full",
        "opacity-0 transition-opacity group-hover:opacity-100"
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: ROTATE_COLOR,
        border: `1px solid ${ROTATE_BORDER_COLOR}`,
      }}
      aria-hidden="true"
    >
      <svg width={size} height={size} className="overflow-visible">
        {/* Tick marks */}
        {MAJOR_TICKS.map((tick) => {
          const tickAngleRad = ((tick - 90) * Math.PI) / 180;
          const innerR = radius * 0.7;
          const outerR = radius * 0.95;
          const x1 = center + innerR * Math.cos(tickAngleRad);
          const y1 = center + innerR * Math.sin(tickAngleRad);
          const x2 = center + outerR * Math.cos(tickAngleRad);
          const y2 = center + outerR * Math.sin(tickAngleRad);

          return (
            <line
              key={tick}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={ROTATE_BORDER_COLOR}
              strokeWidth={1}
            />
          );
        })}

        {/* Zero marker (top) */}
        <circle cx={center} cy={4} r={2} fill={ROTATE_BORDER_COLOR} />

        {/* Rotation indicator line */}
        {angle !== 0 && (
          <>
            <line
              x1={center}
              y1={center}
              x2={lineEndX}
              y2={lineEndY}
              stroke={ROTATE_ACCENT}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <circle cx={lineEndX} cy={lineEndY} r={3} fill={ROTATE_ACCENT} />
          </>
        )}

        {/* Center dot */}
        <circle cx={center} cy={center} r={2} fill={ROTATE_BORDER_COLOR} />

        {/* Arc showing rotation */}
        {angle !== 0 && (
          <path
            d={describeArc(center, center, radius * 0.5, -90, angle - 90)}
            fill="none"
            stroke={ROTATE_ACCENT}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.5}
          />
        )}
      </svg>
    </div>
  );
});

RotationIndicator.displayName = "RotationIndicator";

/**
 * Create SVG arc path
 */
function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";
  const sweepFlag = endAngle > startAngle ? "1" : "0";

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
}

/**
 * Convert polar coordinates to Cartesian
 */
function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

/**
 * Rotation icon component for the header
 */
const RotateIcon = memo(function RotateIcon({ angle }: { angle: number }) {
  const direction = getRotationDirection(angle);

  switch (direction) {
    case "cw":
      return <RotateCw className="h-3.5 w-3.5 text-pink-500/70" />;
    case "ccw":
      return <RotateCcw className="h-3.5 w-3.5 text-pink-500/70" />;
    case "flip":
      return <RefreshCw className="h-3.5 w-3.5 text-pink-500/70" />;
    case "none":
    case "free":
    default:
      return <RotateCw className="h-3.5 w-3.5 text-pink-500/50" />;
  }
});

RotateIcon.displayName = "RotateIcon";

/**
 * Rotation visual guide overlay
 * Shows rotation axis and angle arc on hover
 */
const RotationGuideOverlay = memo(function RotationGuideOverlay({
  angle,
  isVisible,
}: {
  angle: number;
  isVisible: boolean;
}) {
  if (!isVisible || angle === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Rotation center indicator */}
      <div
        className={cn(
          "absolute h-4 w-4 rounded-full border-2",
          "opacity-0 transition-opacity group-hover:opacity-100"
        )}
        style={{
          borderColor: ROTATE_ACCENT,
          backgroundColor: `${ROTATE_ACCENT}20`,
        }}
      />

      {/* Corner rotation indicators */}
      {isConstrainedRotation(angle) && (
        <div
          className={cn(
            "absolute inset-2 rounded border-2 border-dashed",
            "opacity-0 transition-opacity group-hover:opacity-30"
          )}
          style={{
            borderColor: ROTATE_ACCENT,
            transform: `rotate(${angle}deg)`,
          }}
        />
      )}
    </div>
  );
});

RotationGuideOverlay.displayName = "RotationGuideOverlay";

// ============================================================================
// Component
// ============================================================================

/**
 * Rotate Renderer Component
 * Renders a rotation wrapper component with visual rotation indicators
 */
function RotateRendererComponent({
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
  previewAngle,
  showAngleIndicator = true,
}: RotateRendererProps) {
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

  const properties = node.properties as unknown as RotateProperties;
  const angle =
    previewAngle !== undefined ? previewAngle : getRotationAngle(properties);

  const hasRotation = angle !== 0;
  const isConstrained = isConstrainedRotation(angle);
  const summary = getRotationSummary(angle);
  const hasChild = node.child !== undefined;

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
      aria-label={`Rotation wrapper: ${summary}`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="Rotate" />

      {/* Header with icon and info */}
      <div className="flex items-center gap-1.5 border-b border-pink-500/20 px-2 py-1.5">
        <RotateIcon angle={angle} />
        <span className="text-[10px] font-medium tracking-wide text-pink-600/80 uppercase">
          Rotate
        </span>

        {/* Angle summary */}
        <span className="text-muted-foreground ml-auto text-[9px]">
          {summary}
        </span>

        {/* Constrained indicator (90° multiples) */}
        {isConstrained && (
          <span className="rounded bg-pink-500/20 px-1 py-0.5 text-[8px] text-pink-600">
            90°
          </span>
        )}
      </div>

      {/* Content area with rotation preview */}
      <div className="relative overflow-hidden p-2">
        {/* Rotation indicator (shown on hover) */}
        <RotationIndicator
          angle={angle}
          isVisible={showAngleIndicator && hasRotation}
        />

        {/* Rotation guide overlay */}
        <RotationGuideOverlay
          angle={angle}
          isVisible={showAngleIndicator && hasRotation}
        />

        {/* Content with rotation transform applied (visual preview) */}
        <div
          className="relative"
          style={{
            transform: hasRotation ? `rotate(${angle}deg)` : undefined,
            transformOrigin: "center center",
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
                <EmptyContainerPlaceholder message="Drop a component to rotate" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Rotation details indicator (shown when selected) */}
      {isSelected && hasRotation && (
        <div className="text-muted-foreground absolute right-0 -bottom-5 left-0 flex justify-center text-[8px]">
          <span className="flex items-center gap-1 rounded bg-pink-500/80 px-1.5 py-0.5 text-white">
            <RotateCw className="h-2.5 w-2.5" />
            <span>{formatAngle(angle)}</span>
            {isConstrained && <span>(constrained)</span>}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports & Registration
// ============================================================================

export const RotateRenderer = memo(RotateRendererComponent);
RotateRenderer.displayName = "RotateRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.Rotate, RotateRenderer);

export default RotateRenderer;

/**
 * Background Renderer
 * Visual renderer for Background components in the canvas
 *
 * Features:
 * - Visual background color indicator
 * - Color preview swatch in header
 * - Selection state handling
 * - Child content rendering with background applied
 * - Transparent/pattern background for empty state
 * - Hex color display with copy support
 */
"use client";

import React, { memo, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { RendererProps } from "./types";
import { RENDERER_CONTAINER_STYLES, COMPONENT_CATEGORY_COLORS } from "./types";
import {
  ChildRenderer,
  EmptyContainerPlaceholder,
  ComponentLabel,
} from "./ComponentRenderer";
import { registerRenderer } from "./registry";
import type { BackgroundProperties } from "@/types/properties";
import { ComponentType } from "@/types/component";
import { Paintbrush, Copy, Check } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Background renderer
 */
export interface BackgroundRendererProps extends RendererProps {
  /** Override background values (for preview) */
  previewBackground?: BackgroundProperties;
  /** Whether to show color details */
  showColorDetails?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default background color (transparent) */
const DEFAULT_BACKGROUND_COLOR = "transparent";

/** Checkerboard pattern for transparent backgrounds */
const TRANSPARENT_PATTERN = `
  linear-gradient(45deg, #ccc 25%, transparent 25%),
  linear-gradient(-45deg, #ccc 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, #ccc 75%),
  linear-gradient(-45deg, transparent 75%, #ccc 75%)
`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve background properties
 */
function resolveBackground(properties: BackgroundProperties): string {
  return properties.color ?? DEFAULT_BACKGROUND_COLOR;
}

/**
 * Check if color is transparent
 */
function isTransparent(color: string): boolean {
  const normalizedColor = color.toLowerCase().trim();
  return (
    normalizedColor === "transparent" ||
    normalizedColor === "" ||
    normalizedColor === "rgba(0,0,0,0)" ||
    normalizedColor === "rgba(0, 0, 0, 0)"
  );
}

/**
 * Format hex color for display (truncate if too long)
 */
function formatColorDisplay(color: string): string {
  if (isTransparent(color)) {
    return "transparent";
  }
  if (color.length > 9) {
    return color.substring(0, 9) + "…";
  }
  return color;
}

/**
 * Check if color is dark (for text contrast)
 */
function isColorDark(color: string): boolean {
  // Handle transparent
  if (isTransparent(color)) return false;

  // Handle hex colors
  let hex = color.replace("#", "");

  // Handle shorthand hex (#fff -> #ffffff)
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  // Handle 8-character hex (with alpha)
  if (hex.length === 8) {
    hex = hex.substring(0, 6);
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate perceived brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness < 128;
}

/**
 * Get the contrast text color for a background
 */
function getContrastColor(backgroundColor: string): string {
  if (isTransparent(backgroundColor)) {
    return "currentColor";
  }
  return isColorDark(backgroundColor) ? "#ffffff" : "#000000";
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Color swatch component with optional transparency pattern
 */
const ColorSwatch = memo(function ColorSwatch({
  color,
  size = "sm",
  showPattern = false,
}: {
  color: string;
  size?: "sm" | "md" | "lg";
  showPattern?: boolean;
}) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-6 w-6",
  };

  const transparent = isTransparent(color);

  return (
    <span
      className={cn(
        "inline-block overflow-hidden rounded-sm border border-white/30 shadow-sm",
        sizeClasses[size]
      )}
      style={
        transparent && showPattern
          ? {
              background: TRANSPARENT_PATTERN,
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
            }
          : { backgroundColor: color }
      }
      aria-hidden="true"
    />
  );
});

ColorSwatch.displayName = "ColorSwatch";

/**
 * Copy color button component
 */
const CopyColorButton = memo(function CopyColorButton({
  color,
}: {
  color: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(color);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // Silently fail if clipboard access is denied
      }
    },
    [color]
  );

  if (isTransparent(color)) return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "rounded p-0.5 transition-colors hover:bg-purple-500/20",
        "opacity-0 group-hover:opacity-100",
        "focus:opacity-100 focus:ring-1 focus:ring-purple-500 focus:outline-none"
      )}
      title={copied ? "Copied!" : "Copy color"}
      aria-label={copied ? "Color copied" : "Copy color to clipboard"}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 text-purple-500/70" />
      )}
    </button>
  );
});

CopyColorButton.displayName = "CopyColorButton";

// ============================================================================
// Component
// ============================================================================

/**
 * Background Renderer Component
 * Renders a background wrapper component with visual color indicator
 */
function BackgroundRendererComponent({
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
  previewBackground,
  showColorDetails = true,
}: BackgroundRendererProps) {
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

  const properties =
    previewBackground ?? (node.properties as unknown as BackgroundProperties);

  // Resolve background color
  const backgroundColor = useMemo(
    () => resolveBackground(properties),
    [properties]
  );

  const transparent = isTransparent(backgroundColor);
  const hasChild = node.child !== undefined;
  // Note: contrastColor can be used for text visibility on colored backgrounds
  const _contrastColor = getContrastColor(backgroundColor);

  // ========================================
  // Render
  // ========================================

  return (
    <div
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        "group relative rounded",
        COMPONENT_CATEGORY_COLORS.styling,
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
      aria-label={`Background: ${formatColorDisplay(backgroundColor)}`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="Background" />

      {/* Background header with icon and info */}
      <div className="flex items-center gap-1.5 border-b border-purple-500/20 px-2 py-1.5">
        <Paintbrush className="h-3.5 w-3.5 text-purple-500/70" />
        <span className="text-[10px] font-medium tracking-wide text-purple-600/80 uppercase">
          Background
        </span>

        {/* Color swatch */}
        <ColorSwatch color={backgroundColor} showPattern={transparent} />

        {/* Color value */}
        <span className="text-muted-foreground ml-auto font-mono text-[9px]">
          {formatColorDisplay(backgroundColor)}
        </span>

        {/* Copy button */}
        {showColorDetails && <CopyColorButton color={backgroundColor} />}
      </div>

      {/* Content area with background color applied */}
      <div
        className="relative min-h-10 rounded-b"
        style={
          transparent
            ? {
                background: TRANSPARENT_PATTERN,
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
              }
            : { backgroundColor }
        }
      >
        {/* Overlay for transparent pattern when there's content */}
        {!transparent && (
          <div
            className="pointer-events-none absolute inset-0 rounded-b"
            style={{ backgroundColor }}
          />
        )}

        {/* Content wrapper */}
        <div className="relative p-2">
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
                <EmptyContainerPlaceholder message="Drop a component to apply background" />
              )}
            </>
          )}
        </div>

        {/* Background color overlay indicator on hover */}
        <div
          className={cn(
            "absolute right-1 bottom-1 flex items-center gap-1 rounded px-1.5 py-0.5",
            "bg-black/60 font-mono text-[8px] text-white",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "pointer-events-none"
          )}
        >
          <ColorSwatch color={backgroundColor} size="sm" showPattern />
          {formatColorDisplay(backgroundColor)}
        </div>
      </div>

      {/* Color details indicator (shown when selected) */}
      {isSelected && showColorDetails && (
        <div className="text-muted-foreground absolute right-0 -bottom-5 left-0 flex justify-center text-[8px]">
          <span className="flex items-center gap-1.5 rounded bg-purple-500/80 px-1.5 py-0.5 text-white">
            <ColorSwatch color={backgroundColor} size="sm" showPattern />
            <span className="font-mono">{backgroundColor}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports & Registration
// ============================================================================

export const BackgroundRenderer = memo(BackgroundRendererComponent);
BackgroundRenderer.displayName = "BackgroundRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.Background, BackgroundRenderer);

export default BackgroundRenderer;

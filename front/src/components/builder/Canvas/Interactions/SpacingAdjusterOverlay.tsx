/**
 * SpacingAdjusterOverlay Component
 * Renders spacing adjusters between children for Column/Row containers
 *
 * This component overlays adjusters on top of the gap between children,
 * allowing users to visually drag to adjust spacing.
 *
 * Features:
 * - Renders SpacingAdjuster between each pair of children
 * - Only shows when container is selected
 * - Syncs with container's spacing property
 * - Works for both Column (vertical) and Row (horizontal) layouts
 */
"use client";

import React, { memo, useMemo, Fragment } from "react";
import { SpacingAdjuster } from "./SpacingAdjuster";
import type { ComponentType, LayoutNode } from "@/types/component";
import type { ColumnProperties, RowProperties } from "@/types/properties";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for SpacingAdjusterOverlay component
 */
export interface SpacingAdjusterOverlayProps {
  /** Container node (Column or Row) */
  node: LayoutNode;
  /** Whether the container is selected */
  isSelected: boolean;
  /** Callback when spacing changes */
  onSpacingChange?: (spacing: number) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for WithSpacingAdjusters component
 */
export interface WithSpacingAdjustersProps {
  /** Container node (Column or Row) */
  node: LayoutNode;
  /** Whether the container is selected */
  isSelected: boolean;
  /** Child elements to render with spacing adjusters between them */
  children: React.ReactNode[];
  /** Callback when spacing changes */
  onSpacingChange?: (spacing: number) => void;
  /** Additional CSS classes for the container */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default spacing in points */
const DEFAULT_SPACING = 0;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get spacing value from container properties
 */
function getSpacingFromNode(node: LayoutNode): number {
  const properties = node.properties as ColumnProperties | RowProperties;
  return properties.spacing ?? DEFAULT_SPACING;
}

/**
 * Check if node is a Column or Row type
 */
function isSpacingContainer(type: ComponentType): boolean {
  return type === "Column" || type === "Row";
}

/**
 * Get direction from component type
 */
function getDirection(type: ComponentType): "vertical" | "horizontal" {
  return type === "Column" ? "vertical" : "horizontal";
}

// ============================================================================
// SpacingAdjusterOverlay Component
// ============================================================================

/**
 * Overlays spacing adjusters on container gaps
 * Used as an absolute overlay on top of the children area
 */
function SpacingAdjusterOverlayComponent({
  node,
  isSelected,
  onSpacingChange,
  className,
}: SpacingAdjusterOverlayProps) {
  const { id, type, children } = node;

  // Only render for Column/Row with multiple children when selected
  const shouldRender = useMemo(() => {
    return (
      isSelected && isSpacingContainer(type) && children && children.length > 1
    );
  }, [isSelected, type, children]);

  const spacing = getSpacingFromNode(node);
  const direction = getDirection(type);
  const gapCount = children ? children.length - 1 : 0;

  if (!shouldRender || gapCount === 0) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        display: "flex",
        flexDirection: direction === "vertical" ? "column" : "row",
        justifyContent: "space-evenly",
      }}
    >
      {Array.from({ length: gapCount }).map((_, index) => (
        <div
          key={`gap-${index}`}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
          }}
        >
          <SpacingAdjuster
            componentId={id}
            componentType={type}
            gapIndex={index}
            spacing={spacing}
            direction={direction}
            enabled={isSelected}
            onSpacingChange={onSpacingChange}
          />
        </div>
      ))}
    </div>
  );
}

export const SpacingAdjusterOverlay = memo(SpacingAdjusterOverlayComponent);
SpacingAdjusterOverlay.displayName = "SpacingAdjusterOverlay";

// ============================================================================
// WithSpacingAdjusters Component
// ============================================================================

/**
 * Renders children with SpacingAdjuster components between them
 * Use this as a replacement for the standard children mapping in Column/Row
 */
function WithSpacingAdjustersComponent({
  node,
  isSelected,
  children,
  onSpacingChange,
  className,
}: WithSpacingAdjustersProps) {
  const { id, type } = node;

  // Only show adjusters for Column/Row when selected
  const showAdjusters = useMemo(() => {
    return isSelected && isSpacingContainer(type) && children.length > 1;
  }, [isSelected, type, children.length]);

  const spacing = getSpacingFromNode(node);
  const direction = getDirection(type);

  if (!showAdjusters) {
    // Just render children without adjusters
    return <>{children}</>;
  }

  // Interleave children with spacing adjusters
  return (
    <>
      {children.map((child, index) => (
        <Fragment key={index}>
          {child}
          {/* Render spacing adjuster between children (not after last) */}
          {index < children.length - 1 && (
            <SpacingAdjuster
              componentId={id}
              componentType={type}
              gapIndex={index}
              spacing={spacing}
              direction={direction}
              enabled={isSelected}
              onSpacingChange={onSpacingChange}
              className={className}
            />
          )}
        </Fragment>
      ))}
    </>
  );
}

export const WithSpacingAdjusters = memo(WithSpacingAdjustersComponent);
WithSpacingAdjusters.displayName = "WithSpacingAdjusters";

// ============================================================================
// Exports
// ============================================================================

export default SpacingAdjusterOverlay;

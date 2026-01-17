/**
 * useAlignment Hook
 * Calculates alignment with nearby components, detects equal spacing,
 * and suggests alignment when within a configurable threshold
 *
 * Features:
 * - Calculate alignment with nearby components (edges, centers)
 * - Detect equal spacing between components
 * - Suggest alignment when within threshold (default 5px)
 * - Support for horizontal and vertical alignment guides
 * - Snap position calculation for guided positioning
 * - Integration with interaction store for visual feedback
 */
"use client";

import { useCallback, useRef } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import {
  useInteractionStore,
  type AlignmentGuide,
} from "@/store/interaction-store";
import type { BoundingBox, Point } from "@/types/canvas";
import type { LayoutNode } from "@/types/component";
import { findParentNode } from "@/lib/canvas/tree-utils";

// ============================================================================
// Types
// ============================================================================

/**
 * Bounding box with ID for identifying components
 */
export interface ComponentBounds extends BoundingBox {
  id: string;
}

/**
 * Alignment match information
 */
export interface AlignmentMatch {
  /** Type of alignment */
  type:
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "center-x"
    | "center-y"
    | "equal-spacing-x"
    | "equal-spacing-y";
  /** Position to snap to */
  snapPosition: number;
  /** Distance from current position to snap position */
  distance: number;
  /** ID of the component being aligned with */
  targetId: string;
  /** Guide to display */
  guide: AlignmentGuide;
}

/**
 * Spacing match for equal spacing detection
 */
export interface SpacingMatch {
  /** Type of spacing */
  type: "horizontal" | "vertical";
  /** The spacing value */
  spacing: number;
  /** Components involved in the equal spacing */
  componentIds: string[];
  /** Guide to display */
  guide: AlignmentGuide;
}

/**
 * Result from alignment calculation
 */
export interface AlignmentResult {
  /** All alignment matches found */
  matches: AlignmentMatch[];
  /** Spacing matches found */
  spacingMatches: SpacingMatch[];
  /** Suggested snap position (if any) */
  suggestedPosition: Point | null;
  /** Suggested size adjustment (for resize) */
  suggestedSize: { width: number; height: number } | null;
  /** All guides to display */
  guides: AlignmentGuide[];
}

/**
 * Options for alignment calculation
 */
export interface AlignmentOptions {
  /** Threshold in pixels for snapping (default: 5) */
  threshold?: number;
  /** Whether to check edge alignment */
  checkEdges?: boolean;
  /** Whether to check center alignment */
  checkCenters?: boolean;
  /** Whether to check equal spacing */
  checkSpacing?: boolean;
  /** Whether to include parent boundaries */
  includeParent?: boolean;
  /** Maximum number of guides to show */
  maxGuides?: number;
  /** Color for alignment guides */
  guideColor?: string;
  /** Color for spacing guides */
  spacingGuideColor?: string;
}

/**
 * Return type for useAlignment hook
 */
export interface UseAlignmentReturn {
  /**
   * Calculate alignment guides for a component at given bounds
   * @param componentId - ID of the component being moved/resized
   * @param currentBounds - Current bounds of the component
   * @param options - Alignment options
   * @returns Alignment result with matches and guides
   */
  calculateAlignment: (
    componentId: string,
    currentBounds: BoundingBox,
    options?: AlignmentOptions
  ) => AlignmentResult;

  /**
   * Get snap position for a point based on alignment
   * @param componentId - ID of the component
   * @param position - Current position
   * @param size - Component size
   * @param options - Alignment options
   * @returns Snapped position
   */
  getSnapPosition: (
    componentId: string,
    position: Point,
    size: { width: number; height: number },
    options?: AlignmentOptions
  ) => Point;

  /**
   * Get snap size for resize based on alignment
   * @param componentId - ID of the component
   * @param bounds - Current bounds during resize
   * @param resizeHandle - Which handle is being dragged
   * @param options - Alignment options
   * @returns Snapped size and position adjustment
   */
  getSnapSize: (
    componentId: string,
    bounds: BoundingBox,
    resizeHandle: "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw",
    options?: AlignmentOptions
  ) => { size: { width: number; height: number }; position: Point };

  /**
   * Update alignment guides in the interaction store
   * @param guides - Guides to display
   */
  setGuides: (guides: AlignmentGuide[]) => void;

  /**
   * Clear all alignment guides
   */
  clearGuides: () => void;

  /**
   * Get siblings of a component for alignment
   * @param componentId - Component ID
   * @returns Array of sibling components
   */
  getSiblings: (componentId: string) => LayoutNode[];

  /**
   * Check if equal spacing exists
   * @param componentId - Component being moved
   * @param bounds - Current bounds
   * @returns Spacing matches if equal spacing is detected
   */
  detectEqualSpacing: (
    componentId: string,
    bounds: BoundingBox
  ) => SpacingMatch[];

  /**
   * Update bounds cache for a component (call from renderers)
   * @param componentId - Component ID
   * @param bounds - Component bounds
   */
  updateBoundsCache: (componentId: string, bounds: BoundingBox) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: Required<AlignmentOptions> = {
  threshold: 5,
  checkEdges: true,
  checkCenters: true,
  checkSpacing: true,
  includeParent: true,
  maxGuides: 8,
  guideColor: "#ef4444", // Red-500
  spacingGuideColor: "#3b82f6", // Blue-500
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique ID for alignment guide
 */
function generateGuideId(): string {
  return `guide_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Calculate center point of a bounding box
 */
function getCenter(bounds: BoundingBox): Point {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

/**
 * Get edges of a bounding box
 */
function getEdges(bounds: BoundingBox): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
} {
  return {
    left: bounds.x,
    right: bounds.x + bounds.width,
    top: bounds.y,
    bottom: bounds.y + bounds.height,
    centerX: bounds.x + bounds.width / 2,
    centerY: bounds.y + bounds.height / 2,
  };
}

/**
 * Create a vertical alignment guide
 */
function createVerticalGuide(
  x: number,
  minY: number,
  maxY: number,
  sourceId: string,
  targetId: string,
  label?: string
): AlignmentGuide {
  return {
    id: generateGuideId(),
    type: "vertical",
    position: x,
    start: { x, y: minY },
    end: { x, y: maxY },
    sourceId,
    targetId,
    label,
  };
}

/**
 * Create a horizontal alignment guide
 */
function createHorizontalGuide(
  y: number,
  minX: number,
  maxX: number,
  sourceId: string,
  targetId: string,
  label?: string
): AlignmentGuide {
  return {
    id: generateGuideId(),
    type: "horizontal",
    position: y,
    start: { x: minX, y },
    end: { x: maxX, y },
    sourceId,
    targetId,
    label,
  };
}

/**
 * Create a spacing guide
 */
function createSpacingGuide(
  type: "horizontal" | "vertical",
  position: number,
  start: Point,
  end: Point,
  spacing: number,
  sourceId: string,
  targetId: string
): AlignmentGuide {
  return {
    id: generateGuideId(),
    type: "spacing",
    position,
    start,
    end,
    sourceId,
    targetId,
    label: `${Math.round(spacing)}px`,
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for calculating and managing alignment guides
 */
export function useAlignment(): UseAlignmentReturn {
  // Stores
  const root = useCanvasStore((state) => state.root);
  const { setAlignmentGuides, clearAlignmentGuides, visualSettings } =
    useInteractionStore();

  // Cache for component bounds (would be populated by renderer)
  const boundsCache = useRef<Map<string, BoundingBox>>(new Map());

  /**
   * Get siblings of a component (other children of same parent)
   */
  const getSiblings = useCallback(
    (componentId: string): LayoutNode[] => {
      if (!root) return [];

      const parentResult = findParentNode(root, componentId);
      if (!parentResult) return [];

      const parent = parentResult.node;

      // Get all children except the target component
      if (parent.children) {
        return parent.children.filter((child) => child.id !== componentId);
      }

      return [];
    },
    [root]
  );

  /**
   * Get bounds for a component (from cache or calculate)
   * Note: In real usage, bounds would be measured from DOM or provided
   */
  const getComponentBounds = useCallback(
    (componentId: string): BoundingBox | null => {
      // Check cache first
      if (boundsCache.current.has(componentId)) {
        return boundsCache.current.get(componentId)!;
      }

      // In a real implementation, this would measure the DOM element
      // For now, return null and rely on external bounds being provided
      return null;
    },
    []
  );

  /**
   * Calculate edge alignments between current bounds and target bounds
   */
  const calculateEdgeAlignments = useCallback(
    (
      componentId: string,
      currentBounds: BoundingBox,
      targetBounds: BoundingBox,
      targetId: string,
      threshold: number,
      _guideColor: string
    ): AlignmentMatch[] => {
      const matches: AlignmentMatch[] = [];
      const currentEdges = getEdges(currentBounds);
      const targetEdges = getEdges(targetBounds);

      // Helper to get the full span for the guide
      const getVerticalSpan = () => ({
        minY: Math.min(currentBounds.y, targetBounds.y),
        maxY: Math.max(
          currentBounds.y + currentBounds.height,
          targetBounds.y + targetBounds.height
        ),
      });

      const getHorizontalSpan = () => ({
        minX: Math.min(currentBounds.x, targetBounds.x),
        maxX: Math.max(
          currentBounds.x + currentBounds.width,
          targetBounds.x + targetBounds.width
        ),
      });

      // Left edge alignment
      const leftDistance = Math.abs(currentEdges.left - targetEdges.left);
      if (leftDistance <= threshold) {
        const span = getVerticalSpan();
        matches.push({
          type: "left",
          snapPosition: targetEdges.left,
          distance: leftDistance,
          targetId,
          guide: createVerticalGuide(
            targetEdges.left,
            span.minY,
            span.maxY,
            componentId,
            targetId
          ),
        });
      }

      // Right edge alignment
      const rightDistance = Math.abs(currentEdges.right - targetEdges.right);
      if (rightDistance <= threshold) {
        const span = getVerticalSpan();
        matches.push({
          type: "right",
          snapPosition: targetEdges.right,
          distance: rightDistance,
          targetId,
          guide: createVerticalGuide(
            targetEdges.right,
            span.minY,
            span.maxY,
            componentId,
            targetId
          ),
        });
      }

      // Left to right alignment
      const leftToRightDistance = Math.abs(
        currentEdges.left - targetEdges.right
      );
      if (leftToRightDistance <= threshold) {
        const span = getVerticalSpan();
        matches.push({
          type: "left",
          snapPosition: targetEdges.right,
          distance: leftToRightDistance,
          targetId,
          guide: createVerticalGuide(
            targetEdges.right,
            span.minY,
            span.maxY,
            componentId,
            targetId
          ),
        });
      }

      // Right to left alignment
      const rightToLeftDistance = Math.abs(
        currentEdges.right - targetEdges.left
      );
      if (rightToLeftDistance <= threshold) {
        const span = getVerticalSpan();
        matches.push({
          type: "right",
          snapPosition: targetEdges.left,
          distance: rightToLeftDistance,
          targetId,
          guide: createVerticalGuide(
            targetEdges.left,
            span.minY,
            span.maxY,
            componentId,
            targetId
          ),
        });
      }

      // Top edge alignment
      const topDistance = Math.abs(currentEdges.top - targetEdges.top);
      if (topDistance <= threshold) {
        const span = getHorizontalSpan();
        matches.push({
          type: "top",
          snapPosition: targetEdges.top,
          distance: topDistance,
          targetId,
          guide: createHorizontalGuide(
            targetEdges.top,
            span.minX,
            span.maxX,
            componentId,
            targetId
          ),
        });
      }

      // Bottom edge alignment
      const bottomDistance = Math.abs(currentEdges.bottom - targetEdges.bottom);
      if (bottomDistance <= threshold) {
        const span = getHorizontalSpan();
        matches.push({
          type: "bottom",
          snapPosition: targetEdges.bottom,
          distance: bottomDistance,
          targetId,
          guide: createHorizontalGuide(
            targetEdges.bottom,
            span.minX,
            span.maxX,
            componentId,
            targetId
          ),
        });
      }

      // Top to bottom alignment
      const topToBottomDistance = Math.abs(
        currentEdges.top - targetEdges.bottom
      );
      if (topToBottomDistance <= threshold) {
        const span = getHorizontalSpan();
        matches.push({
          type: "top",
          snapPosition: targetEdges.bottom,
          distance: topToBottomDistance,
          targetId,
          guide: createHorizontalGuide(
            targetEdges.bottom,
            span.minX,
            span.maxX,
            componentId,
            targetId
          ),
        });
      }

      // Bottom to top alignment
      const bottomToTopDistance = Math.abs(
        currentEdges.bottom - targetEdges.top
      );
      if (bottomToTopDistance <= threshold) {
        const span = getHorizontalSpan();
        matches.push({
          type: "bottom",
          snapPosition: targetEdges.top,
          distance: bottomToTopDistance,
          targetId,
          guide: createHorizontalGuide(
            targetEdges.top,
            span.minX,
            span.maxX,
            componentId,
            targetId
          ),
        });
      }

      return matches;
    },
    []
  );

  /**
   * Calculate center alignments
   */
  const calculateCenterAlignments = useCallback(
    (
      componentId: string,
      currentBounds: BoundingBox,
      targetBounds: BoundingBox,
      targetId: string,
      threshold: number
    ): AlignmentMatch[] => {
      const matches: AlignmentMatch[] = [];
      const currentCenter = getCenter(currentBounds);
      const targetCenter = getCenter(targetBounds);

      // Horizontal center alignment (X axis)
      const centerXDistance = Math.abs(currentCenter.x - targetCenter.x);
      if (centerXDistance <= threshold) {
        const minY = Math.min(currentBounds.y, targetBounds.y);
        const maxY = Math.max(
          currentBounds.y + currentBounds.height,
          targetBounds.y + targetBounds.height
        );

        matches.push({
          type: "center-x",
          snapPosition: targetCenter.x,
          distance: centerXDistance,
          targetId,
          guide: createVerticalGuide(
            targetCenter.x,
            minY,
            maxY,
            componentId,
            targetId,
            "center"
          ),
        });
      }

      // Vertical center alignment (Y axis)
      const centerYDistance = Math.abs(currentCenter.y - targetCenter.y);
      if (centerYDistance <= threshold) {
        const minX = Math.min(currentBounds.x, targetBounds.x);
        const maxX = Math.max(
          currentBounds.x + currentBounds.width,
          targetBounds.x + targetBounds.width
        );

        matches.push({
          type: "center-y",
          snapPosition: targetCenter.y,
          distance: centerYDistance,
          targetId,
          guide: createHorizontalGuide(
            targetCenter.y,
            minX,
            maxX,
            componentId,
            targetId,
            "center"
          ),
        });
      }

      return matches;
    },
    []
  );

  /**
   * Detect equal spacing between components
   */
  const detectEqualSpacing = useCallback(
    (componentId: string, bounds: BoundingBox): SpacingMatch[] => {
      if (!root) return [];

      const siblings = getSiblings(componentId);
      if (siblings.length < 2) return [];

      const spacingMatches: SpacingMatch[] = [];

      // Get bounds for all siblings (this would come from DOM measurement in real usage)
      const siblingBounds: ComponentBounds[] = [];
      for (const sibling of siblings) {
        const sibBounds = getComponentBounds(sibling.id);
        if (sibBounds) {
          siblingBounds.push({ ...sibBounds, id: sibling.id });
        }
      }

      if (siblingBounds.length < 2) return [];

      // Sort siblings by position for horizontal spacing
      const sortedByX = [...siblingBounds].sort((a, b) => a.x - b.x);
      const sortedByY = [...siblingBounds].sort((a, b) => a.y - b.y);

      // Calculate horizontal spacings between consecutive siblings
      const horizontalSpacings: {
        spacing: number;
        between: [string, string];
      }[] = [];
      for (let i = 0; i < sortedByX.length - 1; i++) {
        const current = sortedByX[i];
        const next = sortedByX[i + 1];
        const spacing = next.x - (current.x + current.width);
        if (spacing > 0) {
          horizontalSpacings.push({
            spacing,
            between: [current.id, next.id],
          });
        }
      }

      // Check if current bounds create equal horizontal spacing
      const currentEdges = getEdges(bounds);
      for (const { spacing, between } of horizontalSpacings) {
        // Check spacing before first sibling
        const firstSibling = sortedByX[0];
        const spacingBefore = firstSibling.x - currentEdges.right;
        if (Math.abs(spacingBefore - spacing) <= 5) {
          spacingMatches.push({
            type: "horizontal",
            spacing,
            componentIds: [componentId, firstSibling.id, ...between],
            guide: createSpacingGuide(
              "horizontal",
              (currentEdges.right + firstSibling.x) / 2,
              { x: currentEdges.right, y: currentEdges.centerY },
              { x: firstSibling.x, y: getEdges(firstSibling).centerY },
              spacing,
              componentId,
              firstSibling.id
            ),
          });
        }

        // Check spacing after last sibling
        const lastSibling = sortedByX[sortedByX.length - 1];
        const lastEdges = getEdges(lastSibling);
        const spacingAfter = currentEdges.left - lastEdges.right;
        if (Math.abs(spacingAfter - spacing) <= 5) {
          spacingMatches.push({
            type: "horizontal",
            spacing,
            componentIds: [...between, lastSibling.id, componentId],
            guide: createSpacingGuide(
              "horizontal",
              (lastEdges.right + currentEdges.left) / 2,
              { x: lastEdges.right, y: lastEdges.centerY },
              { x: currentEdges.left, y: currentEdges.centerY },
              spacing,
              lastSibling.id,
              componentId
            ),
          });
        }
      }

      // Calculate vertical spacings between consecutive siblings
      const verticalSpacings: { spacing: number; between: [string, string] }[] =
        [];
      for (let i = 0; i < sortedByY.length - 1; i++) {
        const current = sortedByY[i];
        const next = sortedByY[i + 1];
        const spacing = next.y - (current.y + current.height);
        if (spacing > 0) {
          verticalSpacings.push({
            spacing,
            between: [current.id, next.id],
          });
        }
      }

      // Check if current bounds create equal vertical spacing
      for (const { spacing, between } of verticalSpacings) {
        // Check spacing before first sibling
        const firstSibling = sortedByY[0];
        const spacingBefore = firstSibling.y - currentEdges.bottom;
        if (Math.abs(spacingBefore - spacing) <= 5) {
          spacingMatches.push({
            type: "vertical",
            spacing,
            componentIds: [componentId, firstSibling.id, ...between],
            guide: createSpacingGuide(
              "vertical",
              (currentEdges.bottom + firstSibling.y) / 2,
              { x: currentEdges.centerX, y: currentEdges.bottom },
              { x: getEdges(firstSibling).centerX, y: firstSibling.y },
              spacing,
              componentId,
              firstSibling.id
            ),
          });
        }

        // Check spacing after last sibling
        const lastSibling = sortedByY[sortedByY.length - 1];
        const lastEdges = getEdges(lastSibling);
        const spacingAfter = currentEdges.top - lastEdges.bottom;
        if (Math.abs(spacingAfter - spacing) <= 5) {
          spacingMatches.push({
            type: "vertical",
            spacing,
            componentIds: [...between, lastSibling.id, componentId],
            guide: createSpacingGuide(
              "vertical",
              (lastEdges.bottom + currentEdges.top) / 2,
              { x: lastEdges.centerX, y: lastEdges.bottom },
              { x: currentEdges.centerX, y: currentEdges.top },
              spacing,
              lastSibling.id,
              componentId
            ),
          });
        }
      }

      return spacingMatches;
    },
    [root, getSiblings, getComponentBounds]
  );

  /**
   * Main alignment calculation function
   */
  const calculateAlignment = useCallback(
    (
      componentId: string,
      currentBounds: BoundingBox,
      options?: AlignmentOptions
    ): AlignmentResult => {
      const opts = { ...DEFAULT_OPTIONS, ...options };
      const matches: AlignmentMatch[] = [];
      const spacingMatches: SpacingMatch[] = [];
      const guides: AlignmentGuide[] = [];

      if (!root || !visualSettings.showAlignmentGuides) {
        return {
          matches: [],
          spacingMatches: [],
          suggestedPosition: null,
          suggestedSize: null,
          guides: [],
        };
      }

      // Get siblings to check alignment against
      const siblings = getSiblings(componentId);

      // Check alignment with each sibling
      for (const sibling of siblings) {
        const siblingBounds = getComponentBounds(sibling.id);
        if (!siblingBounds) continue;

        // Edge alignments
        if (opts.checkEdges) {
          const edgeMatches = calculateEdgeAlignments(
            componentId,
            currentBounds,
            siblingBounds,
            sibling.id,
            opts.threshold,
            opts.guideColor
          );
          matches.push(...edgeMatches);
        }

        // Center alignments
        if (opts.checkCenters) {
          const centerMatches = calculateCenterAlignments(
            componentId,
            currentBounds,
            siblingBounds,
            sibling.id,
            opts.threshold
          );
          matches.push(...centerMatches);
        }
      }

      // Check parent alignment if enabled
      if (opts.includeParent) {
        const parentResult = findParentNode(root, componentId);
        if (parentResult) {
          const parentBounds = getComponentBounds(parentResult.node.id);
          if (parentBounds) {
            // Check alignment with parent edges
            if (opts.checkEdges) {
              const parentEdgeMatches = calculateEdgeAlignments(
                componentId,
                currentBounds,
                parentBounds,
                parentResult.node.id,
                opts.threshold,
                opts.guideColor
              );
              matches.push(...parentEdgeMatches);
            }

            // Check center alignment with parent
            if (opts.checkCenters) {
              const parentCenterMatches = calculateCenterAlignments(
                componentId,
                currentBounds,
                parentBounds,
                parentResult.node.id,
                opts.threshold
              );
              matches.push(...parentCenterMatches);
            }
          }
        }
      }

      // Detect equal spacing
      if (opts.checkSpacing) {
        const spacing = detectEqualSpacing(componentId, currentBounds);
        spacingMatches.push(...spacing);
      }

      // Sort matches by distance (closest first)
      matches.sort((a, b) => a.distance - b.distance);

      // Collect unique guides (limit to maxGuides)
      const seenGuidePositions = new Set<string>();
      for (const match of matches) {
        const key = `${match.guide.type}-${match.guide.position}`;
        if (!seenGuidePositions.has(key) && guides.length < opts.maxGuides) {
          seenGuidePositions.add(key);
          guides.push(match.guide);
        }
      }

      // Add spacing guides
      for (const spacing of spacingMatches) {
        if (guides.length < opts.maxGuides) {
          guides.push(spacing.guide);
        }
      }

      // Calculate suggested snap position
      let suggestedPosition: Point | null = null;
      const xMatches = matches.filter(
        (m) => m.type === "left" || m.type === "center-x"
      );
      const yMatches = matches.filter(
        (m) => m.type === "top" || m.type === "center-y"
      );

      if (xMatches.length > 0 || yMatches.length > 0) {
        suggestedPosition = {
          x:
            xMatches.length > 0
              ? xMatches[0].type === "left"
                ? xMatches[0].snapPosition
                : xMatches[0].snapPosition - currentBounds.width / 2
              : currentBounds.x,
          y:
            yMatches.length > 0
              ? yMatches[0].type === "top"
                ? yMatches[0].snapPosition
                : yMatches[0].snapPosition - currentBounds.height / 2
              : currentBounds.y,
        };
      }

      return {
        matches,
        spacingMatches,
        suggestedPosition,
        suggestedSize: null,
        guides,
      };
    },
    [
      root,
      visualSettings.showAlignmentGuides,
      getSiblings,
      getComponentBounds,
      calculateEdgeAlignments,
      calculateCenterAlignments,
      detectEqualSpacing,
    ]
  );

  /**
   * Get snap position for a component being moved
   */
  const getSnapPosition = useCallback(
    (
      componentId: string,
      position: Point,
      size: { width: number; height: number },
      options?: AlignmentOptions
    ): Point => {
      const bounds: BoundingBox = {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
      };

      const result = calculateAlignment(componentId, bounds, options);

      if (result.suggestedPosition) {
        return result.suggestedPosition;
      }

      return position;
    },
    [calculateAlignment]
  );

  /**
   * Get snap size for resize operation
   */
  const getSnapSize = useCallback(
    (
      componentId: string,
      bounds: BoundingBox,
      resizeHandle: "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw",
      options?: AlignmentOptions
    ): { size: { width: number; height: number }; position: Point } => {
      const opts = { ...DEFAULT_OPTIONS, ...options };
      const result = calculateAlignment(componentId, bounds, opts);

      let newWidth = bounds.width;
      let newHeight = bounds.height;
      let newX = bounds.x;
      let newY = bounds.y;

      // Find the closest alignment match for the resize edge
      for (const match of result.matches) {
        switch (resizeHandle) {
          case "e":
          case "ne":
          case "se":
            if (match.type === "right") {
              const rightEdge = bounds.x + bounds.width;
              const diff = match.snapPosition - rightEdge;
              if (Math.abs(diff) <= opts.threshold) {
                newWidth = bounds.width + diff;
              }
            }
            break;
          case "w":
          case "nw":
          case "sw":
            if (match.type === "left") {
              const diff = bounds.x - match.snapPosition;
              if (Math.abs(diff) <= opts.threshold) {
                newX = match.snapPosition;
                newWidth = bounds.width + diff;
              }
            }
            break;
          case "s":
            if (match.type === "bottom") {
              const bottomEdge = bounds.y + bounds.height;
              const diff = match.snapPosition - bottomEdge;
              if (Math.abs(diff) <= opts.threshold) {
                newHeight = bounds.height + diff;
              }
            }
            break;
          case "n":
            if (match.type === "top") {
              const diff = bounds.y - match.snapPosition;
              if (Math.abs(diff) <= opts.threshold) {
                newY = match.snapPosition;
                newHeight = bounds.height + diff;
              }
            }
            break;
        }
      }

      return {
        size: { width: newWidth, height: newHeight },
        position: { x: newX, y: newY },
      };
    },
    [calculateAlignment]
  );

  /**
   * Set alignment guides in the store
   */
  const setGuides = useCallback(
    (guides: AlignmentGuide[]) => {
      setAlignmentGuides(guides);
    },
    [setAlignmentGuides]
  );

  /**
   * Clear alignment guides
   */
  const clearGuides = useCallback(() => {
    clearAlignmentGuides();
  }, [clearAlignmentGuides]);

  /**
   * Update bounds cache (to be called by renderers)
   */
  const updateBoundsCache = useCallback(
    (componentId: string, bounds: BoundingBox) => {
      boundsCache.current.set(componentId, bounds);
    },
    []
  );

  return {
    calculateAlignment,
    getSnapPosition,
    getSnapSize,
    setGuides,
    clearGuides,
    getSiblings,
    detectEqualSpacing,
    updateBoundsCache,
  };
}

// ============================================================================
// Selector Hooks for Performance
// ============================================================================

/**
 * Hook to get current alignment guides from store
 */
export function useAlignmentGuidesFromStore(): AlignmentGuide[] {
  return useInteractionStore((state) => state.alignmentGuides);
}

/**
 * Hook to check if alignment guides are enabled
 */
export function useAlignmentGuidesEnabled(): boolean {
  return useInteractionStore(
    (state) => state.visualSettings.showAlignmentGuides
  );
}

/**
 * Hook to get alignment threshold from settings
 */
export function useAlignmentThreshold(): number {
  return useInteractionStore((state) => state.visualSettings.snapTolerance);
}

export default useAlignment;

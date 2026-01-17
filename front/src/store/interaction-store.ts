/**
 * Interaction Store
 * Manages resize, rotation, and translation interaction states
 *
 * Features:
 * - Track resize interaction state (8-point resize handles)
 * - Track rotation interaction state
 * - Track translation interaction state
 * - Visual settings for alignment guides
 * - Actions for starting/updating/ending interactions
 * - Constraint enforcement
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Point, Size } from "@/types/canvas";

// ============================================================================
// Types
// ============================================================================

/**
 * Handle position for resize operations
 * Represents the 8 resize handles around a component
 *
 * Layout:
 * ┌─────┬─────┬─────┐
 * │ nw  │  n  │ ne  │
 * ├─────┼─────┼─────┤
 * │  w  │     │  e  │
 * ├─────┼─────┼─────┤
 * │ sw  │  s  │ se  │
 * └─────┴─────┴─────┘
 */
export type ResizeHandle =
  | "n" // North (top edge)
  | "ne" // Northeast (top-right corner)
  | "e" // East (right edge)
  | "se" // Southeast (bottom-right corner)
  | "s" // South (bottom edge)
  | "sw" // Southwest (bottom-left corner)
  | "w" // West (left edge)
  | "nw"; // Northwest (top-left corner)

/**
 * Direction constraints for resize operations
 */
export type ResizeDirection = "horizontal" | "vertical" | "both";

/**
 * Resize constraints for a component
 */
export interface ResizeConstraints {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  maintainAspectRatio?: boolean;
  aspectRatio?: number; // width / height
}

/**
 * Resize interaction state
 */
export interface ResizeState {
  /** Component being resized */
  componentId: string;
  /** Which handle is being dragged */
  handle: ResizeHandle;
  /** Starting mouse/touch position */
  startPosition: Point;
  /** Original component size before resize */
  originalSize: Size;
  /** Original component position (for corner/edge calculations) */
  originalPosition: Point;
  /** Current size during resize */
  currentSize: Size;
  /** Constraints for this resize operation */
  constraints: ResizeConstraints;
  /** Whether Shift is held for aspect ratio lock */
  lockAspectRatio: boolean;
  /** Whether Ctrl/Cmd is held for snap mode */
  snapToIncrement: boolean;
  /** Snap increment in pixels (default 10) */
  snapIncrement: number;
  /** Whether Alt is held to ignore constraints (preview mode) */
  ignoreConstraints: boolean;
}

/**
 * Rotation interaction state
 */
export interface RotationState {
  /** Component being rotated */
  componentId: string;
  /** Starting mouse/touch position */
  startPosition: Point;
  /** Original rotation angle in degrees */
  originalAngle: number;
  /** Current angle during rotation */
  currentAngle: number;
  /** Center point for rotation calculations */
  centerPoint: Point;
  /** Whether to snap to angle increments */
  snapToAngle: boolean;
  /** Snap increment in degrees (default 15) */
  snapIncrement: number;
}

/**
 * Translation (move) interaction state
 */
export interface TranslationState {
  /** Component being translated */
  componentId: string;
  /** Starting mouse/touch position */
  startPosition: Point;
  /** Original offset values */
  originalOffset: Point;
  /** Current offset during translation */
  currentOffset: Point;
  /** Whether to snap to grid */
  snapToGrid: boolean;
  /** Snap increment in pixels */
  snapIncrement: number;
}

/**
 * Alignment guide for visual feedback
 */
export interface AlignmentGuide {
  /** Unique identifier */
  id: string;
  /** Type of guide */
  type: "horizontal" | "vertical" | "spacing";
  /** Position (x for vertical, y for horizontal) */
  position: number;
  /** Start and end points for rendering */
  start: Point;
  end: Point;
  /** Label to display (e.g., "100px" for spacing) */
  label?: string;
  /** Source component ID */
  sourceId?: string;
  /** Target component ID */
  targetId?: string;
}

/**
 * Visual settings for interactions
 */
export interface InteractionVisualSettings {
  /** Show alignment guides during resize/move */
  showAlignmentGuides: boolean;
  /** Show center guides when aligned */
  showCenterGuides: boolean;
  /** Show spacing guides between components */
  showSpacingGuides: boolean;
  /** Show dimension tooltip during resize */
  showDimensionTooltip: boolean;
  /** Tolerance for snapping to guides in pixels */
  snapTolerance: number;
  /** Highlight color for guides */
  guideColor: string;
}

/**
 * Interaction types for tracking active interaction
 */
export type InteractionType =
  | "resize"
  | "multi-resize"
  | "rotation"
  | "translation"
  | "padding"
  | "spacing"
  | "column-resize"
  | null;

/**
 * Component resize info for multi-component proportional resize
 */
export interface MultiResizeComponentInfo {
  /** Component ID */
  componentId: string;
  /** Original size before resize */
  originalSize: Size;
  /** Original position relative to the multi-selection bounding box */
  originalRelativePosition: Point;
  /** Current size during resize */
  currentSize: Size;
  /** Current position during resize */
  currentPosition: Point;
}

/**
 * Multi-component proportional resize state
 */
export interface MultiResizeState {
  /** All components being resized */
  components: MultiResizeComponentInfo[];
  /** Which handle is being dragged */
  handle: ResizeHandle;
  /** Starting mouse/touch position */
  startPosition: Point;
  /** Original bounding box of all selected components */
  originalBoundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Current bounding box during resize */
  currentBoundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Scale factors for proportional resize */
  scaleFactor: {
    x: number;
    y: number;
  };
  /** Whether Shift is held for aspect ratio lock */
  lockAspectRatio: boolean;
  /** Whether Ctrl/Cmd is held for snap mode */
  snapToIncrement: boolean;
  /** Snap increment in pixels (default 10) */
  snapIncrement: number;
  /** Global constraints */
  constraints: ResizeConstraints;
  /** Whether Alt is held to ignore constraints (preview mode) */
  ignoreConstraints: boolean;
}

/**
 * Padding adjustment state
 */
export interface PaddingAdjustState {
  /** Component being adjusted */
  componentId: string;
  /** Which side is being adjusted */
  side: "top" | "right" | "bottom" | "left" | "all";
  /** Starting mouse position */
  startPosition: Point;
  /** Original padding values */
  originalPadding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** Current padding values during adjustment */
  currentPadding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** Whether to adjust all sides uniformly */
  uniform: boolean;
}

/**
 * Spacing adjustment state (for Column/Row gap)
 */
export interface SpacingAdjustState {
  /** Container component ID */
  componentId: string;
  /** Index of the gap being adjusted (between children) */
  gapIndex: number;
  /** Starting mouse position */
  startPosition: Point;
  /** Original spacing value */
  originalSpacing: number;
  /** Current spacing during adjustment */
  currentSpacing: number;
  /** Direction of adjustment (Column = vertical, Row = horizontal) */
  direction: "vertical" | "horizontal";
}

/**
 * Table column resize state
 */
export interface TableColumnResizeState {
  /** Table component ID */
  componentId: string;
  /** Index of the column divider being dragged (0 = between col 0 and 1) */
  columnIndex: number;
  /** Starting mouse X position */
  startPosition: Point;
  /** Original column widths (all columns) */
  originalColumns: Array<{ type: "relative" | "constant"; value: number }>;
  /** Current column widths during resize */
  currentColumns: Array<{ type: "relative" | "constant"; value: number }>;
  /** Total available width for relative calculations */
  totalWidth: number;
  /** Minimum column width in points (default: 20) */
  minColumnWidth: number;
  /** Whether to snap to grid increments */
  snapToGrid: boolean;
  /** Snap increment in points (default: 5) */
  snapIncrement: number;
}

// ============================================================================
// State Interface
// ============================================================================

/**
 * Interaction store state and actions
 */
interface InteractionState {
  // ========================================
  // State
  // ========================================

  /** Current active interaction type */
  activeInteraction: InteractionType;

  /** Resize interaction state (null when not resizing) */
  resize: ResizeState | null;

  /** Rotation interaction state (null when not rotating) */
  rotation: RotationState | null;

  /** Translation interaction state (null when not translating) */
  translation: TranslationState | null;

  /** Padding adjustment state (null when not adjusting) */
  paddingAdjust: PaddingAdjustState | null;

  /** Spacing adjustment state (null when not adjusting) */
  spacingAdjust: SpacingAdjustState | null;

  /** Table column resize state (null when not resizing columns) */
  columnResize: TableColumnResizeState | null;

  /** Multi-component proportional resize state (null when not resizing multiple) */
  multiResize: MultiResizeState | null;

  /** Active alignment guides */
  alignmentGuides: AlignmentGuide[];

  /** Visual settings for interactions */
  visualSettings: InteractionVisualSettings;

  // ========================================
  // Resize Actions
  // ========================================

  /**
   * Start a resize interaction
   * @param componentId - ID of the component being resized
   * @param handle - Which resize handle is being dragged
   * @param startPosition - Initial mouse/touch position
   * @param originalSize - Component's size before resize
   * @param originalPosition - Component's position before resize
   * @param constraints - Resize constraints
   */
  startResize: (
    componentId: string,
    handle: ResizeHandle,
    startPosition: Point,
    originalSize: Size,
    originalPosition: Point,
    constraints?: ResizeConstraints
  ) => void;

  /**
   * Update resize during drag
   * @param currentPosition - Current mouse/touch position
   * @param modifiers - Keyboard modifiers (shift, ctrl/cmd, alt)
   */
  updateResize: (
    currentPosition: Point,
    modifiers?: { shift?: boolean; ctrl?: boolean; alt?: boolean }
  ) => void;

  /**
   * End resize interaction
   * @returns Final size or null if cancelled
   */
  endResize: () => Size | null;

  /**
   * Cancel resize and restore original size
   */
  cancelResize: () => void;

  // ========================================
  // Multi-Resize Actions (Proportional)
  // ========================================

  /**
   * Start a multi-component proportional resize interaction
   * @param components - Array of component info with IDs, sizes, and positions
   * @param handle - Which resize handle is being dragged
   * @param startPosition - Initial mouse/touch position
   * @param boundingBox - Combined bounding box of all selected components
   * @param constraints - Global resize constraints
   */
  startMultiResize: (
    components: Array<{
      componentId: string;
      size: Size;
      position: Point;
    }>,
    handle: ResizeHandle,
    startPosition: Point,
    boundingBox: { x: number; y: number; width: number; height: number },
    constraints?: ResizeConstraints
  ) => void;

  /**
   * Update multi-resize during drag
   * @param currentPosition - Current mouse/touch position
   * @param modifiers - Keyboard modifiers (shift, ctrl/cmd, alt)
   */
  updateMultiResize: (
    currentPosition: Point,
    modifiers?: { shift?: boolean; ctrl?: boolean; alt?: boolean }
  ) => void;

  /**
   * End multi-resize interaction
   * @returns Final component sizes and positions or null if cancelled
   */
  endMultiResize: () => MultiResizeComponentInfo[] | null;

  /**
   * Cancel multi-resize and restore original sizes
   */
  cancelMultiResize: () => void;

  // ========================================
  // Rotation Actions
  // ========================================

  /**
   * Start a rotation interaction
   * @param componentId - ID of the component being rotated
   * @param startPosition - Initial mouse/touch position
   * @param centerPoint - Center of rotation
   * @param originalAngle - Starting angle in degrees
   */
  startRotation: (
    componentId: string,
    startPosition: Point,
    centerPoint: Point,
    originalAngle: number
  ) => void;

  /**
   * Update rotation during drag
   * @param currentPosition - Current mouse/touch position
   * @param modifiers - Keyboard modifiers
   */
  updateRotation: (
    currentPosition: Point,
    modifiers?: { shift?: boolean }
  ) => void;

  /**
   * End rotation interaction
   * @returns Final angle or null if cancelled
   */
  endRotation: () => number | null;

  /**
   * Cancel rotation and restore original angle
   */
  cancelRotation: () => void;

  // ========================================
  // Translation Actions
  // ========================================

  /**
   * Start a translation interaction
   * @param componentId - ID of the component being translated
   * @param startPosition - Initial mouse/touch position
   * @param originalOffset - Original translation offset
   */
  startTranslation: (
    componentId: string,
    startPosition: Point,
    originalOffset: Point
  ) => void;

  /**
   * Update translation during drag
   * @param currentPosition - Current mouse/touch position
   * @param modifiers - Keyboard modifiers
   */
  updateTranslation: (
    currentPosition: Point,
    modifiers?: { shift?: boolean; ctrl?: boolean }
  ) => void;

  /**
   * End translation interaction
   * @returns Final offset or null if cancelled
   */
  endTranslation: () => Point | null;

  /**
   * Cancel translation and restore original offset
   */
  cancelTranslation: () => void;

  // ========================================
  // Padding/Spacing Actions
  // ========================================

  /**
   * Start padding adjustment
   */
  startPaddingAdjust: (
    componentId: string,
    side: PaddingAdjustState["side"],
    startPosition: Point,
    originalPadding: PaddingAdjustState["originalPadding"],
    uniform?: boolean
  ) => void;

  /**
   * Update padding during adjustment
   */
  updatePaddingAdjust: (currentPosition: Point) => void;

  /**
   * End padding adjustment
   */
  endPaddingAdjust: () => PaddingAdjustState["currentPadding"] | null;

  /**
   * Cancel padding adjustment
   */
  cancelPaddingAdjust: () => void;

  /**
   * Start spacing adjustment
   * @param componentId - Container component ID
   * @param gapIndex - Index of the gap between children
   * @param startPosition - Initial mouse position
   * @param originalSpacing - Original spacing value in points
   * @param direction - Direction of container (Column = vertical, Row = horizontal)
   */
  startSpacingAdjust: (
    componentId: string,
    gapIndex: number,
    startPosition: Point,
    originalSpacing: number,
    direction: "vertical" | "horizontal"
  ) => void;

  /**
   * Update spacing during adjustment
   */
  updateSpacingAdjust: (currentPosition: Point) => void;

  /**
   * End spacing adjustment
   */
  endSpacingAdjust: () => number | null;

  /**
   * Cancel spacing adjustment
   */
  cancelSpacingAdjust: () => void;

  // ========================================
  // Table Column Resize Actions
  // ========================================

  /**
   * Start table column resize
   * @param componentId - Table component ID
   * @param columnIndex - Index of the column divider (0 = between col 0 and 1)
   * @param startPosition - Initial mouse position
   * @param originalColumns - Original column definitions
   * @param totalWidth - Total table width for relative calculations
   * @param minColumnWidth - Minimum column width (default: 20)
   */
  startColumnResize: (
    componentId: string,
    columnIndex: number,
    startPosition: Point,
    originalColumns: Array<{ type: "relative" | "constant"; value: number }>,
    totalWidth: number,
    minColumnWidth?: number
  ) => void;

  /**
   * Update column resize during drag
   * @param currentPosition - Current mouse position
   * @param modifiers - Keyboard modifiers (ctrl for snap)
   */
  updateColumnResize: (
    currentPosition: Point,
    modifiers?: { ctrl?: boolean }
  ) => void;

  /**
   * End column resize
   * @returns Final column definitions or null if cancelled
   */
  endColumnResize: () => Array<{
    type: "relative" | "constant";
    value: number;
  }> | null;

  /**
   * Cancel column resize
   */
  cancelColumnResize: () => void;

  /**
   * Auto-size column to fit content (called on double-click)
   * @param componentId - Table component ID
   * @param columnIndex - Column index to auto-size
   * @param contentWidth - Calculated content width
   */
  autoSizeColumn: (
    componentId: string,
    columnIndex: number,
    contentWidth: number
  ) => void;

  // ========================================
  // Alignment Guide Actions
  // ========================================

  /**
   * Set alignment guides for current interaction
   * @param guides - Array of alignment guides to display
   */
  setAlignmentGuides: (guides: AlignmentGuide[]) => void;

  /**
   * Clear all alignment guides
   */
  clearAlignmentGuides: () => void;

  /**
   * Add an alignment guide
   * @param guide - Guide to add
   */
  addAlignmentGuide: (guide: AlignmentGuide) => void;

  /**
   * Remove an alignment guide
   * @param id - ID of guide to remove
   */
  removeAlignmentGuide: (id: string) => void;

  // ========================================
  // Visual Settings Actions
  // ========================================

  /**
   * Update visual settings
   * @param updates - Partial settings to update
   */
  updateVisualSettings: (updates: Partial<InteractionVisualSettings>) => void;

  /**
   * Toggle alignment guides visibility
   */
  toggleAlignmentGuides: () => void;

  /**
   * Toggle dimension tooltip visibility
   */
  toggleDimensionTooltip: () => void;

  // ========================================
  // Utility Actions
  // ========================================

  /**
   * Check if any interaction is active
   */
  isInteracting: () => boolean;

  /**
   * Get the component ID currently being interacted with
   */
  getInteractingComponentId: () => string | null;

  /**
   * Cancel any active interaction
   */
  cancelInteraction: () => void;

  /**
   * Reset all interaction state
   */
  reset: () => void;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default visual settings
 */
export const DEFAULT_VISUAL_SETTINGS: InteractionVisualSettings = {
  showAlignmentGuides: true,
  showCenterGuides: true,
  showSpacingGuides: true,
  showDimensionTooltip: true,
  snapTolerance: 5,
  guideColor: "#ef4444", // Tailwind red-500
};

/**
 * Default resize constraints
 */
export const DEFAULT_RESIZE_CONSTRAINTS: ResizeConstraints = {
  minWidth: 10,
  maxWidth: 10000,
  minHeight: 10,
  maxHeight: 10000,
  maintainAspectRatio: false,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate new size from resize handle drag
 */
function calculateResizeSize(
  handle: ResizeHandle,
  startPosition: Point,
  currentPosition: Point,
  originalSize: Size,
  constraints: ResizeConstraints,
  lockAspectRatio: boolean,
  snapToIncrement: boolean,
  snapIncrement: number,
  ignoreConstraints: boolean = false
): Size {
  const deltaX = currentPosition.x - startPosition.x;
  const deltaY = currentPosition.y - startPosition.y;

  let newWidth = originalSize.width;
  let newHeight = originalSize.height;

  // Calculate size changes based on handle position
  switch (handle) {
    case "e":
      newWidth = originalSize.width + deltaX;
      break;
    case "w":
      newWidth = originalSize.width - deltaX;
      break;
    case "s":
      newHeight = originalSize.height + deltaY;
      break;
    case "n":
      newHeight = originalSize.height - deltaY;
      break;
    case "se":
      newWidth = originalSize.width + deltaX;
      newHeight = originalSize.height + deltaY;
      break;
    case "sw":
      newWidth = originalSize.width - deltaX;
      newHeight = originalSize.height + deltaY;
      break;
    case "ne":
      newWidth = originalSize.width + deltaX;
      newHeight = originalSize.height - deltaY;
      break;
    case "nw":
      newWidth = originalSize.width - deltaX;
      newHeight = originalSize.height - deltaY;
      break;
  }

  // Apply snap to increment if enabled
  if (snapToIncrement) {
    newWidth = Math.round(newWidth / snapIncrement) * snapIncrement;
    newHeight = Math.round(newHeight / snapIncrement) * snapIncrement;
  }

  // Apply aspect ratio lock if enabled
  if (lockAspectRatio && constraints.aspectRatio) {
    const aspectRatio = constraints.aspectRatio;
    // Determine which dimension to adjust based on handle
    if (handle === "n" || handle === "s") {
      newWidth = newHeight * aspectRatio;
    } else if (handle === "e" || handle === "w") {
      newHeight = newWidth / aspectRatio;
    } else {
      // Corner handles - use the larger change
      const widthChange = Math.abs(newWidth - originalSize.width);
      const heightChange = Math.abs(newHeight - originalSize.height);
      if (widthChange > heightChange) {
        newHeight = newWidth / aspectRatio;
      } else {
        newWidth = newHeight * aspectRatio;
      }
    }
  }

  // Apply constraints (unless ignoring for preview mode)
  if (!ignoreConstraints) {
    newWidth = Math.max(
      constraints.minWidth ?? 0,
      Math.min(constraints.maxWidth ?? Infinity, newWidth)
    );
    newHeight = Math.max(
      constraints.minHeight ?? 0,
      Math.min(constraints.maxHeight ?? Infinity, newHeight)
    );
  } else {
    // Even in preview mode, enforce minimum reasonable size (prevent negative/zero)
    newWidth = Math.max(1, newWidth);
    newHeight = Math.max(1, newHeight);
  }

  return { width: newWidth, height: newHeight };
}

/**
 * Calculate rotation angle from drag
 */
function calculateRotationAngle(
  startPosition: Point,
  currentPosition: Point,
  centerPoint: Point,
  originalAngle: number,
  snapToAngle: boolean,
  snapIncrement: number
): number {
  // Calculate angles from center to start and current positions
  const startAngle = Math.atan2(
    startPosition.y - centerPoint.y,
    startPosition.x - centerPoint.x
  );
  const currentAngle = Math.atan2(
    currentPosition.y - centerPoint.y,
    currentPosition.x - centerPoint.x
  );

  // Calculate delta in degrees
  const deltaAngle = ((currentAngle - startAngle) * 180) / Math.PI;
  let newAngle = originalAngle + deltaAngle;

  // Normalize to 0-360 range
  newAngle = ((newAngle % 360) + 360) % 360;

  // Apply snap if enabled
  if (snapToAngle) {
    newAngle = Math.round(newAngle / snapIncrement) * snapIncrement;
  }

  return newAngle;
}

/**
 * Calculate translation offset from drag
 */
function calculateTranslationOffset(
  startPosition: Point,
  currentPosition: Point,
  originalOffset: Point,
  snapToGrid: boolean,
  snapIncrement: number,
  constrainAxis?: "x" | "y"
): Point {
  let deltaX = currentPosition.x - startPosition.x;
  let deltaY = currentPosition.y - startPosition.y;

  // Constrain to single axis if shift is held
  if (constrainAxis === "x") {
    deltaY = 0;
  } else if (constrainAxis === "y") {
    deltaX = 0;
  }

  let newX = originalOffset.x + deltaX;
  let newY = originalOffset.y + deltaY;

  // Apply snap if enabled
  if (snapToGrid) {
    newX = Math.round(newX / snapIncrement) * snapIncrement;
    newY = Math.round(newY / snapIncrement) * snapIncrement;
  }

  return { x: newX, y: newY };
}

/**
 * Calculate padding from drag
 */
function calculatePadding(
  side: PaddingAdjustState["side"],
  startPosition: Point,
  currentPosition: Point,
  originalPadding: PaddingAdjustState["originalPadding"],
  uniform: boolean
): PaddingAdjustState["currentPadding"] {
  const deltaX = currentPosition.x - startPosition.x;
  const deltaY = currentPosition.y - startPosition.y;

  const newPadding = { ...originalPadding };
  const minPadding = 0;
  const maxPadding = 200;

  const clamp = (value: number) =>
    Math.max(minPadding, Math.min(maxPadding, value));

  if (uniform || side === "all") {
    // Use the larger delta for uniform adjustment
    const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    const change = Math.round(delta);
    newPadding.top = clamp(originalPadding.top + change);
    newPadding.right = clamp(originalPadding.right + change);
    newPadding.bottom = clamp(originalPadding.bottom + change);
    newPadding.left = clamp(originalPadding.left + change);
  } else {
    switch (side) {
      case "top":
        newPadding.top = clamp(originalPadding.top - deltaY);
        break;
      case "bottom":
        newPadding.bottom = clamp(originalPadding.bottom + deltaY);
        break;
      case "left":
        newPadding.left = clamp(originalPadding.left - deltaX);
        break;
      case "right":
        newPadding.right = clamp(originalPadding.right + deltaX);
        break;
    }
  }

  return newPadding;
}

// ============================================================================
// Store
// ============================================================================

/**
 * Interaction store for managing resize, rotation, and translation states
 */
export const useInteractionStore = create<InteractionState>()(
  subscribeWithSelector((set, get) => ({
    // ========================================
    // Initial State
    // ========================================

    activeInteraction: null,
    resize: null,
    rotation: null,
    translation: null,
    paddingAdjust: null,
    spacingAdjust: null,
    columnResize: null,
    multiResize: null,
    alignmentGuides: [],
    visualSettings: DEFAULT_VISUAL_SETTINGS,

    // ========================================
    // Resize Actions
    // ========================================

    startResize: (
      componentId,
      handle,
      startPosition,
      originalSize,
      originalPosition,
      constraints = DEFAULT_RESIZE_CONSTRAINTS
    ) => {
      set({
        activeInteraction: "resize",
        resize: {
          componentId,
          handle,
          startPosition,
          originalSize,
          originalPosition,
          currentSize: { ...originalSize },
          constraints: {
            ...DEFAULT_RESIZE_CONSTRAINTS,
            ...constraints,
            aspectRatio:
              constraints.aspectRatio ??
              originalSize.width / originalSize.height,
          },
          lockAspectRatio: constraints.maintainAspectRatio ?? false,
          snapToIncrement: false,
          snapIncrement: 10,
          ignoreConstraints: false,
        },
        alignmentGuides: [],
      });
    },

    updateResize: (currentPosition, modifiers = {}) => {
      const { resize } = get();
      if (!resize) return;

      const lockAspectRatio = modifiers.shift ?? resize.lockAspectRatio;
      const snapToIncrement = modifiers.ctrl ?? resize.snapToIncrement;
      const ignoreConstraints = modifiers.alt ?? resize.ignoreConstraints;

      const newSize = calculateResizeSize(
        resize.handle,
        resize.startPosition,
        currentPosition,
        resize.originalSize,
        resize.constraints,
        lockAspectRatio,
        snapToIncrement,
        resize.snapIncrement,
        ignoreConstraints
      );

      set({
        resize: {
          ...resize,
          currentSize: newSize,
          lockAspectRatio,
          snapToIncrement,
          ignoreConstraints,
        },
      });
    },

    endResize: () => {
      const { resize } = get();
      if (!resize) return null;

      const finalSize = { ...resize.currentSize };
      set({
        activeInteraction: null,
        resize: null,
        alignmentGuides: [],
      });

      return finalSize;
    },

    cancelResize: () => {
      set({
        activeInteraction: null,
        resize: null,
        alignmentGuides: [],
      });
    },

    // ========================================
    // Multi-Resize Actions (Proportional)
    // ========================================

    startMultiResize: (
      components,
      handle,
      startPosition,
      boundingBox,
      constraints = DEFAULT_RESIZE_CONSTRAINTS
    ) => {
      // Calculate relative positions within the bounding box
      const componentInfos: MultiResizeComponentInfo[] = components.map(
        (comp) => ({
          componentId: comp.componentId,
          originalSize: { ...comp.size },
          originalRelativePosition: {
            x: comp.position.x - boundingBox.x,
            y: comp.position.y - boundingBox.y,
          },
          currentSize: { ...comp.size },
          currentPosition: { ...comp.position },
        })
      );

      set({
        activeInteraction: "multi-resize",
        multiResize: {
          components: componentInfos,
          handle,
          startPosition,
          originalBoundingBox: { ...boundingBox },
          currentBoundingBox: { ...boundingBox },
          scaleFactor: { x: 1, y: 1 },
          lockAspectRatio: constraints.maintainAspectRatio ?? false,
          snapToIncrement: false,
          snapIncrement: 10,
          constraints: {
            ...DEFAULT_RESIZE_CONSTRAINTS,
            ...constraints,
          },
          ignoreConstraints: false,
        },
        alignmentGuides: [],
      });
    },

    updateMultiResize: (currentPosition, modifiers = {}) => {
      const { multiResize } = get();
      if (!multiResize) return;

      const lockAspectRatio = modifiers.shift ?? multiResize.lockAspectRatio;
      const snapToIncrement = modifiers.ctrl ?? multiResize.snapToIncrement;
      const ignoreConstraints = modifiers.alt ?? multiResize.ignoreConstraints;

      // Calculate new bounding box size
      const newBoundingBoxSize = calculateResizeSize(
        multiResize.handle,
        multiResize.startPosition,
        currentPosition,
        {
          width: multiResize.originalBoundingBox.width,
          height: multiResize.originalBoundingBox.height,
        },
        multiResize.constraints,
        lockAspectRatio,
        snapToIncrement,
        multiResize.snapIncrement,
        ignoreConstraints
      );

      // Calculate scale factors
      const scaleX =
        newBoundingBoxSize.width / multiResize.originalBoundingBox.width;
      const scaleY =
        newBoundingBoxSize.height / multiResize.originalBoundingBox.height;

      // Calculate new bounding box position based on handle
      let newBoundingBoxX = multiResize.originalBoundingBox.x;
      let newBoundingBoxY = multiResize.originalBoundingBox.y;

      // Adjust position for handles that anchor on opposite sides
      if (
        multiResize.handle === "w" ||
        multiResize.handle === "nw" ||
        multiResize.handle === "sw"
      ) {
        newBoundingBoxX =
          multiResize.originalBoundingBox.x +
          multiResize.originalBoundingBox.width -
          newBoundingBoxSize.width;
      }
      if (
        multiResize.handle === "n" ||
        multiResize.handle === "nw" ||
        multiResize.handle === "ne"
      ) {
        newBoundingBoxY =
          multiResize.originalBoundingBox.y +
          multiResize.originalBoundingBox.height -
          newBoundingBoxSize.height;
      }

      // Update each component proportionally
      const updatedComponents: MultiResizeComponentInfo[] =
        multiResize.components.map((comp) => {
          // Scale position relative to bounding box
          const newRelativeX = comp.originalRelativePosition.x * scaleX;
          const newRelativeY = comp.originalRelativePosition.y * scaleY;

          // Scale size proportionally
          const newWidth = comp.originalSize.width * scaleX;
          const newHeight = comp.originalSize.height * scaleY;

          // Apply constraints unless ignoring for preview mode
          const minWidth = ignoreConstraints
            ? 1
            : (multiResize.constraints.minWidth ?? 10);
          const minHeight = ignoreConstraints
            ? 1
            : (multiResize.constraints.minHeight ?? 10);

          return {
            ...comp,
            currentSize: {
              width: Math.max(minWidth, Math.round(newWidth)),
              height: Math.max(minHeight, Math.round(newHeight)),
            },
            currentPosition: {
              x: Math.round(newBoundingBoxX + newRelativeX),
              y: Math.round(newBoundingBoxY + newRelativeY),
            },
          };
        });

      set({
        multiResize: {
          ...multiResize,
          components: updatedComponents,
          currentBoundingBox: {
            x: newBoundingBoxX,
            y: newBoundingBoxY,
            width: newBoundingBoxSize.width,
            height: newBoundingBoxSize.height,
          },
          scaleFactor: { x: scaleX, y: scaleY },
          lockAspectRatio,
          snapToIncrement,
          ignoreConstraints,
        },
      });
    },

    endMultiResize: () => {
      const { multiResize } = get();
      if (!multiResize) return null;

      const finalComponents = multiResize.components.map((comp) => ({
        ...comp,
      }));

      set({
        activeInteraction: null,
        multiResize: null,
        alignmentGuides: [],
      });

      return finalComponents;
    },

    cancelMultiResize: () => {
      set({
        activeInteraction: null,
        multiResize: null,
        alignmentGuides: [],
      });
    },

    // ========================================
    // Rotation Actions
    // ========================================

    startRotation: (componentId, startPosition, centerPoint, originalAngle) => {
      set({
        activeInteraction: "rotation",
        rotation: {
          componentId,
          startPosition,
          originalAngle,
          currentAngle: originalAngle,
          centerPoint,
          snapToAngle: false,
          snapIncrement: 15,
        },
        alignmentGuides: [],
      });
    },

    updateRotation: (currentPosition, modifiers = {}) => {
      const { rotation } = get();
      if (!rotation) return;

      const snapToAngle = modifiers.shift ?? rotation.snapToAngle;

      const newAngle = calculateRotationAngle(
        rotation.startPosition,
        currentPosition,
        rotation.centerPoint,
        rotation.originalAngle,
        snapToAngle,
        rotation.snapIncrement
      );

      set({
        rotation: {
          ...rotation,
          currentAngle: newAngle,
          snapToAngle,
        },
      });
    },

    endRotation: () => {
      const { rotation } = get();
      if (!rotation) return null;

      const finalAngle = rotation.currentAngle;
      set({
        activeInteraction: null,
        rotation: null,
        alignmentGuides: [],
      });

      return finalAngle;
    },

    cancelRotation: () => {
      set({
        activeInteraction: null,
        rotation: null,
        alignmentGuides: [],
      });
    },

    // ========================================
    // Translation Actions
    // ========================================

    startTranslation: (componentId, startPosition, originalOffset) => {
      set({
        activeInteraction: "translation",
        translation: {
          componentId,
          startPosition,
          originalOffset,
          currentOffset: { ...originalOffset },
          snapToGrid: false,
          snapIncrement: 10,
        },
        alignmentGuides: [],
      });
    },

    updateTranslation: (currentPosition, modifiers = {}) => {
      const { translation } = get();
      if (!translation) return;

      const snapToGrid = modifiers.ctrl ?? translation.snapToGrid;

      // Shift constrains to single axis (use larger delta)
      let constrainAxis: "x" | "y" | undefined;
      if (modifiers.shift) {
        const deltaX = Math.abs(
          currentPosition.x - translation.startPosition.x
        );
        const deltaY = Math.abs(
          currentPosition.y - translation.startPosition.y
        );
        constrainAxis = deltaX > deltaY ? "x" : "y";
      }

      const newOffset = calculateTranslationOffset(
        translation.startPosition,
        currentPosition,
        translation.originalOffset,
        snapToGrid,
        translation.snapIncrement,
        constrainAxis
      );

      set({
        translation: {
          ...translation,
          currentOffset: newOffset,
          snapToGrid,
        },
      });
    },

    endTranslation: () => {
      const { translation } = get();
      if (!translation) return null;

      const finalOffset = { ...translation.currentOffset };
      set({
        activeInteraction: null,
        translation: null,
        alignmentGuides: [],
      });

      return finalOffset;
    },

    cancelTranslation: () => {
      set({
        activeInteraction: null,
        translation: null,
        alignmentGuides: [],
      });
    },

    // ========================================
    // Padding/Spacing Actions
    // ========================================

    startPaddingAdjust: (
      componentId,
      side,
      startPosition,
      originalPadding,
      uniform = false
    ) => {
      set({
        activeInteraction: "padding",
        paddingAdjust: {
          componentId,
          side,
          startPosition,
          originalPadding,
          currentPadding: { ...originalPadding },
          uniform,
        },
      });
    },

    updatePaddingAdjust: (currentPosition) => {
      const { paddingAdjust } = get();
      if (!paddingAdjust) return;

      const newPadding = calculatePadding(
        paddingAdjust.side,
        paddingAdjust.startPosition,
        currentPosition,
        paddingAdjust.originalPadding,
        paddingAdjust.uniform
      );

      set({
        paddingAdjust: {
          ...paddingAdjust,
          currentPadding: newPadding,
        },
      });
    },

    endPaddingAdjust: () => {
      const { paddingAdjust } = get();
      if (!paddingAdjust) return null;

      const finalPadding = { ...paddingAdjust.currentPadding };
      set({
        activeInteraction: null,
        paddingAdjust: null,
      });

      return finalPadding;
    },

    cancelPaddingAdjust: () => {
      set({
        activeInteraction: null,
        paddingAdjust: null,
      });
    },

    startSpacingAdjust: (
      componentId,
      gapIndex,
      startPosition,
      originalSpacing,
      direction
    ) => {
      set({
        activeInteraction: "spacing",
        spacingAdjust: {
          componentId,
          gapIndex,
          startPosition,
          originalSpacing,
          currentSpacing: originalSpacing,
          direction,
        },
      });
    },

    updateSpacingAdjust: (currentPosition) => {
      const { spacingAdjust } = get();
      if (!spacingAdjust) return;

      // Calculate spacing based on direction:
      // - Column (vertical): drag down = increase, drag up = decrease
      // - Row (horizontal): drag right = increase, drag left = decrease
      const delta =
        spacingAdjust.direction === "vertical"
          ? currentPosition.y - spacingAdjust.startPosition.y
          : currentPosition.x - spacingAdjust.startPosition.x;

      const newSpacing = Math.max(
        0,
        Math.min(200, Math.round(spacingAdjust.originalSpacing + delta))
      );

      set({
        spacingAdjust: {
          ...spacingAdjust,
          currentSpacing: newSpacing,
        },
      });
    },

    endSpacingAdjust: () => {
      const { spacingAdjust } = get();
      if (!spacingAdjust) return null;

      const finalSpacing = spacingAdjust.currentSpacing;
      set({
        activeInteraction: null,
        spacingAdjust: null,
      });

      return finalSpacing;
    },

    cancelSpacingAdjust: () => {
      set({
        activeInteraction: null,
        spacingAdjust: null,
      });
    },

    // ========================================
    // Table Column Resize Actions
    // ========================================

    startColumnResize: (
      componentId,
      columnIndex,
      startPosition,
      originalColumns,
      totalWidth,
      minColumnWidth = 20
    ) => {
      set({
        activeInteraction: "column-resize",
        columnResize: {
          componentId,
          columnIndex,
          startPosition,
          originalColumns: originalColumns.map((col) => ({ ...col })),
          currentColumns: originalColumns.map((col) => ({ ...col })),
          totalWidth,
          minColumnWidth,
          snapToGrid: false,
          snapIncrement: 5,
        },
      });
    },

    updateColumnResize: (currentPosition, modifiers = {}) => {
      const { columnResize } = get();
      if (!columnResize) return;

      const snapToGrid = modifiers.ctrl ?? columnResize.snapToGrid;

      // Calculate delta X from start position
      const deltaX = currentPosition.x - columnResize.startPosition.x;

      // Create copy of columns to modify
      const newColumns = columnResize.originalColumns.map((col) => ({
        ...col,
      }));

      // Get the columns adjacent to the divider
      const leftColIndex = columnResize.columnIndex;
      const rightColIndex = columnResize.columnIndex + 1;

      if (
        leftColIndex >= newColumns.length ||
        rightColIndex >= newColumns.length
      ) {
        return;
      }

      const leftCol = newColumns[leftColIndex];
      const rightCol = newColumns[rightColIndex];

      // Handle based on column types
      if (leftCol.type === "constant" && rightCol.type === "constant") {
        // Both constant: transfer width between them
        let newLeftValue = leftCol.value + deltaX;
        let newRightValue = rightCol.value - deltaX;

        // Apply snap
        if (snapToGrid) {
          newLeftValue =
            Math.round(newLeftValue / columnResize.snapIncrement) *
            columnResize.snapIncrement;
          newRightValue =
            Math.round(newRightValue / columnResize.snapIncrement) *
            columnResize.snapIncrement;
        }

        // Enforce minimum widths
        newLeftValue = Math.max(columnResize.minColumnWidth, newLeftValue);
        newRightValue = Math.max(columnResize.minColumnWidth, newRightValue);

        // Maintain total width by adjusting if one hit minimum
        const totalConstant = leftCol.value + rightCol.value;
        if (newLeftValue + newRightValue !== totalConstant) {
          if (newLeftValue === columnResize.minColumnWidth) {
            newRightValue = totalConstant - newLeftValue;
          } else if (newRightValue === columnResize.minColumnWidth) {
            newLeftValue = totalConstant - newRightValue;
          }
        }

        newColumns[leftColIndex].value = newLeftValue;
        newColumns[rightColIndex].value = newRightValue;
      } else if (leftCol.type === "relative" && rightCol.type === "relative") {
        // Both relative: transfer relative units between them
        // Calculate the proportion of change based on total width
        const totalRelative =
          columnResize.originalColumns
            .filter((c) => c.type === "relative")
            .reduce((sum, c) => sum + c.value, 0) || 1;

        const deltaRatio = deltaX / columnResize.totalWidth;
        const deltaRelative = deltaRatio * totalRelative;

        let newLeftValue = leftCol.value + deltaRelative;
        let newRightValue = rightCol.value - deltaRelative;

        // Minimum relative value (corresponds to minColumnWidth)
        const minRelative =
          (columnResize.minColumnWidth / columnResize.totalWidth) *
          totalRelative;

        // Enforce minimums
        newLeftValue = Math.max(minRelative, newLeftValue);
        newRightValue = Math.max(minRelative, newRightValue);

        // Round for cleaner values
        newLeftValue = Math.round(newLeftValue * 100) / 100;
        newRightValue = Math.round(newRightValue * 100) / 100;

        newColumns[leftColIndex].value = newLeftValue;
        newColumns[rightColIndex].value = newRightValue;
      } else {
        // Mixed types: adjust the constant column, relative stays same
        if (leftCol.type === "constant") {
          let newValue = leftCol.value + deltaX;
          if (snapToGrid) {
            newValue =
              Math.round(newValue / columnResize.snapIncrement) *
              columnResize.snapIncrement;
          }
          newColumns[leftColIndex].value = Math.max(
            columnResize.minColumnWidth,
            newValue
          );
        } else if (rightCol.type === "constant") {
          let newValue = rightCol.value - deltaX;
          if (snapToGrid) {
            newValue =
              Math.round(newValue / columnResize.snapIncrement) *
              columnResize.snapIncrement;
          }
          newColumns[rightColIndex].value = Math.max(
            columnResize.minColumnWidth,
            newValue
          );
        }
      }

      set({
        columnResize: {
          ...columnResize,
          currentColumns: newColumns,
          snapToGrid,
        },
      });
    },

    endColumnResize: () => {
      const { columnResize } = get();
      if (!columnResize) return null;

      const finalColumns = columnResize.currentColumns.map((col) => ({
        ...col,
      }));

      set({
        activeInteraction: null,
        columnResize: null,
      });

      return finalColumns;
    },

    cancelColumnResize: () => {
      set({
        activeInteraction: null,
        columnResize: null,
      });
    },

    autoSizeColumn: (componentId, columnIndex, contentWidth) => {
      // This action updates the column to a constant width based on content
      // The actual calculation of contentWidth should be done by the component
      // This just applies the value
      const { columnResize } = get();

      if (columnResize && columnResize.componentId === componentId) {
        const newColumns = columnResize.currentColumns.map((col, idx) => {
          if (idx === columnIndex) {
            return { type: "constant" as const, value: contentWidth };
          }
          return { ...col };
        });

        set({
          columnResize: {
            ...columnResize,
            currentColumns: newColumns,
          },
        });
      }
    },

    // ========================================
    // Alignment Guide Actions
    // ========================================

    setAlignmentGuides: (guides) => {
      set({ alignmentGuides: guides });
    },

    clearAlignmentGuides: () => {
      set({ alignmentGuides: [] });
    },

    addAlignmentGuide: (guide) => {
      set((state) => ({
        alignmentGuides: [...state.alignmentGuides, guide],
      }));
    },

    removeAlignmentGuide: (id) => {
      set((state) => ({
        alignmentGuides: state.alignmentGuides.filter((g) => g.id !== id),
      }));
    },

    // ========================================
    // Visual Settings Actions
    // ========================================

    updateVisualSettings: (updates) => {
      set((state) => ({
        visualSettings: { ...state.visualSettings, ...updates },
      }));
    },

    toggleAlignmentGuides: () => {
      set((state) => ({
        visualSettings: {
          ...state.visualSettings,
          showAlignmentGuides: !state.visualSettings.showAlignmentGuides,
        },
      }));
    },

    toggleDimensionTooltip: () => {
      set((state) => ({
        visualSettings: {
          ...state.visualSettings,
          showDimensionTooltip: !state.visualSettings.showDimensionTooltip,
        },
      }));
    },

    // ========================================
    // Utility Actions
    // ========================================

    isInteracting: () => {
      return get().activeInteraction !== null;
    },

    getInteractingComponentId: () => {
      const state = get();
      if (state.resize) return state.resize.componentId;
      if (state.multiResize && state.multiResize.components.length > 0)
        return state.multiResize.components[0].componentId;
      if (state.rotation) return state.rotation.componentId;
      if (state.translation) return state.translation.componentId;
      if (state.paddingAdjust) return state.paddingAdjust.componentId;
      if (state.spacingAdjust) return state.spacingAdjust.componentId;
      return null;
    },

    cancelInteraction: () => {
      const { activeInteraction } = get();
      switch (activeInteraction) {
        case "resize":
          get().cancelResize();
          break;
        case "multi-resize":
          get().cancelMultiResize();
          break;
        case "rotation":
          get().cancelRotation();
          break;
        case "translation":
          get().cancelTranslation();
          break;
        case "padding":
          get().cancelPaddingAdjust();
          break;
        case "spacing":
          get().cancelSpacingAdjust();
          break;
        case "column-resize":
          get().cancelColumnResize();
          break;
      }
    },

    reset: () => {
      set({
        activeInteraction: null,
        resize: null,
        multiResize: null,
        rotation: null,
        translation: null,
        paddingAdjust: null,
        spacingAdjust: null,
        columnResize: null,
        alignmentGuides: [],
        visualSettings: DEFAULT_VISUAL_SETTINGS,
      });
    },
  }))
);

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select active interaction type
 */
export const useActiveInteraction = () =>
  useInteractionStore((state) => state.activeInteraction);

/**
 * Select resize state
 */
export const useResizeState = () =>
  useInteractionStore((state) => state.resize);

/**
 * Select rotation state
 */
export const useRotationState = () =>
  useInteractionStore((state) => state.rotation);

/**
 * Select translation state
 */
export const useTranslationState = () =>
  useInteractionStore((state) => state.translation);

/**
 * Select padding adjust state
 */
export const usePaddingAdjustState = () =>
  useInteractionStore((state) => state.paddingAdjust);

/**
 * Select spacing adjust state
 */
export const useSpacingAdjustState = () =>
  useInteractionStore((state) => state.spacingAdjust);

/**
 * Select column resize state
 */
export const useColumnResizeState = () =>
  useInteractionStore((state) => state.columnResize);

/**
 * Select multi-resize state
 */
export const useMultiResizeState = () =>
  useInteractionStore((state) => state.multiResize);

/**
 * Select alignment guides
 */
export const useAlignmentGuides = () =>
  useInteractionStore((state) => state.alignmentGuides);

/**
 * Select visual settings
 */
export const useVisualSettings = () =>
  useInteractionStore((state) => state.visualSettings);

/**
 * Check if currently interacting
 */
export const useIsInteracting = () =>
  useInteractionStore((state) => state.activeInteraction !== null);

/**
 * Get current interaction component ID
 */
export const useInteractingComponentId = () =>
  useInteractionStore((state) => {
    if (state.resize) return state.resize.componentId;
    if (state.multiResize && state.multiResize.components.length > 0)
      return state.multiResize.components[0].componentId;
    if (state.rotation) return state.rotation.componentId;
    if (state.translation) return state.translation.componentId;
    if (state.paddingAdjust) return state.paddingAdjust.componentId;
    if (state.spacingAdjust) return state.spacingAdjust.componentId;
    if (state.columnResize) return state.columnResize.componentId;
    return null;
  });

/**
 * Get all component IDs being interacted with in multi-resize
 */
export const useMultiResizeComponentIds = () =>
  useInteractionStore((state) =>
    state.multiResize
      ? state.multiResize.components.map((c) => c.componentId)
      : []
  );

/**
 * Check if a specific component is being interacted with
 */
export const useIsComponentInteracting = (componentId: string) =>
  useInteractionStore((state) => {
    if (state.resize?.componentId === componentId) return true;
    if (
      state.multiResize?.components.some((c) => c.componentId === componentId)
    )
      return true;
    if (state.rotation?.componentId === componentId) return true;
    if (state.translation?.componentId === componentId) return true;
    if (state.paddingAdjust?.componentId === componentId) return true;
    if (state.spacingAdjust?.componentId === componentId) return true;
    if (state.columnResize?.componentId === componentId) return true;
    return false;
  });

/**
 * Get current resize dimensions for display
 */
export const useResizeDimensions = () =>
  useInteractionStore((state) =>
    state.resize
      ? {
          width: Math.round(state.resize.currentSize.width),
          height: Math.round(state.resize.currentSize.height),
        }
      : null
  );

/**
 * Get current multi-resize bounding box dimensions for display
 */
export const useMultiResizeDimensions = () =>
  useInteractionStore((state) =>
    state.multiResize
      ? {
          width: Math.round(state.multiResize.currentBoundingBox.width),
          height: Math.round(state.multiResize.currentBoundingBox.height),
          scaleX: Math.round(state.multiResize.scaleFactor.x * 100),
          scaleY: Math.round(state.multiResize.scaleFactor.y * 100),
        }
      : null
  );

/**
 * Get current rotation angle for display
 */
export const useRotationAngle = () =>
  useInteractionStore((state) =>
    state.rotation ? Math.round(state.rotation.currentAngle) : null
  );

/**
 * Get current translation offset for display
 */
export const useTranslationOffset = () =>
  useInteractionStore((state) =>
    state.translation
      ? {
          x: Math.round(state.translation.currentOffset.x),
          y: Math.round(state.translation.currentOffset.y),
        }
      : null
  );

/**
 * Get current column resize info for display
 */
export const useColumnResizeInfo = () =>
  useInteractionStore((state) =>
    state.columnResize
      ? {
          columnIndex: state.columnResize.columnIndex,
          currentColumns: state.columnResize.currentColumns,
          originalColumns: state.columnResize.originalColumns,
        }
      : null
  );

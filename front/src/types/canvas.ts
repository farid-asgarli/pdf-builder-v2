/**
 * Canvas-related TypeScript types
 * Types for canvas rendering, drag and drop, and tree operations
 */

import type { ComponentType, LayoutNode } from "./component";

// ============================================================================
// Geometry Types
// ============================================================================

/**
 * Point coordinates on the canvas
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Size dimensions
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Bounding box for components on the canvas
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Canvas View State
// ============================================================================

/**
 * Canvas zoom levels
 */
export type ZoomLevel = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

/**
 * Canvas state for zoom and pan
 */
export interface CanvasViewState {
  zoom: ZoomLevel;
  pan: Point;
}

// ============================================================================
// Drag and Drop Types
// ============================================================================

/**
 * Drop zone position within a container
 */
export type DropZonePosition = "before" | "after" | "inside" | "start" | "end";

/**
 * Drop position information for drag and drop
 */
export interface DropPosition {
  parentId: string;
  index: number;
}

/**
 * Extended drop zone information with target context
 */
export interface DropZoneInfo {
  /** Target component ID */
  targetId: string;
  /** Target component type */
  targetType: ComponentType;
  /** Position relative to target */
  position: DropZonePosition;
  /** Parent component ID (for before/after positions) */
  parentId: string | null;
  /** Insertion index */
  index: number;
  /** Whether this is a valid drop target */
  isValid: boolean;
  /** Optional message for invalid drops */
  message?: string;
}

/**
 * Result of drop validation
 */
export interface DropValidationResult {
  /** Whether the drop is allowed */
  canDrop: boolean;
  /** Reason for invalid drop */
  reason?: string;
  /** Valid positions for this drop */
  validPositions: DropZonePosition[];
  /** Positions that are explicitly not allowed */
  restrictedPositions?: DropZonePosition[];
}

/**
 * Drag state during drag and drop operations
 */
export interface DragState {
  isDragging: boolean;
  draggedId: string | null;
  draggedType: ComponentType | null;
  dropTarget: DropPosition | null;
  dropZone: DropZoneInfo | null;
}

/**
 * Drag source information (from palette or tree)
 */
export interface DragSource {
  type: "palette" | "tree";
  componentType?: ComponentType; // For palette drags
  nodeId?: string; // For tree reorder drags
}

// ============================================================================
// Tree Traversal Types
// ============================================================================

/**
 * Node path in the layout tree
 * Array of indices from root to the node
 */
export type NodePath = number[];

/**
 * Node with its path and parent information
 */
export interface NodeWithPath {
  node: LayoutNode;
  path: NodePath;
  parentId: string | null;
  depth: number;
}

/**
 * Tree traversal callback function type
 */
export type TreeTraversalCallback = (
  node: LayoutNode,
  path: NodePath,
  parentId: string | null,
  depth: number
) => boolean | void; // Return false to stop traversal

/**
 * Find result from tree search
 */
export interface FindNodeResult {
  node: LayoutNode;
  path: NodePath;
  parentId: string | null;
  parent: LayoutNode | null;
  index: number; // Index in parent's children array
}

// ============================================================================
// Selection Types
// ============================================================================

/**
 * Selection state for components
 */
export interface SelectionState {
  selectedIds: string[];
  lastSelectedId: string | null;
  anchorId: string | null; // For shift+click range selection
}

/**
 * Selection action types
 */
export type SelectionAction =
  | { type: "select"; id: string }
  | { type: "toggle"; id: string }
  | { type: "add"; id: string }
  | { type: "remove"; id: string }
  | { type: "selectRange"; startId: string; endId: string }
  | { type: "selectAll" }
  | { type: "clear" };

// ============================================================================
// Clipboard Types
// ============================================================================

/**
 * Clipboard data for copy/paste operations
 */
export interface ClipboardData {
  nodes: LayoutNode[];
  timestamp: number;
}

// ============================================================================
// Canvas Operation Types
// ============================================================================

/**
 * Operation types for undo/redo history
 */
export type CanvasOperationType =
  | "add"
  | "delete"
  | "update"
  | "move"
  | "duplicate"
  | "paste"
  | "bulk";

/**
 * Canvas operation for history tracking
 */
export interface CanvasOperation {
  type: CanvasOperationType;
  timestamp: number;
  description: string;
  before: LayoutNode | null;
  after: LayoutNode | null;
  affectedIds: string[];
}

/**
 * Component update payload
 */
export interface ComponentUpdate {
  id: string;
  properties?: Partial<Record<string, unknown>>;
  style?: Partial<Record<string, unknown>>;
}

/**
 * Move operation payload
 */
export interface MoveOperation {
  nodeId: string;
  newParentId: string;
  newIndex: number;
}

// ============================================================================
// Renderer Types
// ============================================================================

/**
 * Props passed to component renderers
 */
export interface RendererProps {
  node: LayoutNode;
  isSelected: boolean;
  isHovered: boolean;
  depth: number;
  path: NodePath;
  onSelect: (id: string) => void;
}

/**
 * Drop zone indicator state
 */
export interface DropZoneState {
  isActive: boolean;
  position: "before" | "after" | "inside";
  parentId: string;
  index: number;
}

// ============================================================================
// Canvas Configuration
// ============================================================================

/**
 * Canvas configuration options
 */
export interface CanvasConfig {
  /** Show grid background */
  showGrid: boolean;
  /** Grid size in pixels */
  gridSize: number;
  /** Snap to grid when dragging */
  snapToGrid: boolean;
  /** Show rulers */
  showRulers: boolean;
  /** Minimum zoom level */
  minZoom: ZoomLevel;
  /** Maximum zoom level */
  maxZoom: ZoomLevel;
  /** Auto-save interval in milliseconds (0 to disable) */
  autoSaveInterval: number;
}

/**
 * Default canvas configuration
 */
export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  showGrid: true,
  gridSize: 10,
  snapToGrid: false,
  showRulers: false,
  minZoom: 0.25,
  maxZoom: 2,
  autoSaveInterval: 30000, // 30 seconds
};

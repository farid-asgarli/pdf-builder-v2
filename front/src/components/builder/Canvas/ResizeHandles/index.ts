/**
 * ResizeHandles Barrel Export
 * Re-exports all resize handle components and utilities
 */

// Main resize handles component
export {
  ResizeHandles,
  Handle,
  getHandleConfig,
  isResizable,
  ALL_HANDLES,
  CORNER_HANDLES,
  EDGE_HANDLES,
  HORIZONTAL_HANDLES,
  VERTICAL_HANDLES,
  HANDLE_CURSORS,
  DEFAULT_HANDLE_SIZE,
  MIN_HANDLE_SIZE,
  MAX_HANDLE_SIZE,
  default as ResizeHandlesDefault,
} from "./ResizeHandles";
export type {
  ResizeHandlesProps,
  HandleProps,
  HandlePosition,
  HandleConfig,
  ResizeDirection,
} from "./ResizeHandles";

// Corner handle component
export { CornerHandle, default as CornerHandleDefault } from "./CornerHandle";
export type { CornerHandleProps, CornerPosition } from "./CornerHandle";

// Edge handle component
export { EdgeHandle, default as EdgeHandleDefault } from "./EdgeHandle";
export type { EdgeHandleProps, EdgePosition } from "./EdgeHandle";

// Dimension tooltip component
export {
  DimensionTooltip,
  default as DimensionTooltipDefault,
} from "./DimensionTooltip";
export type {
  DimensionTooltipProps,
  SizeUnit,
  ConstraintStatus,
} from "./DimensionTooltip";

// Resize ghost outline component
export {
  ResizeGhostOutline,
  default as ResizeGhostOutlineDefault,
} from "./ResizeGhostOutline";
export type { ResizeGhostOutlineProps } from "./ResizeGhostOutline";

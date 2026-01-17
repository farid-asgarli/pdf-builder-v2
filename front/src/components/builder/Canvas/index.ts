/**
 * Canvas Components Barrel Export
 * Re-exports all canvas-related components
 */

// Main canvas component
export { Canvas, default as CanvasDefault } from "./Canvas";
export type { CanvasProps } from "./Canvas";

// Grid component
export { CanvasGrid } from "./CanvasGrid";
export type { CanvasGridProps, GridPattern } from "./CanvasGrid";

// Ruler components
export { CanvasRuler, CanvasRulers } from "./CanvasRuler";
export type {
  CanvasRulerProps,
  CanvasRulersProps,
  RulerOrientation,
} from "./CanvasRuler";

// Toolbar component
export { CanvasToolbar } from "./CanvasToolbar";
export type { CanvasToolbarProps } from "./CanvasToolbar";

// Drop zone components
export {
  DropZone,
  SimpleDropTarget,
  default as DropZoneDefault,
} from "./DropZone";
export type {
  DropZoneProps,
  DropZoneState,
  SimpleDropTargetProps,
} from "./DropZone";

// Drop indicator components
export {
  DropIndicator,
  DropLineIndicator,
  default as DropIndicatorDefault,
} from "./DropIndicator";
export type {
  DropIndicatorProps,
  DropLineIndicatorProps,
} from "./DropIndicator";

// Drop context
export {
  CanvasDropContext,
  default as CanvasDropContextDefault,
} from "./CanvasDropContext";
export type { CanvasDropContextProps } from "./CanvasDropContext";

// Selection box components
export {
  SelectionBox,
  MultiSelectionBox,
  SelectionOverlay,
  DEFAULT_RESIZE_HANDLES,
  ALL_RESIZE_HANDLES,
  SELECTION_COLORS,
  calculateCombinedBounds,
  default as SelectionBoxDefault,
} from "./SelectionBox";
export type {
  SelectionBoxProps,
  MultiSelectionBoxProps,
  SelectionOverlayProps,
  ResizeHandleProps,
  ResizeHandlePosition,
  SelectionVariant,
} from "./SelectionBox";

// Resize handles components
export {
  ResizeHandles,
  Handle,
  CornerHandle,
  EdgeHandle,
  DimensionTooltip,
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
  ResizeHandlesDefault,
} from "./ResizeHandles";
export type {
  ResizeHandlesProps,
  HandleProps,
  HandlePosition,
  HandleConfig,
  ResizeDirection,
  CornerHandleProps,
  CornerPosition,
  EdgeHandleProps,
  EdgePosition,
  DimensionTooltipProps,
  SizeUnit,
  ConstraintStatus,
  ResizeModeStatus,
} from "./ResizeHandles";

// Guides components
export {
  AlignmentGuides,
  DistanceIndicator,
  SpacingIndicator,
  useHasAlignmentGuides,
  useAlignmentGuideCount,
  AlignmentGuidesDefault,
  // Snap Grid
  SnapGrid,
  SnapGridDefault,
  useSnapGridSettings,
  useIsSnapModeActive,
  snapToGrid,
  snapSizeToGrid,
  snapPointToGrid,
  DEFAULT_GRID_SIZE,
  SMALL_GRID_SIZE,
  DEFAULT_SNAP_POINT_RADIUS,
  // Ruler Guides
  RulerGuides,
  RulerGuidesDefault,
  RulerGuidesComponent,
  useRulerGuides,
  useGuidesAtPosition,
  useGuideAlignment,
} from "./Guides";
export type {
  AlignmentGuidesProps,
  GuideLineProps,
  DistanceIndicatorProps,
  SpacingIndicatorProps,
  SnapGridProps,
  SnapPointIndicatorProps,
  RulerGuidesProps,
  RulerUnit,
  GuideOrientation,
  GuideLine,
  DraggableGuideProps,
} from "./Guides";

// Multi-resize handles component
export { MultiResizeHandles } from "./MultiResizeHandles";
export type {
  MultiResizeHandlesProps,
  MultiResizeComponentInfo,
} from "./MultiResizeHandles";

// Resize mode indicator
export {
  ResizeModeIndicator,
  ResizeModeTooltip,
  default as ResizeModeIndicatorDefault,
} from "./ResizeModeIndicator";
export type {
  ResizeModeIndicatorProps,
  ResizeMode,
  ResizeModeTooltipProps,
} from "./ResizeModeIndicator";

// Interactive adjusters
export {
  SpacingAdjuster,
  SpacingAdjusterOverlay,
  WithSpacingAdjusters,
} from "./Interactions";
export type {
  SpacingAdjusterProps,
  SpacingAdjusterOverlayProps,
  WithSpacingAdjustersProps,
} from "./Interactions";

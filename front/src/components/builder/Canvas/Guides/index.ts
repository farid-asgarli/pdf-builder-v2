/**
 * Canvas Guides Barrel Export
 * Re-exports all guide-related components for visual alignment and snapping
 */

// Alignment Guides
export {
  AlignmentGuides,
  DistanceIndicator,
  SpacingIndicator,
  useHasAlignmentGuides,
  useAlignmentGuideCount,
  default as AlignmentGuidesDefault,
} from "./AlignmentGuides";
export type {
  AlignmentGuidesProps,
  GuideLineProps,
  DistanceIndicatorProps,
  SpacingIndicatorProps,
} from "./AlignmentGuides";

// Snap Grid
export {
  SnapGrid,
  SnapGrid as SnapGridDefault,
  useSnapGridSettings,
  useIsSnapModeActive,
  snapToGrid,
  snapSizeToGrid,
  snapPointToGrid,
  DEFAULT_GRID_SIZE,
  SMALL_GRID_SIZE,
  DEFAULT_SNAP_POINT_RADIUS,
} from "./SnapGrid";
export type { SnapGridProps, SnapPointIndicatorProps } from "./SnapGrid";

// Ruler Guides
export {
  RulerGuides,
  RulerGuides as RulerGuidesDefault,
  useRulerGuides,
  useGuidesAtPosition,
  useGuideAlignment,
  default as RulerGuidesComponent,
} from "./RulerGuides";
export type {
  RulerGuidesProps,
  RulerUnit,
  GuideOrientation,
  GuideLine,
  DraggableGuideProps,
} from "./RulerGuides";

/**
 * Canvas Interactions
 * Interactive adjusters for visual property manipulation
 *
 * Exports:
 * - SpacingAdjuster: Gap handle for Column/Row spacing
 * - SpacingAdjusterOverlay: Overlay for rendering adjusters on containers
 * - WithSpacingAdjusters: HOC for interleaving children with adjusters
 * - TableColumnResizer: Table column width dragger
 * - PaddingAdjuster: Padding indicator lines (to be implemented)
 */

export { SpacingAdjuster, type SpacingAdjusterProps } from "./SpacingAdjuster";
export {
  SpacingAdjusterOverlay,
  WithSpacingAdjusters,
  type SpacingAdjusterOverlayProps,
  type WithSpacingAdjustersProps,
} from "./SpacingAdjusterOverlay";
export {
  TableColumnResizer,
  type TableColumnResizerProps,
} from "./TableColumnResizer";

// Future exports:
// export { PaddingAdjuster, type PaddingAdjusterProps } from "./PaddingAdjuster";

/**
 * Renderers Barrel Export
 * Re-exports all component renderers and utilities
 *
 * IMPORTANT: Import this module to ensure all renderers are registered
 * with the registry before using ComponentRenderer
 */

// Types (import first to avoid dependency issues)
export {
  type RendererProps,
  type RendererContainerStyles,
  RENDERER_CONTAINER_STYLES,
  COMPONENT_CATEGORY_COLORS,
  MIN_CONTAINER_SIZE,
} from "./types";

// Registry
export {
  type RendererRegistry,
  registerRenderer,
  getRenderer,
  hasRenderer,
  getRegisteredTypes,
} from "./registry";

// Base renderer and utilities
export {
  ComponentRenderer,
  type ComponentRendererProps,
  ChildRenderer,
  useChildRenderer,
  EmptyContainerPlaceholder,
  ComponentLabel,
} from "./ComponentRenderer";

// ============================================================================
// Tier 1 Renderers - Import to trigger self-registration
// ============================================================================

// Container Components
import "./ColumnRenderer"; // Self-registers on import
export { ColumnRenderer, type ColumnRendererProps } from "./ColumnRenderer";

import "./RowRenderer"; // Self-registers on import
export { RowRenderer, type RowRendererProps } from "./RowRenderer";

import "./TableRenderer"; // Self-registers on import
export { TableRenderer, type TableRendererProps } from "./TableRenderer";

import "./LayersRenderer"; // Self-registers on import
export { LayersRenderer, type LayersRendererProps } from "./LayersRenderer";

import "./DecorationRenderer"; // Self-registers on import
export {
  DecorationRenderer,
  type DecorationRendererProps,
} from "./DecorationRenderer";

// Content Components
import "./TextRenderer"; // Self-registers on import
export { TextRenderer, type TextRendererProps } from "./TextRenderer";

import "./ImageRenderer"; // Self-registers on import
export { ImageRenderer, type ImageRendererProps } from "./ImageRenderer";

import "./LineRenderer"; // Self-registers on import
export { LineRenderer, type LineRendererProps } from "./LineRenderer";

import "./HyperlinkRenderer"; // Self-registers on import
export {
  HyperlinkRenderer,
  type HyperlinkRendererProps,
} from "./HyperlinkRenderer";

import "./ListRenderer"; // Self-registers on import
export { ListRenderer, type ListRendererProps } from "./ListRenderer";

// Styling Components
import "./PaddingRenderer"; // Self-registers on import
export { PaddingRenderer, type PaddingRendererProps } from "./PaddingRenderer";

import "./BorderRenderer"; // Self-registers on import
export { BorderRenderer, type BorderRendererProps } from "./BorderRenderer";

import "./BackgroundRenderer"; // Self-registers on import
export {
  BackgroundRenderer,
  type BackgroundRendererProps,
} from "./BackgroundRenderer";

import "./RoundedCornersRenderer"; // Self-registers on import
export {
  RoundedCornersRenderer,
  type RoundedCornersRendererProps,
} from "./RoundedCornersRenderer";

// Content Components - Tier 3
import "./QRCodeRenderer"; // Self-registers on import
export { QRCodeRenderer, type QRCodeRendererProps } from "./QRCodeRenderer";

import "./BarcodeRenderer"; // Self-registers on import
export { BarcodeRenderer, type BarcodeRendererProps } from "./BarcodeRenderer";

// Sizing Components
import "./AlignmentRenderer"; // Self-registers on import
export {
  AlignmentRenderer,
  type AlignmentRendererProps,
} from "./AlignmentRenderer";

// ============================================================================
// Transformation Renderers - Import to trigger self-registration
// ============================================================================

import "./RotateRenderer"; // Self-registers on import
export { RotateRenderer, type RotateRendererProps } from "./RotateRenderer";

import "./ScaleRenderer"; // Self-registers on import
export { ScaleRenderer, type ScaleRendererProps } from "./ScaleRenderer";

import "./TranslateRenderer"; // Self-registers on import
export {
  TranslateRenderer,
  type TranslateRendererProps,
} from "./TranslateRenderer";

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

// Content Components
import "./TextRenderer"; // Self-registers on import
export { TextRenderer, type TextRendererProps } from "./TextRenderer";

import "./ImageRenderer"; // Self-registers on import
export { ImageRenderer, type ImageRendererProps } from "./ImageRenderer";

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

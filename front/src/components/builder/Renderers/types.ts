/**
 * Renderer Types
 * Shared type definitions for all component renderers
 *
 * Separated to avoid circular dependencies
 */

import type { LayoutNode } from "@/types/component";

// ============================================================================
// Types
// ============================================================================

/**
 * Props passed to all component renderers
 */
export interface RendererProps {
  /** The layout node to render */
  node: LayoutNode;
  /** Nesting depth for indentation and visual hierarchy */
  depth: number;
  /** Whether the component is currently selected */
  isSelected?: boolean;
  /** Whether the component is the primary selection (for multi-select) */
  isPrimarySelection?: boolean;
  /** Whether the component is hovered (for drop targets) */
  isHovered?: boolean;
  /** Whether the component is a valid drop target */
  isDropTarget?: boolean;
  /** Callback when the component is clicked */
  onClick?: (event: React.MouseEvent, nodeId: string) => void;
  /** Callback when the component is double-clicked */
  onDoubleClick?: (event: React.MouseEvent, nodeId: string) => void;
  /** Callback when a context menu is requested */
  onContextMenu?: (event: React.MouseEvent, nodeId: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether children rendering is disabled (for collapsed state) */
  hideChildren?: boolean;
}

/**
 * Common styles for component containers in the canvas
 */
export interface RendererContainerStyles {
  /** Base container styles */
  container: string;
  /** Selected state styles */
  selected: string;
  /** Primary selection styles (in multi-select) */
  primarySelected: string;
  /** Hovered state styles */
  hovered: string;
  /** Drop target indicator styles */
  dropTarget: string;
  /** Label/badge styles */
  label: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Common container styles for all renderers
 */
export const RENDERER_CONTAINER_STYLES: RendererContainerStyles = {
  container:
    "relative group rounded-sm transition-all duration-150 ease-in-out",
  selected: "ring-2 ring-primary ring-offset-1 ring-offset-background",
  primarySelected: "ring-2 ring-primary ring-offset-2 ring-offset-background",
  hovered: "ring-1 ring-primary/50",
  dropTarget: "ring-2 ring-dashed ring-blue-500 bg-blue-500/10",
  label:
    "absolute -top-5 left-0 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-t-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
};

/**
 * Colors for different component categories in the canvas
 */
export const COMPONENT_CATEGORY_COLORS: Record<string, string> = {
  container: "border-blue-500/30 bg-blue-500/5",
  content: "border-green-500/30 bg-green-500/5",
  styling: "border-purple-500/30 bg-purple-500/5",
  sizing: "border-orange-500/30 bg-orange-500/5",
  transformation: "border-pink-500/30 bg-pink-500/5",
  flowControl: "border-yellow-500/30 bg-yellow-500/5",
  special: "border-gray-500/30 bg-gray-500/5",
  conditional: "border-cyan-500/30 bg-cyan-500/5",
};

/**
 * Minimum dimensions for empty containers
 */
export const MIN_CONTAINER_SIZE = {
  width: 100,
  height: 40,
};

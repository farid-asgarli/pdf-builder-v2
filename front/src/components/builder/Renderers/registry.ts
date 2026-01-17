/**
 * Renderer Registry
 * Central registry for component type to renderer mapping
 *
 * This is separated from ComponentRenderer to avoid circular dependencies
 * when individual renderers need to render children.
 */

import type { ComponentType } from "@/types/component";
import type { RendererProps } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * Registry of component type to renderer component mapping
 */
export type RendererRegistry = Partial<
  Record<ComponentType, React.ComponentType<RendererProps>>
>;

// ============================================================================
// Registry
// ============================================================================

/**
 * Mutable registry mapping component types to their renderer components
 * Renderers self-register to avoid circular imports
 */
const rendererRegistry: RendererRegistry = {};

/**
 * Register a renderer for a component type
 * Called by each renderer module to self-register
 */
export function registerRenderer(
  type: ComponentType,
  renderer: React.ComponentType<RendererProps>
): void {
  rendererRegistry[type] = renderer;
}

/**
 * Get the renderer component for a given component type
 */
export function getRenderer(
  type: ComponentType
): React.ComponentType<RendererProps> | null {
  return rendererRegistry[type] || null;
}

/**
 * Check if a renderer exists for a component type
 */
export function hasRenderer(type: ComponentType): boolean {
  return type in rendererRegistry;
}

/**
 * Get all registered component types
 */
export function getRegisteredTypes(): ComponentType[] {
  return Object.keys(rendererRegistry) as ComponentType[];
}

/**
 * Clear all registered renderers (mainly for testing)
 */
export function clearRegistry(): void {
  Object.keys(rendererRegistry).forEach((key) => {
    delete rendererRegistry[key as ComponentType];
  });
}

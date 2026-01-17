/**
 * Base Component Renderer
 * Dispatches rendering to specific component type renderers
 *
 * Features:
 * - Component type-based renderer dispatch via registry
 * - Selection handling with visual feedback
 * - Drag and drop support
 * - Error boundary for individual components
 * - Common props handling
 * - Context provider for recursive child rendering
 */
"use client";

import React, {
  memo,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from "react";
import { cn } from "@/lib/utils";
import { useSelectionStore } from "@/store/selection-store";
import {
  isContainerComponent,
  isWrapperComponent,
  isLeafComponent,
} from "@/types/component";
import {
  type RendererProps,
  RENDERER_CONTAINER_STYLES,
  MIN_CONTAINER_SIZE,
} from "./types";
import { getRenderer } from "./registry";

// Re-export types and constants from types.ts for convenience
export {
  type RendererProps,
  type RendererContainerStyles,
  RENDERER_CONTAINER_STYLES,
  COMPONENT_CATEGORY_COLORS,
  MIN_CONTAINER_SIZE,
} from "./types";

export { type RendererRegistry, getRenderer, hasRenderer } from "./registry";

// ============================================================================
// Context for Child Rendering
// ============================================================================

/**
 * Context to provide the ComponentRenderer to child components
 * This breaks the circular dependency by allowing children to access
 * the renderer without importing it directly
 */
interface RendererContextValue {
  renderNode: (
    props: Omit<RendererProps, "isSelected" | "isPrimarySelection">
  ) => React.ReactNode;
}

const RendererContext = createContext<RendererContextValue | null>(null);

/**
 * Hook to access the renderer context for rendering children
 */
export function useChildRenderer(): RendererContextValue {
  const context = useContext(RendererContext);
  if (!context) {
    throw new Error(
      "useChildRenderer must be used within a ComponentRenderer tree"
    );
  }
  return context;
}

/**
 * Component that renders a child node using the context
 * Use this in specific renderers to render children without circular imports
 */
export const ChildRenderer = memo(function ChildRenderer(
  props: Omit<RendererProps, "isSelected" | "isPrimarySelection">
) {
  const { renderNode } = useChildRenderer();
  return <>{renderNode(props)}</>;
});

ChildRenderer.displayName = "ChildRenderer";

// ============================================================================
// Fallback Renderer
// ============================================================================

/**
 * Fallback renderer for components without a specific renderer
 * Shows component type and basic structure
 */
const FallbackRenderer = memo(function FallbackRenderer({
  node,
  depth,
  isSelected,
  isPrimarySelection,
  isHovered,
  isDropTarget,
  onClick,
  onContextMenu,
  className,
  hideChildren,
}: RendererProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(e, node.id);
    },
    [onClick, node.id]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(e, node.id);
    },
    [onContextMenu, node.id]
  );

  // Determine container type info
  const isContainer = isContainerComponent(node.type);
  const isWrapper = isWrapperComponent(node.type);
  const isLeaf = isLeafComponent(node.type);
  const hasChildren =
    (node.children && node.children.length > 0) || node.child !== undefined;

  return (
    <div
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        "border-muted-foreground/30 border-2 border-dashed p-2",
        isSelected && RENDERER_CONTAINER_STYLES.selected,
        isPrimarySelection && RENDERER_CONTAINER_STYLES.primarySelected,
        isHovered && !isSelected && RENDERER_CONTAINER_STYLES.hovered,
        isDropTarget && RENDERER_CONTAINER_STYLES.dropTarget,
        className
      )}
      style={{
        minWidth: isContainer || isWrapper ? MIN_CONTAINER_SIZE.width : "auto",
        minHeight:
          isContainer || isWrapper ? MIN_CONTAINER_SIZE.height : "auto",
        marginLeft: depth > 0 ? 4 : 0,
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      data-component-id={node.id}
      data-component-type={node.type}
      data-depth={depth}
    >
      {/* Component label */}
      <span className={RENDERER_CONTAINER_STYLES.label}>{node.type}</span>

      {/* Component type indicator */}
      <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
        <span className="font-medium">{node.type}</span>
        {isContainer && <span className="text-blue-500">[Container]</span>}
        {isWrapper && <span className="text-purple-500">[Wrapper]</span>}
        {isLeaf && <span className="text-green-500">[Leaf]</span>}
      </div>

      {/* Render children if this is a container/wrapper and not hidden */}
      {!hideChildren && hasChildren && (
        <div className="mt-2 space-y-1">
          {/* Container children */}
          {isContainer && node.children && (
            <div className="flex flex-col gap-1">
              {node.children.map((child) => (
                <ChildRenderer
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  onClick={onClick}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>
          )}

          {/* Wrapper child */}
          {isWrapper && node.child && (
            <ChildRenderer
              node={node.child}
              depth={depth + 1}
              onClick={onClick}
              onContextMenu={onContextMenu}
            />
          )}
        </div>
      )}

      {/* Empty state for containers */}
      {!hideChildren && (isContainer || isWrapper) && !hasChildren && (
        <div className="text-muted-foreground/50 border-muted-foreground/20 flex h-8 items-center justify-center rounded border border-dashed text-xs">
          Drop components here
        </div>
      )}
    </div>
  );
});

FallbackRenderer.displayName = "FallbackRenderer";

// ============================================================================
// Component Renderer Wrapper
// ============================================================================

/**
 * Props for the main ComponentRenderer component
 */
export interface ComponentRendererProps extends Omit<
  RendererProps,
  "isSelected" | "isPrimarySelection"
> {
  /** Override selection state (for previews) */
  forceSelected?: boolean;
  /** Disable selection handling */
  disableSelection?: boolean;
}

/**
 * Internal renderer that handles the actual component rendering
 * Separated to work with the context provider
 */
const InternalRenderer = memo(function InternalRenderer({
  node,
  depth = 0,
  forceSelected,
  disableSelection,
  onClick,
  onDoubleClick,
  onContextMenu,
  ...props
}: ComponentRendererProps) {
  // Selection state from store
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const select = useSelectionStore((state) => state.select);
  const selectWithOptions = useSelectionStore(
    (state) => state.selectWithOptions
  );

  // Calculate selection state
  const isSelected = useMemo(() => {
    if (forceSelected !== undefined) return forceSelected;
    if (disableSelection) return false;
    return selectedIds.includes(node.id);
  }, [forceSelected, disableSelection, selectedIds, node.id]);

  const isPrimarySelection = useMemo(() => {
    if (disableSelection) return false;
    return selectedIds[0] === node.id;
  }, [disableSelection, selectedIds, node.id]);

  // Click handler with selection logic
  const handleClick = useCallback(
    (event: React.MouseEvent, nodeId: string) => {
      if (disableSelection) {
        onClick?.(event, nodeId);
        return;
      }

      event.stopPropagation();

      // Handle multi-select with Ctrl/Cmd key
      if (event.ctrlKey || event.metaKey) {
        selectWithOptions(nodeId, { toggle: true });
      } else if (event.shiftKey) {
        // Range selection
        selectWithOptions(nodeId, { range: true });
      } else {
        // Single selection
        select(nodeId);
      }

      onClick?.(event, nodeId);
    },
    [disableSelection, select, selectWithOptions, onClick]
  );

  // Common renderer props
  const rendererProps: RendererProps = {
    node,
    depth,
    isSelected,
    isPrimarySelection,
    onClick: handleClick,
    onDoubleClick,
    onContextMenu,
    ...props,
  };

  // Get renderer and render - lookup happens outside of useMemo to satisfy React Compiler
  // The registry returns stable references so this is safe
  const SpecificRenderer = getRenderer(node.type);

  if (SpecificRenderer) {
    // Render using specific renderer
    return React.createElement(SpecificRenderer, rendererProps);
  }

  return <FallbackRenderer {...rendererProps} />;
});

InternalRenderer.displayName = "InternalRenderer";

/**
 * Main component renderer that provides context and dispatches to specific renderers
 */
function ComponentRendererComponent(props: ComponentRendererProps) {
  // Create a stable render function for the context
  const renderNode = useCallback(
    (childProps: Omit<RendererProps, "isSelected" | "isPrimarySelection">) => {
      return <InternalRenderer {...childProps} />;
    },
    []
  );

  const contextValue = useMemo(() => ({ renderNode }), [renderNode]);

  return (
    <RendererContext.Provider value={contextValue}>
      <InternalRenderer {...props} />
    </RendererContext.Provider>
  );
}

export const ComponentRenderer = memo(ComponentRendererComponent);
ComponentRenderer.displayName = "ComponentRenderer";

// ============================================================================
// Utility Components
// ============================================================================

/**
 * Empty state component for containers without children
 */
export const EmptyContainerPlaceholder = memo(
  function EmptyContainerPlaceholder({
    message = "Drop components here",
    className,
  }: {
    message?: string;
    className?: string;
  }) {
    return (
      <div
        className={cn(
          "text-muted-foreground/60 flex items-center justify-center px-2 py-4 text-xs",
          "border-muted-foreground/20 rounded-sm border border-dashed",
          "bg-muted/30",
          className
        )}
      >
        {message}
      </div>
    );
  }
);

EmptyContainerPlaceholder.displayName = "EmptyContainerPlaceholder";

/**
 * Component label badge shown on hover
 */
export const ComponentLabel = memo(function ComponentLabel({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  return (
    <span className={cn(RENDERER_CONTAINER_STYLES.label, className)}>
      {type}
    </span>
  );
});

ComponentLabel.displayName = "ComponentLabel";

// ============================================================================
// Exports
// ============================================================================

export default ComponentRenderer;

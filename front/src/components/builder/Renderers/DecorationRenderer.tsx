/**
 * Decoration Renderer
 * Visual renderer for Decoration components in the canvas
 *
 * Features:
 * - Three-section layout: before (header), content (main), after (footer)
 * - Visual indicators for repeating header/footer sections
 * - Section labels and icons
 * - Selection state handling
 * - Drag and drop target for each section
 * - Empty state placeholders
 * - Page repeat indicators
 *
 * Backend alignment:
 * - Properties: before, content, after (all LayoutNode objects)
 * - content is required; before and after are optional
 * - before/after sections repeat on each page when content spans multiple pages
 */
"use client";

import React, { memo, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { RendererProps } from "./types";
import {
  RENDERER_CONTAINER_STYLES,
  COMPONENT_CATEGORY_COLORS,
  MIN_CONTAINER_SIZE,
} from "./types";
import {
  ChildRenderer,
  EmptyContainerPlaceholder,
  ComponentLabel,
} from "./ComponentRenderer";
import { registerRenderer } from "./registry";
import { ComponentType, type LayoutNode } from "@/types/component";
import {
  LayoutTemplate,
  ArrowUp,
  ArrowDown,
  FileText,
  Repeat,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Decoration renderer
 */
export interface DecorationRendererProps extends RendererProps {
  /** Override section collapsed state */
  collapsedSections?: {
    before?: boolean;
    content?: boolean;
    after?: boolean;
  };
}

/**
 * Section configuration for rendering
 */
interface SectionConfig {
  key: "before" | "content" | "after";
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isRequired: boolean;
  repeatsOnPages: boolean;
  emptyMessage: string;
  colors: {
    border: string;
    bg: string;
    header: string;
    badge: string;
    icon: string;
  };
}

// ============================================================================
// Constants
// ============================================================================

/** Section configurations */
const SECTION_CONFIGS: SectionConfig[] = [
  {
    key: "before",
    label: "Before (Header)",
    description: "Repeats above content on each page",
    icon: ArrowUp,
    isRequired: false,
    repeatsOnPages: true,
    emptyMessage: "Drop header content here (optional, repeats on each page)",
    colors: {
      border: "border-amber-500/40",
      bg: "bg-amber-500/5",
      header: "bg-amber-500/10",
      badge: "bg-amber-500 text-amber-950",
      icon: "text-amber-600",
    },
  },
  {
    key: "content",
    label: "Content (Main)",
    description: "Main content area that may span multiple pages",
    icon: FileText,
    isRequired: true,
    repeatsOnPages: false,
    emptyMessage: "Drop main content here (required)",
    colors: {
      border: "border-blue-500/40",
      bg: "bg-blue-500/5",
      header: "bg-blue-500/10",
      badge: "bg-blue-500 text-white",
      icon: "text-blue-600",
    },
  },
  {
    key: "after",
    label: "After (Footer)",
    description: "Repeats below content on each page",
    icon: ArrowDown,
    isRequired: false,
    repeatsOnPages: true,
    emptyMessage: "Drop footer content here (optional, repeats on each page)",
    colors: {
      border: "border-emerald-500/40",
      bg: "bg-emerald-500/5",
      header: "bg-emerald-500/10",
      badge: "bg-emerald-500 text-emerald-950",
      icon: "text-emerald-600",
    },
  },
];

/** Minimum height for the decoration container */
const MIN_DECORATION_HEIGHT = 120;

/** Minimum height for each section */
const MIN_SECTION_HEIGHT = 40;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract a LayoutNode from properties
 */
function getLayoutNodeFromProperty(
  properties: Record<string, unknown> | undefined,
  propertyName: string
): LayoutNode | null {
  if (!properties) return null;

  const value = properties[propertyName];
  if (!value || typeof value !== "object") return null;

  // Check if it has the basic shape of a LayoutNode
  const node = value as Record<string, unknown>;
  if (typeof node.id === "string" && typeof node.type === "string") {
    return node as unknown as LayoutNode;
  }

  return null;
}

/**
 * Check if a section has content
 */
function _hasSectionContent(
  properties: Record<string, unknown> | undefined,
  sectionKey: string
): boolean {
  return getLayoutNodeFromProperty(properties, sectionKey) !== null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Decoration Renderer Component
 * Renders a decoration container with before/content/after sections
 */
function DecorationRendererComponent({
  node,
  depth,
  isSelected,
  isPrimarySelection,
  isHovered,
  isDropTarget,
  onClick,
  onDoubleClick,
  onContextMenu,
  className,
  hideChildren,
  collapsedSections,
}: DecorationRendererProps) {
  // ========================================
  // Event Handlers
  // ========================================

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(e, node.id);
    },
    [onClick, node.id]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick?.(e, node.id);
    },
    [onDoubleClick, node.id]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(e, node.id);
    },
    [onContextMenu, node.id]
  );

  // ========================================
  // Computed Values
  // ========================================

  const properties = node.properties as Record<string, unknown> | undefined;

  // Get section content nodes
  const sectionNodes = useMemo(() => {
    return {
      before: getLayoutNodeFromProperty(properties, "before"),
      content: getLayoutNodeFromProperty(properties, "content"),
      after: getLayoutNodeFromProperty(properties, "after"),
    };
  }, [properties]);

  // Check which sections have content
  const hasBefore = sectionNodes.before !== null;
  const hasContent = sectionNodes.content !== null;
  const hasAfter = sectionNodes.after !== null;

  // Count filled sections
  const filledSections = [hasBefore, hasContent, hasAfter].filter(
    Boolean
  ).length;

  // Check for validation issues
  const isMissingContent = !hasContent;

  // ========================================
  // Render
  // ========================================

  return (
    <div
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        "rounded-sm border",
        COMPONENT_CATEGORY_COLORS.container,
        isSelected && RENDERER_CONTAINER_STYLES.selected,
        isPrimarySelection && RENDERER_CONTAINER_STYLES.primarySelected,
        isHovered && !isSelected && RENDERER_CONTAINER_STYLES.hovered,
        isDropTarget && RENDERER_CONTAINER_STYLES.dropTarget,
        className
      )}
      style={{
        minWidth: MIN_CONTAINER_SIZE.width,
        minHeight: MIN_DECORATION_HEIGHT,
        marginLeft: depth > 0 ? 4 : 0,
        padding: 8,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      data-component-id={node.id}
      data-component-type={node.type}
      data-depth={depth}
      role="region"
      aria-label={`Decoration container with ${filledSections} sections configured`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="Decoration" />

      {/* Decoration header with icon and info */}
      <div className="mb-2 flex items-center gap-1.5 border-b border-blue-500/20 pb-1.5">
        <LayoutTemplate className="h-3.5 w-3.5 text-blue-500/70" />
        <span className="text-[10px] font-medium tracking-wide text-blue-600/80 uppercase">
          Decoration
        </span>

        {/* Warning if content section is missing */}
        {isMissingContent && (
          <span
            className="ml-1 rounded bg-red-100 px-1 text-[9px] text-red-600 dark:bg-red-900/30"
            title="Content section is required for Decoration component"
          >
            Content required
          </span>
        )}

        {/* Repeat indicator */}
        {(hasBefore || hasAfter) && (
          <span
            className="ml-1 flex items-center gap-0.5 rounded bg-purple-100 px-1 text-[9px] text-purple-600 dark:bg-purple-900/30"
            title="Header/footer sections repeat on each page"
          >
            <Repeat className="h-2.5 w-2.5" />
            Repeats
          </span>
        )}

        <span className="text-muted-foreground bg-muted ml-auto rounded px-1 text-[9px]">
          {filledSections}/3 sections
        </span>
      </div>

      {/* Sections visualization */}
      {!hideChildren && (
        <div className="flex flex-col gap-2">
          {SECTION_CONFIGS.map((config) => {
            const sectionNode = sectionNodes[config.key];
            const isCollapsed = collapsedSections?.[config.key];

            return (
              <DecorationSection
                key={config.key}
                config={config}
                node={sectionNode}
                depth={depth}
                isCollapsed={isCollapsed}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onContextMenu={onContextMenu}
              />
            );
          })}
        </div>
      )}

      {/* Help text when selected */}
      {isSelected && (
        <div className="mt-2 flex flex-col gap-1 border-t border-blue-500/20 pt-2 text-[9px]">
          <span className="text-muted-foreground">
            <strong>Before/After</strong> sections repeat on each page when
            content spans multiple pages.
          </span>
          <span className="text-muted-foreground">
            Use with <span className="font-mono text-yellow-600">ShowOnce</span>
            /<span className="font-mono text-yellow-600">SkipOnce</span> for
            first-page-only headers.
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Individual section within the Decoration container
 */
interface DecorationSectionProps {
  config: SectionConfig;
  node: LayoutNode | null;
  depth: number;
  isCollapsed?: boolean;
  onClick?: RendererProps["onClick"];
  onDoubleClick?: RendererProps["onDoubleClick"];
  onContextMenu?: RendererProps["onContextMenu"];
}

const DecorationSection = memo(function DecorationSection({
  config,
  node,
  depth,
  isCollapsed,
  onClick,
  onDoubleClick,
  onContextMenu,
}: DecorationSectionProps) {
  const Icon = config.icon;
  const hasContent = node !== null;
  const isEmpty = !hasContent;

  return (
    <div
      className={cn(
        "rounded-sm border transition-all",
        config.colors.border,
        config.colors.bg,
        isEmpty && "border-dashed opacity-60"
      )}
      style={{
        minHeight: MIN_SECTION_HEIGHT,
      }}
      data-section={config.key}
      data-has-content={hasContent}
    >
      {/* Section header */}
      <div
        className={cn(
          "flex items-center gap-1.5 border-b px-2 py-1",
          config.colors.header,
          config.colors.border
        )}
      >
        <Icon className={cn("h-3 w-3", config.colors.icon)} />
        <span className="text-[9px] font-medium">{config.label}</span>

        {/* Required/Optional badge */}
        {config.isRequired ? (
          <span className="rounded bg-red-100 px-1 text-[8px] text-red-600 dark:bg-red-900/30">
            Required
          </span>
        ) : (
          <span className="rounded bg-slate-100 px-1 text-[8px] text-slate-500 dark:bg-slate-800">
            Optional
          </span>
        )}

        {/* Repeat indicator for before/after */}
        {config.repeatsOnPages && hasContent && (
          <span
            className="ml-auto flex items-center gap-0.5 text-[8px] text-purple-500"
            title={config.description}
          >
            <Repeat className="h-2 w-2" />
            Each page
          </span>
        )}
      </div>

      {/* Section content */}
      {!isCollapsed && (
        <div className="p-1.5">
          {hasContent ? (
            <ChildRenderer
              node={node}
              depth={depth + 1}
              onClick={onClick}
              onDoubleClick={onDoubleClick}
              onContextMenu={onContextMenu}
            />
          ) : (
            <EmptyContainerPlaceholder
              message={config.emptyMessage}
              className={cn("min-h-8 border-dashed", config.colors.border)}
            />
          )}
        </div>
      )}
    </div>
  );
});

DecorationSection.displayName = "DecorationSection";

// ============================================================================
// Exports & Registration
// ============================================================================

export const DecorationRenderer = memo(DecorationRendererComponent);
DecorationRenderer.displayName = "DecorationRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.Decoration, DecorationRenderer);

export default DecorationRenderer;

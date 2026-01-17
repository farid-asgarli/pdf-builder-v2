/**
 * List Renderer
 * Visual renderer for List components in the canvas
 *
 * Features:
 * - Nested list structure visualization
 * - Ordered (numbered) and unordered (bulleted) list types
 * - Visual representation of list items with bullet/number indicators
 * - Selection state handling
 * - Drag and drop target for list items
 * - Empty state placeholder
 * - Configurable spacing and indentation
 * - Expression support for dynamic content
 *
 * Backend API Contract:
 * - type: "ordered" | "unordered" | "none"
 * - items: Array of { content, children?, type? }
 * - bulletChar: Character for unordered bullets (default: "•")
 * - bulletSize: Size of bullet in points
 * - bulletColor: Color of bullet/number
 * - spacing: Space between items in points
 * - indentSize: Indentation per nesting level
 * - startIndex: Starting number for ordered lists
 * - numberFormat: "decimal" | "alpha" | "roman" | "alpha-lower" | "roman-lower"
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
import { EmptyContainerPlaceholder, ComponentLabel } from "./ComponentRenderer";
import { registerRenderer } from "./registry";
import type { ListProperties, ListItemDto } from "@/types/properties";
import { ComponentType } from "@/types/component";
import { List, ListOrdered, Hash, Variable } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to List renderer
 */
export interface ListRendererProps extends RendererProps {
  /** Preview data context for expression evaluation */
  previewData?: Record<string, unknown>;
  /** Override spacing value (for preview) */
  previewSpacing?: number;
}

/**
 * Represents a list item for visualization with an id for rendering
 * Extends the backend ListItemDto with a unique identifier
 */
interface ListItemData extends Omit<ListItemDto, "children"> {
  /** Unique identifier for the item (generated for rendering) */
  id: string;
  /** Nested children items with ids */
  children?: ListItemData[];
}

/**
 * Extended list properties for use in the renderer
 * Uses the base ListProperties which includes all backend API contract properties
 * and adds visual-specific items array with generated IDs
 */
interface ExtendedListProperties extends ListProperties {
  /** List items array with generated IDs for rendering */
  items?: ListItemData[];
}

// ============================================================================
// Constants
// ============================================================================

/** Default spacing between list items in pixels (visual representation) */
const DEFAULT_VISUAL_SPACING = 4;

/** Maximum spacing to display (to prevent excessive gaps) */
const MAX_VISUAL_SPACING = 30;

/** Minimum list height when empty */
const MIN_LIST_HEIGHT = 60;

/** Default indentation per nesting level in pixels */
const DEFAULT_INDENT_SIZE = 16;

/** Maximum nesting depth to visualize */
const MAX_NESTING_DEPTH = 6;

/** Regex pattern to match expression syntax {{ expression }} - create new instance when using */
const _EXPRESSION_PATTERN = /\{\{([^}]+)\}\}/g;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert points to pixels for visual representation
 * Using approximate conversion (1pt ≈ 1.33px at 96dpi)
 */
function pointsToPixels(points: number): number {
  return Math.round(points * 1.33);
}

/**
 * Get visual spacing from list properties
 */
function getVisualSpacing(properties: Record<string, unknown>): number {
  const spacing = (properties as ExtendedListProperties).spacing;
  if (typeof spacing === "number" && spacing > 0) {
    const visualSpacing = pointsToPixels(spacing);
    return Math.min(visualSpacing, MAX_VISUAL_SPACING);
  }
  return DEFAULT_VISUAL_SPACING;
}

/**
 * Get visual indentation from list properties
 */
function getVisualIndent(properties: Record<string, unknown>): number {
  const indent = (properties as ExtendedListProperties).indentSize;
  if (typeof indent === "number" && indent > 0) {
    return pointsToPixels(indent);
  }
  return DEFAULT_INDENT_SIZE;
}

/**
 * Get bullet character based on list type and properties
 */
function getBulletChar(
  listType: "ordered" | "unordered" | "none",
  properties: Record<string, unknown>,
  index: number,
  nestingLevel: number = 0,
  numberFormat:
    | "decimal"
    | "alpha"
    | "roman"
    | "alpha-lower"
    | "roman-lower" = "decimal"
): string {
  if (listType === "none") {
    return "";
  }

  if (listType === "ordered") {
    const startIndex = (properties as ExtendedListProperties).startIndex ?? 1;
    const actualIndex = startIndex + index;
    return formatNumber(actualIndex, numberFormat);
  }

  // Unordered list - vary bullet by nesting level
  const bulletChars = ["•", "◦", "▪", "▫", "‣", "⁃"];
  const customBullet = (properties as ExtendedListProperties).bulletCharacter;

  if (customBullet && nestingLevel === 0) {
    return customBullet;
  }

  return bulletChars[nestingLevel % bulletChars.length];
}

/**
 * Format number according to format type
 */
function formatNumber(
  num: number,
  format: "decimal" | "alpha" | "roman" | "alpha-lower" | "roman-lower"
): string {
  switch (format) {
    case "alpha":
      return toAlpha(num, true) + ".";
    case "alpha-lower":
      return toAlpha(num, false) + ".";
    case "roman":
      return toRoman(num, true) + ".";
    case "roman-lower":
      return toRoman(num, false) + ".";
    case "decimal":
    default:
      return `${num}.`;
  }
}

/**
 * Convert number to alphabetic representation (A, B, C, ...)
 */
function toAlpha(num: number, uppercase: boolean): string {
  const base = uppercase ? 65 : 97; // 'A' or 'a'
  let result = "";
  let n = num;

  while (n > 0) {
    n--;
    result = String.fromCharCode(base + (n % 26)) + result;
    n = Math.floor(n / 26);
  }

  return result;
}

/**
 * Convert number to roman numeral
 */
function toRoman(num: number, uppercase: boolean): string {
  const romanNumerals: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let result = "";
  let remaining = num;

  for (const [value, numeral] of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }

  return uppercase ? result : result.toLowerCase();
}

/**
 * Check if content contains expression syntax
 */
function hasExpressions(content: string): boolean {
  // Create new regex instance to avoid state issues
  const regex = /\{\{([^}]+)\}\}/;
  return regex.test(content);
}

/**
 * Generate sample items when no items are provided
 */
function generateSampleItems(): ListItemData[] {
  return [
    { id: "sample-1", content: "First item" },
    {
      id: "sample-2",
      content: "Second item",
      children: [{ id: "sample-2-1", content: "Nested item" }],
    },
    { id: "sample-3", content: "Third item" },
  ];
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Renders the content of a list item with expression highlighting
 */
const ListItemContent = memo(function ListItemContent({
  content,
}: {
  content: string;
}) {
  if (!content) {
    return <span className="text-muted-foreground italic">Empty item</span>;
  }

  if (!hasExpressions(content)) {
    return <span>{content}</span>;
  }

  // Parse and render with expression highlighting using matchAll for safety
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = Array.from(content.matchAll(regex));

  for (const match of matches) {
    const matchIndex = match.index!;

    // Add plain text before this match
    if (matchIndex > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.slice(lastIndex, matchIndex)}
        </span>
      );
    }

    // Add the expression
    parts.push(
      <span
        key={`expr-${matchIndex}`}
        className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 px-1 font-mono text-[0.85em] text-amber-700 dark:text-amber-400"
        title={`Expression: ${match[0]}`}
      >
        <Variable className="h-3 w-3 shrink-0 opacity-70" />
        <span className="opacity-50">{"{{ "}</span>
        {match[1].trim()}
        <span className="opacity-50">{" }}"}</span>
      </span>
    );

    lastIndex = matchIndex + match[0].length;
  }

  // Add remaining plain text
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>{content.slice(lastIndex)}</span>
    );
  }

  return <>{parts}</>;
});

ListItemContent.displayName = "ListItemContent";

/**
 * Renders a bullet or number indicator
 */
const BulletIndicator = memo(function BulletIndicator({
  listType,
  bullet,
}: {
  listType: "ordered" | "unordered" | "none";
  bullet: string;
}) {
  if (listType === "none" || !bullet) {
    return <span className="w-5" />;
  }

  const isOrdered = listType === "ordered";

  return (
    <span
      className={cn(
        "inline-flex w-5 shrink-0 items-center justify-start font-medium",
        isOrdered
          ? "text-green-600/80 dark:text-green-400/80"
          : "text-green-500/60 dark:text-green-400/60"
      )}
    >
      {bullet}
    </span>
  );
});

BulletIndicator.displayName = "BulletIndicator";

/**
 * Renders a single list item with potential nested children
 */
const ListItem = memo(function ListItem({
  item,
  index,
  nestingLevel,
  listType,
  properties,
  visualIndent,
  visualSpacing,
}: {
  item: ListItemData;
  index: number;
  nestingLevel: number;
  listType: "ordered" | "unordered" | "none";
  properties: Record<string, unknown>;
  visualIndent: number;
  visualSpacing: number;
}) {
  // Use item's override type if provided
  const effectiveType = item.type ?? listType;
  const numberFormat =
    (properties as ExtendedListProperties).numberFormat ?? "decimal";
  const bullet = getBulletChar(
    effectiveType,
    properties,
    index,
    nestingLevel,
    numberFormat
  );
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div
      className="group/item"
      style={{ marginLeft: nestingLevel > 0 ? visualIndent : 0 }}
    >
      {/* Item row */}
      <div
        className={cn(
          "flex items-start gap-1 rounded-sm px-1.5 py-0.5",
          "transition-colors hover:bg-green-500/10"
        )}
      >
        <BulletIndicator listType={effectiveType} bullet={bullet} />
        <div className="min-w-0 flex-1 text-sm leading-snug">
          <ListItemContent content={item.content} />
        </div>
        {/* Nesting level indicator */}
        {nestingLevel > 0 && (
          <span className="text-muted-foreground/50 text-[9px] opacity-0 transition-opacity group-hover/item:opacity-100">
            L{nestingLevel}
          </span>
        )}
      </div>

      {/* Nested children */}
      {hasChildren && nestingLevel < MAX_NESTING_DEPTH && (
        <div
          className="mt-0.5 ml-2 border-l-2 border-green-500/20"
          style={{ gap: visualSpacing }}
        >
          {item.children!.map((child, childIndex) => (
            <ListItem
              key={child.id}
              item={child}
              index={childIndex}
              nestingLevel={nestingLevel + 1}
              listType={effectiveType === "ordered" ? "ordered" : "unordered"}
              properties={properties}
              visualIndent={visualIndent}
              visualSpacing={visualSpacing}
            />
          ))}
        </div>
      )}
    </div>
  );
});

ListItem.displayName = "ListItem";

// ============================================================================
// Main Component
// ============================================================================

/**
 * List Renderer Component
 * Renders a list component with nested structure visualization
 */
function ListRendererComponent({
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
  previewSpacing,
}: ListRendererProps) {
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

  const properties = node.properties as ExtendedListProperties;
  const listType = properties.listType ?? "unordered";
  const items = properties.items ?? generateSampleItems();
  const hasItems = items && items.length > 0;

  // Get spacing from properties or use override
  const visualSpacing = useMemo(() => {
    if (previewSpacing !== undefined) {
      return Math.min(pointsToPixels(previewSpacing), MAX_VISUAL_SPACING);
    }
    return getVisualSpacing(node.properties);
  }, [node.properties, previewSpacing]);

  const visualIndent = useMemo(
    () => getVisualIndent(node.properties),
    [node.properties]
  );

  // Get the spacing value in points for display
  const spacingInPoints = properties.spacing;

  // Calculate total items count (including nested)
  const totalItemCount = useMemo(() => {
    const countItems = (itemList: ListItemData[]): number => {
      return itemList.reduce((count, item) => {
        return count + 1 + (item.children ? countItems(item.children) : 0);
      }, 0);
    };
    return hasItems ? countItems(items) : 0;
  }, [items, hasItems]);

  // Check if list has any nesting
  const hasNesting = useMemo(() => {
    const checkNesting = (itemList: ListItemData[]): boolean => {
      return itemList.some((item) => item.children && item.children.length > 0);
    };
    return hasItems && checkNesting(items);
  }, [items, hasItems]);

  // Determine icon based on list type
  const ListIcon = listType === "ordered" ? ListOrdered : List;

  // ========================================
  // Render
  // ========================================

  return (
    <div
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        "rounded-sm border",
        COMPONENT_CATEGORY_COLORS.content,
        isSelected && RENDERER_CONTAINER_STYLES.selected,
        isPrimarySelection && RENDERER_CONTAINER_STYLES.primarySelected,
        isHovered && !isSelected && RENDERER_CONTAINER_STYLES.hovered,
        isDropTarget && RENDERER_CONTAINER_STYLES.dropTarget,
        className
      )}
      style={{
        minWidth: MIN_CONTAINER_SIZE.width,
        minHeight: hasItems ? "auto" : MIN_LIST_HEIGHT,
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
      aria-label={`${listType} list with ${totalItemCount} items`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="List" />

      {/* List header with icon and info */}
      <div className="mb-2 flex items-center gap-1.5 border-b border-green-500/20 pb-1.5">
        <ListIcon className="h-3.5 w-3.5 text-green-500/70" />
        <span className="text-[10px] font-medium tracking-wide text-green-600/80 uppercase">
          {listType === "ordered" ? "Ordered List" : "List"}
        </span>
        {properties.bulletCharacter && listType === "unordered" && (
          <span className="text-muted-foreground text-[9px]">
            ({properties.bulletCharacter})
          </span>
        )}
        {spacingInPoints !== undefined && spacingInPoints > 0 && (
          <span className="text-muted-foreground ml-auto text-[9px]">
            spacing: {spacingInPoints}pt
          </span>
        )}
        {hasNesting && (
          <span className="rounded bg-green-500/10 px-1 text-[9px] text-green-600 dark:text-green-400">
            nested
          </span>
        )}
        {hasItems && (
          <span className="text-muted-foreground bg-muted rounded px-1 text-[9px]">
            {totalItemCount} item{totalItemCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* List items area */}
      {!hideChildren && (
        <div className="flex flex-col" style={{ gap: visualSpacing }}>
          {hasItems ? (
            items.map((item, index) => (
              <ListItem
                key={item.id}
                item={item}
                index={index}
                nestingLevel={0}
                listType={listType}
                properties={node.properties}
                visualIndent={visualIndent}
                visualSpacing={visualSpacing}
              />
            ))
          ) : (
            <EmptyContainerPlaceholder message="Configure list items in properties panel" />
          )}
        </div>
      )}

      {/* Additional info on selection */}
      {isSelected && (
        <div className="mt-2 border-t border-green-500/20 pt-2">
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-[9px]">
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {listType === "ordered"
                ? `Format: ${properties.numberFormat ?? "decimal"}`
                : `Bullet: ${properties.bulletCharacter ?? "•"}`}
            </span>
            {properties.startIndex && properties.startIndex !== 1 && (
              <span>Start: {properties.startIndex}</span>
            )}
            {properties.indentSize && (
              <span>Indent: {properties.indentSize}pt</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports & Registration
// ============================================================================

export const ListRenderer = memo(ListRendererComponent);
ListRenderer.displayName = "ListRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.List, ListRenderer);

export default ListRenderer;

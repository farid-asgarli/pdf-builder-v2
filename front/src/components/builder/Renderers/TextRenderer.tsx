/**
 * Text Renderer
 * Visual renderer for Text components in the canvas
 *
 * Features:
 * - Text content display with expression preview
 * - Rich text span visualization
 * - Expression syntax highlighting ({{ data.field }})
 * - Selection state handling
 * - Empty state placeholder
 * - Typography style preview
 */
"use client";

import React, { memo, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { RendererProps } from "./types";
import { RENDERER_CONTAINER_STYLES, COMPONENT_CATEGORY_COLORS } from "./types";
import { ComponentLabel } from "./ComponentRenderer";
import { registerRenderer } from "./registry";
import type { TextProperties, TextSpan } from "@/types/properties";
import { ComponentType } from "@/types/component";
import { Type, Variable } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Text renderer
 */
export interface TextRendererProps extends RendererProps {
  /** Preview data context for expression evaluation */
  previewData?: Record<string, unknown>;
  /** Whether to show expression syntax or resolved values */
  showExpressions?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum length of text content to show in canvas (truncate for performance) */
const MAX_DISPLAY_LENGTH = 500;

/** Regex to match expression syntax {{ expression }} */
const EXPRESSION_REGEX = /\{\{([^}]+)\}\}/g;

/** Default text content when empty - prefixed with _ as unused constant for documentation */
const _DEFAULT_TEXT_CONTENT = "Text content";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a string contains expression syntax
 */
function hasExpressions(content: string): boolean {
  return EXPRESSION_REGEX.test(content);
}

/**
 * Parse text content into segments (plain text and expressions)
 */
interface TextSegment {
  type: "text" | "expression";
  content: string;
}

function parseTextContent(content: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  // Reset regex state
  EXPRESSION_REGEX.lastIndex = 0;

  let match;
  while ((match = EXPRESSION_REGEX.exec(content)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }

    // Add the expression
    segments.push({
      type: "expression",
      content: match[1].trim(), // The expression without {{ }}
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining plain text
  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      content: content.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Truncate text if it exceeds max length
 */
function truncateText(
  text: string,
  maxLength: number
): { text: string; truncated: boolean } {
  if (text.length <= maxLength) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, maxLength) + "…", truncated: true };
}

/**
 * Resolve an expression path against data context
 * Simple path resolution (e.g., "data.customer.name")
 */
function resolveExpression(
  expression: string,
  data: Record<string, unknown>
): string | undefined {
  try {
    const parts = expression.split(".");
    let value: unknown = data;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value != null ? String(value) : undefined;
  } catch {
    return undefined;
  }
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Renders an expression tag with distinctive styling
 */
const ExpressionTag = memo(function ExpressionTag({
  expression,
  resolvedValue,
  showExpression,
}: {
  expression: string;
  resolvedValue?: string;
  showExpression: boolean;
}) {
  if (!showExpression && resolvedValue !== undefined) {
    // Show resolved value with subtle indicator
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded bg-green-500/10 px-1 text-green-700 dark:text-green-400"
        title={`Expression: {{ ${expression} }}`}
      >
        {resolvedValue}
      </span>
    );
  }

  // Show expression syntax
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 px-1 font-mono text-[0.85em] text-amber-700 dark:text-amber-400"
      title={
        resolvedValue
          ? `Resolves to: ${resolvedValue}`
          : "Expression (no data context)"
      }
    >
      <Variable className="h-3 w-3 shrink-0 opacity-70" />
      <span className="opacity-50">{"{{ "}</span>
      {expression}
      <span className="opacity-50">{" }}"}</span>
    </span>
  );
});

ExpressionTag.displayName = "ExpressionTag";

/**
 * Renders rich text span with inline styles
 */
const StyledSpan = memo(function StyledSpan({
  span,
  isLast,
}: {
  span: TextSpan;
  isLast: boolean;
}) {
  const style: React.CSSProperties = {};

  if (span.style) {
    if (span.style.fontFamily) style.fontFamily = span.style.fontFamily;
    if (span.style.fontSize) style.fontSize = `${span.style.fontSize}px`;
    if (span.style.fontWeight) style.fontWeight = span.style.fontWeight;
    if (span.style.fontStyle) style.fontStyle = span.style.fontStyle;
    if (span.style.color) style.color = span.style.color;
    if (span.style.textDecoration) {
      style.textDecoration =
        span.style.textDecoration === "underline"
          ? "underline"
          : span.style.textDecoration === "strikethrough"
            ? "line-through"
            : "none";
    }
  }

  return (
    <span style={style} className="inline">
      {span.text}
      {!isLast && " "}
    </span>
  );
});

StyledSpan.displayName = "StyledSpan";

/**
 * Placeholder for empty text content
 */
const EmptyTextPlaceholder = memo(function EmptyTextPlaceholder() {
  return (
    <div className="text-muted-foreground/50 flex items-center gap-1.5 italic">
      <Type className="h-3 w-3" />
      <span className="text-xs">Enter text content...</span>
    </div>
  );
});

EmptyTextPlaceholder.displayName = "EmptyTextPlaceholder";

// ============================================================================
// Component
// ============================================================================

/**
 * Text Renderer Component
 * Renders text content with expression highlighting and rich text support
 */
function TextRendererComponent({
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
  previewData,
  showExpressions = true,
}: TextRendererProps) {
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

  const properties = node.properties as unknown as TextProperties | undefined;

  // Get text content from properties
  const content = properties?.content || "";
  const spans = properties?.spans;
  const hasContent = content.length > 0 || (spans && spans.length > 0);
  const hasRichText = spans && spans.length > 0;
  const containsExpressions = hasExpressions(content);

  // Truncate content for display
  const { text: displayContent, truncated } = useMemo(
    () => truncateText(content, MAX_DISPLAY_LENGTH),
    [content]
  );

  // Parse text into segments
  const segments = useMemo(
    () => (containsExpressions ? parseTextContent(displayContent) : []),
    [displayContent, containsExpressions]
  );

  // ========================================
  // Render Content
  // ========================================

  const renderTextContent = () => {
    // Empty state
    if (!hasContent) {
      return <EmptyTextPlaceholder />;
    }

    // Rich text with spans
    if (hasRichText && spans) {
      return (
        <div className="rich-text-preview">
          {spans.map((span, index) => (
            <StyledSpan
              key={index}
              span={span}
              isLast={index === spans.length - 1}
            />
          ))}
        </div>
      );
    }

    // Text with expressions
    if (containsExpressions && segments.length > 0) {
      return (
        <div className="expression-text-preview leading-relaxed">
          {segments.map((segment, index) => {
            if (segment.type === "expression") {
              const resolved = previewData
                ? resolveExpression(segment.content, previewData)
                : undefined;
              return (
                <ExpressionTag
                  key={index}
                  expression={segment.content}
                  resolvedValue={resolved}
                  showExpression={showExpressions}
                />
              );
            }
            return <span key={index}>{segment.content}</span>;
          })}
        </div>
      );
    }

    // Plain text
    return <span className="plain-text-preview">{displayContent}</span>;
  };

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
        marginLeft: depth > 0 ? 4 : 0,
        padding: 8,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      data-component-id={node.id}
      data-component-type={node.type}
      data-depth={depth}
      role="article"
      aria-label={`Text component: ${content.slice(0, 50)}${content.length > 50 ? "..." : ""}`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="Text" />

      {/* Text header with icon and info */}
      <div className="mb-2 flex items-center gap-1.5 border-b border-green-500/20 pb-1.5">
        <Type className="h-3.5 w-3.5 text-green-500/70" />
        <span className="text-[10px] font-medium tracking-wide text-green-600/80 uppercase">
          Text
        </span>
        {containsExpressions && (
          <span className="ml-auto flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-600 dark:text-amber-400">
            <Variable className="h-2.5 w-2.5" />
            Dynamic
          </span>
        )}
        {hasRichText && (
          <span className="text-muted-foreground bg-muted ml-auto rounded px-1 text-[9px]">
            {spans!.length} span{spans!.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Text content area */}
      <div className="text-content text-foreground/90 text-sm leading-relaxed">
        {renderTextContent()}
      </div>

      {/* Truncation indicator */}
      {truncated && (
        <div className="text-muted-foreground mt-1.5 flex items-center gap-1 text-[9px]">
          <span>Content truncated ({content.length} characters total)</span>
        </div>
      )}

      {/* Expression indicator on selection */}
      {isSelected && containsExpressions && !hasRichText && (
        <div className="absolute right-1 bottom-1 rounded bg-amber-500/90 px-1 py-0.5 text-[9px] text-white">
          📝 Has expressions
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports & Registration
// ============================================================================

export const TextRenderer = memo(TextRendererComponent);
TextRenderer.displayName = "TextRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.Text, TextRenderer);

export default TextRenderer;

/**
 * Hyperlink Renderer
 * Visual renderer for Hyperlink components in the canvas
 *
 * Features:
 * - Displays clickable area with child content
 * - Shows URL with link icon indicator
 * - Expression syntax support for dynamic URLs ({{ data.url }})
 * - URL validation feedback
 * - Selection state handling
 * - Child content rendering with visual link indicator
 */
"use client";

import React, { memo, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { RendererProps } from "./types";
import { RENDERER_CONTAINER_STYLES, COMPONENT_CATEGORY_COLORS } from "./types";
import { ChildRenderer, ComponentLabel } from "./ComponentRenderer";
import { registerRenderer } from "./registry";
import type { HyperlinkProperties } from "@/types/properties";
import { ComponentType } from "@/types/component";
import {
  Link,
  ExternalLink,
  Variable,
  AlertTriangle,
  Mail,
  Phone,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Hyperlink renderer
 */
export interface HyperlinkRendererProps extends RendererProps {
  /** Preview data context for expression evaluation */
  previewData?: Record<string, unknown>;
  /** Whether to show expression syntax or resolved values */
  showExpressions?: boolean;
}

/**
 * URL type classification
 */
type UrlType = "web" | "mailto" | "tel" | "ftp" | "expression" | "invalid";

// ============================================================================
// Constants
// ============================================================================

/** Regex to match expression syntax {{ expression }} */
const EXPRESSION_REGEX = /\{\{([^}]+)\}\}/g;

/** Maximum URL length to display (truncate for UI) */
const MAX_URL_DISPLAY_LENGTH = 50;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a string contains expression syntax
 */
function isExpression(url: string): boolean {
  EXPRESSION_REGEX.lastIndex = 0;
  return EXPRESSION_REGEX.test(url);
}

/**
 * Extract expression content from {{ expression }}
 */
function extractExpression(url: string): string | null {
  EXPRESSION_REGEX.lastIndex = 0;
  const match = EXPRESSION_REGEX.exec(url);
  return match ? match[1].trim() : null;
}

/**
 * Resolve an expression path against data context
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

/**
 * Determine the type/scheme of the URL
 */
function getUrlType(url: string): UrlType {
  if (!url || url.trim() === "") {
    return "invalid";
  }

  if (isExpression(url)) {
    return "expression";
  }

  const lowerUrl = url.toLowerCase();

  if (lowerUrl.startsWith("mailto:")) {
    return "mailto";
  }

  if (lowerUrl.startsWith("tel:")) {
    return "tel";
  }

  if (lowerUrl.startsWith("ftp://")) {
    return "ftp";
  }

  if (lowerUrl.startsWith("http://") || lowerUrl.startsWith("https://")) {
    return "web";
  }

  // Try to parse as URL for other valid formats
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:" ||
      parsed.protocol === "mailto:" ||
      parsed.protocol === "tel:" ||
      parsed.protocol === "ftp:"
    ) {
      return "web";
    }
  } catch {
    // Not a valid URL
  }

  return "invalid";
}

/**
 * Truncate URL for display
 */
function truncateUrl(
  url: string,
  maxLength: number = MAX_URL_DISPLAY_LENGTH
): string {
  if (!url) return "";
  if (url.length <= maxLength) return url;

  // Try to keep the domain visible
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;

    if (domain.length + 10 > maxLength) {
      return domain.substring(0, maxLength - 3) + "…";
    }

    const remaining = maxLength - domain.length - 10;
    const path = parsed.pathname + parsed.search;

    if (path.length > remaining) {
      return `${parsed.protocol}//${domain}${path.substring(0, remaining)}…`;
    }

    return url.substring(0, maxLength - 1) + "…";
  } catch {
    return url.substring(0, maxLength - 1) + "…";
  }
}

/**
 * Format URL for display (remove protocol for cleaner look)
 */
function formatUrlDisplay(url: string): string {
  if (!url) return "";

  // For expressions, show the expression content
  if (isExpression(url)) {
    const expr = extractExpression(url);
    return expr ? `{{ ${expr} }}` : url;
  }

  // Remove common protocols for cleaner display
  let display = url;
  display = display.replace(/^https?:\/\//, "");
  display = display.replace(/^www\./, "");

  return truncateUrl(display);
}

/**
 * Get color class based on URL type
 */
function getUrlTypeColorClass(urlType: UrlType): string {
  switch (urlType) {
    case "web":
      return "text-blue-600";
    case "mailto":
      return "text-green-600";
    case "tel":
      return "text-purple-600";
    case "ftp":
      return "text-orange-600";
    case "expression":
      return "text-amber-600";
    case "invalid":
      return "text-red-500";
  }
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * URL icon component based on URL type
 */
const UrlIcon = memo(function UrlIcon({
  urlType,
  className,
}: {
  urlType: UrlType;
  className?: string;
}) {
  switch (urlType) {
    case "mailto":
      return <Mail className={className} />;
    case "tel":
      return <Phone className={className} />;
    case "expression":
      return <Variable className={className} />;
    case "invalid":
      return <AlertTriangle className={className} />;
    default:
      return <ExternalLink className={className} />;
  }
});

UrlIcon.displayName = "UrlIcon";

/**
 * URL badge showing the link destination
 */
const UrlBadge = memo(function UrlBadge({
  url,
  urlType,
  isSelected,
}: {
  url: string;
  urlType: UrlType;
  isSelected?: boolean;
}) {
  const colorClass = getUrlTypeColorClass(urlType);
  const displayUrl = formatUrlDisplay(url);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1",
        "bg-green-500/10 text-xs",
        "transition-opacity",
        isSelected ? "opacity-100" : "opacity-80 group-hover:opacity-100"
      )}
    >
      <UrlIcon
        urlType={urlType}
        className={cn("h-3.5 w-3.5 shrink-0", colorClass)}
      />
      <span
        className={cn(
          "max-w-50 truncate font-mono text-[10px]",
          urlType === "invalid" ? "text-red-500" : "text-muted-foreground"
        )}
        title={url}
      >
        {displayUrl || "(no URL)"}
      </span>
    </div>
  );
});

UrlBadge.displayName = "UrlBadge";

/**
 * Link indicator overlay
 */
const LinkOverlay = memo(function LinkOverlay({
  isSelected,
}: {
  isSelected?: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-sm border-2 border-dashed",
        "transition-colors",
        isSelected
          ? "border-green-500/40 bg-green-500/5"
          : "border-green-500/20 bg-transparent"
      )}
    />
  );
});

LinkOverlay.displayName = "LinkOverlay";

/**
 * Empty state placeholder for hyperlink without child
 */
const EmptyHyperlinkPlaceholder = memo(function EmptyHyperlinkPlaceholder({
  url,
}: {
  url: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-4">
      <Link className="h-8 w-8 text-green-500/60" />
      <span className="text-muted-foreground text-xs">
        Hyperlink area - drop content here
      </span>
      {url && (
        <span className="text-muted-foreground/60 max-w-50 truncate font-mono text-[10px]">
          → {formatUrlDisplay(url)}
        </span>
      )}
    </div>
  );
});

EmptyHyperlinkPlaceholder.displayName = "EmptyHyperlinkPlaceholder";

// ============================================================================
// Component
// ============================================================================

/**
 * Hyperlink Renderer Component
 * Renders a hyperlink wrapper component with visual link indicators
 */
function HyperlinkRendererComponent({
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
  previewData,
  showExpressions = true,
}: HyperlinkRendererProps) {
  // ========================================
  // Properties
  // ========================================

  const properties = node.properties as unknown as
    | HyperlinkProperties
    | undefined;
  const url = properties?.url || "";
  const urlType = useMemo(() => getUrlType(url), [url]);

  // Resolve expression if we have preview data
  const resolvedUrl = useMemo(() => {
    if (!url || !previewData || showExpressions) {
      return url;
    }

    if (isExpression(url)) {
      const expr = extractExpression(url);
      if (expr) {
        const resolved = resolveExpression(expr, previewData);
        return resolved || url;
      }
    }

    return url;
  }, [url, previewData, showExpressions]);

  const displayUrlType = useMemo(
    () => (showExpressions ? urlType : getUrlType(resolvedUrl)),
    [showExpressions, urlType, resolvedUrl]
  );

  const hasChild = node.child !== undefined;

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
  // Render
  // ========================================

  return (
    <div
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        "group relative border",
        COMPONENT_CATEGORY_COLORS.content,
        isSelected && RENDERER_CONTAINER_STYLES.selected,
        isPrimarySelection && RENDERER_CONTAINER_STYLES.primarySelected,
        isHovered && !isSelected && RENDERER_CONTAINER_STYLES.hovered,
        isDropTarget && RENDERER_CONTAINER_STYLES.dropTarget,
        className
      )}
      style={{
        marginLeft: depth > 0 ? 4 : 0,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      role="group"
      tabIndex={0}
      aria-label={`Hyperlink: ${url || "no URL"}`}
      data-component-id={node.id}
      data-component-type={node.type}
      data-selected={isSelected}
    >
      {/* Component Label */}
      <ComponentLabel type={node.type} />

      {/* Link Overlay Indicator */}
      <LinkOverlay isSelected={isSelected} />

      {/* URL Badge - positioned at top */}
      <div className="absolute -top-6 left-0 z-10">
        <UrlBadge
          url={showExpressions ? url : resolvedUrl}
          urlType={displayUrlType}
          isSelected={isSelected}
        />
      </div>

      {/* Content Area */}
      <div className="relative min-h-10 p-2">
        {hasChild && !hideChildren ? (
          <ChildRenderer
            node={node.child!}
            depth={depth + 1}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
          />
        ) : (
          <EmptyHyperlinkPlaceholder url={url} />
        )}
      </div>

      {/* Invalid URL Warning */}
      {urlType === "invalid" && url && (
        <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-[9px] text-red-500">
          <AlertTriangle className="h-3 w-3" />
          <span>Invalid URL format</span>
        </div>
      )}

      {/* Link icon indicator on corner */}
      <div
        className={cn(
          "absolute -top-1 -right-1 rounded-full p-1",
          "bg-green-500 text-white shadow-sm",
          "opacity-80 transition-opacity",
          isSelected && "opacity-100"
        )}
      >
        <Link className="h-3 w-3" />
      </div>
    </div>
  );
}

// ============================================================================
// Export & Registration
// ============================================================================

/**
 * Memoized Hyperlink Renderer for performance
 */
export const HyperlinkRenderer = memo(HyperlinkRendererComponent);
HyperlinkRenderer.displayName = "HyperlinkRenderer";

// Register this renderer with the registry
registerRenderer(ComponentType.Hyperlink, HyperlinkRenderer);

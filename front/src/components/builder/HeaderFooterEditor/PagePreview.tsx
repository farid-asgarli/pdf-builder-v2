"use client";

/**
 * PagePreview Component
 *
 * Provides a mini preview showing the complete page structure:
 * - Header section (if defined)
 * - Content section
 * - Footer section (if defined)
 *
 * Features:
 * - Visual page boundaries matching actual PDF output
 * - Page number simulation showing "Page X of Y"
 * - Realistic page size proportions (A4, Letter, etc.)
 * - Scalable preview with zoom controls
 * - Shows editing mode indicator (which section is being edited)
 * - Visual separator lines between sections
 */

import React, { memo, useMemo, useState, useCallback } from "react";
import {
  FileText,
  PanelTop,
  PanelBottom,
  Layers,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useCanvasHeader,
  useCanvasContent,
  useCanvasFooter,
  useEditingMode,
} from "@/store/canvas-store";
import { useTemplateStore } from "@/store/template-store";
import type { LayoutNode } from "@/types/component";
import type { PageSettingsDto, PageSizePreset } from "@/types/dto";
import type { EditingMode } from "@/types/canvas";

// ============================================================================
// Types
// ============================================================================

export interface PagePreviewProps {
  /** Current page number to display (for simulation) */
  currentPage?: number;
  /** Total number of pages (for simulation) */
  totalPages?: number;
  /** Initial scale for the preview (0.1 to 1.0) */
  initialScale?: number;
  /** Whether to show page navigation */
  showNavigation?: boolean;
  /** Whether to show zoom controls */
  showZoomControls?: boolean;
  /** Whether to highlight the currently editing section */
  highlightEditingSection?: boolean;
  /** Custom page settings to override store settings */
  pageSettings?: PageSettingsDto;
  /** Callback when a section is clicked */
  onSectionClick?: (section: EditingMode) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Page dimensions in points (72 points = 1 inch)
 */
interface PageDimensions {
  width: number;
  height: number;
}

/**
 * Section bounds for rendering
 */
interface SectionBounds {
  top: number;
  height: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Standard page sizes in points (72 points = 1 inch)
 */
const PAGE_SIZES: Record<PageSizePreset, PageDimensions> = {
  A0: { width: 2384, height: 3370 },
  A1: { width: 1684, height: 2384 },
  A2: { width: 1191, height: 1684 },
  A3: { width: 842, height: 1191 },
  A4: { width: 595, height: 842 },
  A5: { width: 420, height: 595 },
  A6: { width: 298, height: 420 },
  A7: { width: 210, height: 298 },
  A8: { width: 148, height: 210 },
  A9: { width: 105, height: 148 },
  A10: { width: 74, height: 105 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
  Tabloid: { width: 792, height: 1224 },
  Ledger: { width: 1224, height: 792 },
  Executive: { width: 522, height: 756 },
  Custom: { width: 595, height: 842 }, // Default to A4
};

/**
 * Default margins in points
 */
const DEFAULT_MARGINS = {
  top: 50,
  right: 50,
  bottom: 50,
  left: 50,
};

/**
 * Default section heights
 */
const DEFAULT_HEADER_HEIGHT = 60;
const DEFAULT_FOOTER_HEIGHT = 40;

/**
 * Preview scale presets
 */
const SCALE_PRESETS = [0.15, 0.25, 0.35, 0.5, 0.75, 1.0];

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Section label showing what part of the page this is
 */
const SectionLabel = memo(function SectionLabel({
  label,
  icon: Icon,
  isActive,
  repeats,
  onClick,
  className,
}: {
  label: string;
  icon: React.ElementType;
  isActive?: boolean;
  repeats?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex cursor-pointer items-center justify-between px-2 py-0.5 text-[9px] font-medium transition-colors",
        isActive
          ? "bg-primary/20 text-primary"
          : "bg-muted/50 text-muted-foreground hover:bg-muted",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        <Icon className="h-2.5 w-2.5" />
        <span>{label}</span>
        {isActive && (
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 h-3 px-1 text-[7px]"
          >
            Editing
          </Badge>
        )}
      </div>
      {repeats && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                <RefreshCw className="h-2 w-2" />
                <span className="text-[7px]">Every page</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              <p>This section repeats on every page</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
});

/**
 * Page number display
 */
const PageNumber = memo(function PageNumber({
  current,
  total,
  className,
}: {
  current: number;
  total: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center justify-center gap-1 text-[10px]",
        className
      )}
    >
      <span className="font-mono">
        Page {current} of {total}
      </span>
    </div>
  );
});

/**
 * Zoom controls
 */
const ZoomControls = memo(function ZoomControls({
  scale,
  onScaleChange,
  className,
}: {
  scale: number;
  onScaleChange: (scale: number) => void;
  className?: string;
}) {
  const currentIndex = SCALE_PRESETS.findIndex(
    (s) => Math.abs(s - scale) < 0.01
  );
  const canZoomIn = currentIndex < SCALE_PRESETS.length - 1;
  const canZoomOut = currentIndex > 0;

  const handleZoomIn = useCallback(() => {
    if (canZoomIn) {
      onScaleChange(SCALE_PRESETS[currentIndex + 1]);
    }
  }, [canZoomIn, currentIndex, onScaleChange]);

  const handleZoomOut = useCallback(() => {
    if (canZoomOut) {
      onScaleChange(SCALE_PRESETS[currentIndex - 1]);
    }
  }, [canZoomOut, currentIndex, onScaleChange]);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleZoomOut}
              disabled={!canZoomOut}
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Zoom out</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <span className="text-muted-foreground min-w-9 text-center font-mono text-[10px]">
        {Math.round(scale * 100)}%
      </span>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleZoomIn}
              disabled={!canZoomIn}
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Zoom in</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});

/**
 * Page navigation controls
 */
const PageNavigation = memo(function PageNavigation({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canGoPrevious}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Previous page</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PageNumber current={currentPage} total={totalPages} />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canGoNext}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Next page</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});

/**
 * Mini component tree preview (simplified visual)
 */
const MiniComponentPreview = memo(function MiniComponentPreview({
  node,
  depth = 0,
  maxDepth = 2,
}: {
  node: LayoutNode | null;
  depth?: number;
  maxDepth?: number;
}) {
  if (!node || depth > maxDepth) {
    return null;
  }

  // Simplified visual based on component type
  const getComponentVisual = () => {
    switch (node.type) {
      case "Text":
        // Render text content or placeholder lines
        const text = node.properties?.text as string | undefined;
        if (text && !text.includes("{{")) {
          return (
            <div className="text-foreground/80 max-w-full truncate text-[6px] leading-tight">
              {text.slice(0, 50)}
              {text.length > 50 ? "..." : ""}
            </div>
          );
        }
        // Expression or no content - show placeholder lines
        return (
          <div className="flex w-full flex-col gap-0.5">
            <div className="bg-muted-foreground/20 h-1 w-3/4 rounded-full" />
            <div className="bg-muted-foreground/20 h-1 w-1/2 rounded-full" />
          </div>
        );

      case "Image":
        return (
          <div className="bg-muted-foreground/10 flex h-full min-h-3 w-full items-center justify-center rounded">
            <div className="border-muted-foreground/30 h-2 w-2 rounded border" />
          </div>
        );

      case "Line":
        return <div className="bg-muted-foreground/30 h-px w-full" />;

      case "Column":
        return (
          <div className="flex w-full flex-col gap-0.5 p-0.5">
            {node.children?.slice(0, 3).map((child, idx) => (
              <MiniComponentPreview
                key={child.id || idx}
                node={child}
                depth={depth + 1}
                maxDepth={maxDepth}
              />
            ))}
            {(node.children?.length || 0) > 3 && (
              <div className="text-muted-foreground text-center text-[5px]">
                +{(node.children?.length || 0) - 3} more
              </div>
            )}
          </div>
        );

      case "Row":
        return (
          <div className="flex w-full gap-0.5 p-0.5">
            {node.children?.slice(0, 3).map((child, idx) => (
              <div key={child.id || idx} className="min-w-0 flex-1">
                <MiniComponentPreview
                  node={child}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                />
              </div>
            ))}
            {(node.children?.length || 0) > 3 && (
              <div className="text-muted-foreground flex items-center text-[5px]">
                +{(node.children?.length || 0) - 3}
              </div>
            )}
          </div>
        );

      default:
        // Generic container or unknown type
        if (node.children?.length) {
          return (
            <div className="flex w-full flex-col gap-0.5 p-0.5">
              {node.children.slice(0, 2).map((child, idx) => (
                <MiniComponentPreview
                  key={child.id || idx}
                  node={child}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                />
              ))}
            </div>
          );
        }
        if (node.child) {
          return (
            <MiniComponentPreview
              node={node.child}
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          );
        }
        return <div className="bg-muted-foreground/10 h-2 w-full rounded" />;
    }
  };

  return <div className="w-full">{getComponentVisual()}</div>;
});

/**
 * Empty section placeholder
 */
const EmptySection = memo(function EmptySection({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground/50 flex flex-col items-center justify-center gap-0.5 py-1",
        className
      )}
    >
      <div className="text-[7px]">No {label}</div>
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * PagePreview - Mini preview showing header + content + footer together
 */
export const PagePreview = memo(function PagePreview({
  currentPage = 1,
  totalPages = 1,
  initialScale = 0.35,
  showNavigation = true,
  showZoomControls = true,
  highlightEditingSection = true,
  pageSettings: customPageSettings,
  onSectionClick,
  className,
}: PagePreviewProps) {
  // ========================================
  // State
  // ========================================
  const [scale, setScale] = useState(initialScale);
  const [displayPage, setDisplayPage] = useState(currentPage);

  // ========================================
  // Store
  // ========================================
  const header = useCanvasHeader();
  const content = useCanvasContent();
  const footer = useCanvasFooter();
  const editingMode = useEditingMode();
  const template = useTemplateStore((state) => state.template);

  // ========================================
  // Computed Values
  // ========================================

  // Get page settings from props, template, or defaults
  const pageSettings = useMemo((): PageSettingsDto => {
    if (customPageSettings) return customPageSettings;
    if (template?.pageSettings) return template.pageSettings;
    return {
      pageSize: "A4",
      orientation: "Portrait",
    };
  }, [customPageSettings, template?.pageSettings]);

  // Calculate page dimensions based on settings
  const pageDimensions = useMemo((): PageDimensions => {
    const preset = (pageSettings.pageSize as PageSizePreset) || "A4";
    const baseDimensions = PAGE_SIZES[preset] || PAGE_SIZES.A4;

    // Handle custom dimensions
    if (preset === "Custom" && pageSettings.width && pageSettings.height) {
      return {
        width: pageSettings.width,
        height: pageSettings.height,
      };
    }

    // Handle landscape orientation
    if (pageSettings.orientation === "Landscape") {
      return {
        width: baseDimensions.height,
        height: baseDimensions.width,
      };
    }

    return baseDimensions;
  }, [pageSettings]);

  // Calculate margins
  const margins = useMemo(() => {
    return {
      top: pageSettings.marginTop ?? pageSettings.margin ?? DEFAULT_MARGINS.top,
      right:
        pageSettings.marginRight ??
        pageSettings.margin ??
        DEFAULT_MARGINS.right,
      bottom:
        pageSettings.marginBottom ??
        pageSettings.margin ??
        DEFAULT_MARGINS.bottom,
      left:
        pageSettings.marginLeft ?? pageSettings.margin ?? DEFAULT_MARGINS.left,
    };
  }, [pageSettings]);

  // Calculate scaled dimensions
  const scaledDimensions = useMemo(() => {
    return {
      width: pageDimensions.width * scale,
      height: pageDimensions.height * scale,
    };
  }, [pageDimensions, scale]);

  // Calculate section bounds
  const sectionBounds = useMemo(() => {
    const headerHeight = header ? DEFAULT_HEADER_HEIGHT * scale : 0;
    const footerHeight = footer ? DEFAULT_FOOTER_HEIGHT * scale : 0;
    const marginTopScaled = margins.top * scale;
    const marginBottomScaled = margins.bottom * scale;

    const availableHeight =
      scaledDimensions.height - marginTopScaled - marginBottomScaled;
    const contentHeight = availableHeight - headerHeight - footerHeight;

    return {
      header: {
        top: marginTopScaled,
        height: headerHeight,
      },
      content: {
        top: marginTopScaled + headerHeight,
        height: contentHeight,
      },
      footer: {
        top: scaledDimensions.height - marginBottomScaled - footerHeight,
        height: footerHeight,
      },
    };
  }, [header, footer, margins, scaledDimensions, scale]);

  // ========================================
  // Handlers
  // ========================================

  const handleSectionClick = useCallback(
    (section: EditingMode) => {
      if (onSectionClick) {
        onSectionClick(section);
      }
    },
    [onSectionClick]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setDisplayPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  // ========================================
  // Render
  // ========================================

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Controls Bar */}
      <div className="bg-muted/30 flex items-center justify-between border-b px-2 py-1">
        <div className="flex items-center gap-1">
          <FileText className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground text-[10px] font-medium">
            Page Preview
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showZoomControls && (
            <ZoomControls scale={scale} onScaleChange={setScale} />
          )}
        </div>
      </div>

      {/* Page Preview Area */}
      <div className="bg-muted/20 flex flex-1 items-center justify-center overflow-auto p-4">
        <div className="relative">
          {/* Page Shadow */}
          <div
            className="absolute inset-0 translate-x-1 translate-y-1 rounded bg-black/10 blur-md"
            style={{
              width: scaledDimensions.width,
              height: scaledDimensions.height,
            }}
          />

          {/* Page */}
          <div
            className="border-border relative overflow-hidden rounded-sm border bg-white dark:bg-slate-900"
            style={{
              width: scaledDimensions.width,
              height: scaledDimensions.height,
            }}
          >
            {/* Margins Indicator */}
            <div
              className="pointer-events-none absolute border border-dashed border-blue-300/30"
              style={{
                top: margins.top * scale,
                left: margins.left * scale,
                right: margins.right * scale,
                bottom: margins.bottom * scale,
                width: `calc(100% - ${(margins.left + margins.right) * scale}px)`,
                height: `calc(100% - ${(margins.top + margins.bottom) * scale}px)`,
              }}
            />

            {/* Header Section */}
            {(header || highlightEditingSection) && (
              <div
                className={cn(
                  "absolute right-0 left-0 cursor-pointer transition-all",
                  highlightEditingSection && editingMode === "header"
                    ? "ring-primary ring-2 ring-inset"
                    : "hover:ring-primary/30 hover:ring-1 hover:ring-inset"
                )}
                style={{
                  top: sectionBounds.header.top,
                  height: Math.max(sectionBounds.header.height, 20 * scale),
                  marginLeft: margins.left * scale,
                  marginRight: margins.right * scale,
                  width: `calc(100% - ${(margins.left + margins.right) * scale}px)`,
                }}
                onClick={() => handleSectionClick("header")}
              >
                {header && (
                  <>
                    <SectionLabel
                      label="Header"
                      icon={PanelTop}
                      isActive={
                        highlightEditingSection && editingMode === "header"
                      }
                      repeats
                    />
                    <div className="overflow-hidden p-0.5">
                      <MiniComponentPreview node={header} />
                    </div>
                  </>
                )}
                {!header && editingMode !== "header" && (
                  <div className="border-muted-foreground/20 flex h-full items-center justify-center border-b border-dashed">
                    <span className="text-muted-foreground/50 text-[7px]">
                      No header
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Content Section */}
            <div
              className={cn(
                "absolute right-0 left-0 cursor-pointer overflow-hidden transition-all",
                highlightEditingSection && editingMode === "content"
                  ? "ring-primary ring-2 ring-inset"
                  : "hover:ring-primary/30 hover:ring-1 hover:ring-inset"
              )}
              style={{
                top: sectionBounds.content.top,
                height: sectionBounds.content.height,
                marginLeft: margins.left * scale,
                marginRight: margins.right * scale,
                width: `calc(100% - ${(margins.left + margins.right) * scale}px)`,
              }}
              onClick={() => handleSectionClick("content")}
            >
              <SectionLabel
                label="Content"
                icon={Layers}
                isActive={highlightEditingSection && editingMode === "content"}
              />
              <div className="flex-1 overflow-hidden p-0.5">
                {content ? (
                  <MiniComponentPreview node={content} maxDepth={3} />
                ) : (
                  <EmptySection label="content" />
                )}
              </div>
            </div>

            {/* Footer Section */}
            {(footer || highlightEditingSection) && (
              <div
                className={cn(
                  "absolute right-0 left-0 cursor-pointer transition-all",
                  highlightEditingSection && editingMode === "footer"
                    ? "ring-primary ring-2 ring-inset"
                    : "hover:ring-primary/30 hover:ring-1 hover:ring-inset"
                )}
                style={{
                  top: sectionBounds.footer.top,
                  height: Math.max(sectionBounds.footer.height, 20 * scale),
                  marginLeft: margins.left * scale,
                  marginRight: margins.right * scale,
                  width: `calc(100% - ${(margins.left + margins.right) * scale}px)`,
                }}
                onClick={() => handleSectionClick("footer")}
              >
                {footer && (
                  <>
                    <SectionLabel
                      label="Footer"
                      icon={PanelBottom}
                      isActive={
                        highlightEditingSection && editingMode === "footer"
                      }
                      repeats
                    />
                    <div className="overflow-hidden p-0.5">
                      <MiniComponentPreview node={footer} />
                    </div>
                  </>
                )}
                {!footer && editingMode !== "footer" && (
                  <div className="border-muted-foreground/20 flex h-full items-center justify-center border-t border-dashed">
                    <span className="text-muted-foreground/50 text-[7px]">
                      No footer
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Page Number (shown in footer area for simulation) */}
            <div
              className="absolute right-0 bottom-1 left-0 flex justify-center"
              style={{
                marginLeft: margins.left * scale,
                marginRight: margins.right * scale,
              }}
            >
              <div className="text-muted-foreground/60 font-mono text-[6px]">
                Page {displayPage} of {totalPages}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      {showNavigation && totalPages > 1 && (
        <div className="bg-muted/30 flex items-center justify-center border-t px-2 py-1">
          <PageNavigation
            currentPage={displayPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Page Info */}
      <div className="bg-muted/20 text-muted-foreground flex items-center justify-center gap-2 border-t px-2 py-1 text-[9px]">
        <span>{pageSettings.pageSize || "A4"}</span>
        <Separator orientation="vertical" className="h-3" />
        <span>{pageSettings.orientation || "Portrait"}</span>
        <Separator orientation="vertical" className="h-3" />
        <span>
          {Math.round(pageDimensions.width)}×{Math.round(pageDimensions.height)}{" "}
          pt
        </span>
      </div>
    </div>
  );
});

PagePreview.displayName = "PagePreview";

// ============================================================================
// Exports
// ============================================================================

export { PagePreview as default };
export type { PageDimensions, SectionBounds };

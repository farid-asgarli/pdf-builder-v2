/**
 * PageExpressionHelper
 * UI component showing available page context variables with copy-to-clipboard
 *
 * Features:
 * - List of available page variables (currentPage, totalPages, etc.)
 * - Copy-to-clipboard functionality
 * - Context-aware suggestions based on editing mode
 * - Documentation tooltips
 */
"use client";

import { useState, useCallback } from "react";
import { Copy, Check, FileText, Hash, Calendar, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { PAGE_VARIABLES, type PageVariable } from "@/components/monaco";

// ============================================================================
// Types
// ============================================================================

export interface PageExpressionHelperProps {
  /** Current editing mode */
  editingMode?: "content" | "header" | "footer";
  /** Callback when a variable is selected/copied */
  onVariableSelect?: (expression: string) => void;
  /** Whether to show the component in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wrap a variable name in expression syntax
 */
function toExpression(variableName: string): string {
  return `{{ ${variableName} }}`;
}

// ============================================================================
// Variable Icon Component
// ============================================================================

interface VariableIconProps {
  returnType: string;
  className?: string;
}

/**
 * Icon component for variable types - declared outside render to comply with React rules
 */
function VariableIcon({ returnType, className }: VariableIconProps) {
  switch (returnType.toLowerCase()) {
    case "number":
      return <Hash className={className} />;
    case "string":
      return <FileText className={className} />;
    case "datetime":
      return <Calendar className={className} />;
    default:
      return <Info className={className} />;
  }
}

// ============================================================================
// Variable Item Component
// ============================================================================

interface VariableItemProps {
  variable: PageVariable;
  isRecommended: boolean;
  compact?: boolean;
  onCopy: (expression: string) => void;
}

function VariableItem({
  variable,
  isRecommended,
  compact,
  onCopy,
}: VariableItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const expression = toExpression(variable.name);
    try {
      await navigator.clipboard.writeText(expression);
      setCopied(true);
      onCopy(expression);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  }, [variable.name, onCopy]);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 font-mono text-xs",
                isRecommended && "bg-primary/10 border-primary/20 border"
              )}
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <VariableIcon
                  returnType={variable.returnType}
                  className="mr-1 h-3 w-3 opacity-60"
                />
              )}
              {variable.name}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium">{variable.description}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Returns: {variable.returnType}
            </p>
            {variable.headerFooterOnly && (
              <p className="text-primary mt-1 text-xs">
                📄 Best used in headers/footers
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        "hover:bg-muted/50 group flex items-center justify-between rounded-md p-2 transition-colors",
        isRecommended && "bg-primary/5 border-primary/10 border"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <VariableIcon
          returnType={variable.returnType}
          className="h-4 w-4 shrink-0 opacity-60"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
              {toExpression(variable.name)}
            </code>
            {variable.headerFooterOnly && (
              <span className="text-primary text-xs">📄</span>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {variable.description}
          </p>
        </div>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">Copy expression</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PageExpressionHelper - Shows available page context variables
 */
export function PageExpressionHelper({
  editingMode = "content",
  onVariableSelect,
  compact = false,
  className,
}: PageExpressionHelperProps) {
  const isHeaderFooterMode =
    editingMode === "header" || editingMode === "footer";

  const handleCopy = useCallback(
    (expression: string) => {
      onVariableSelect?.(expression);
    },
    [onVariableSelect]
  );

  // Sort variables: recommended first (based on editing mode), then alphabetically
  const sortedVariables = [...PAGE_VARIABLES].sort((a, b) => {
    const aRecommended = isHeaderFooterMode
      ? a.headerFooterOnly
      : !a.headerFooterOnly;
    const bRecommended = isHeaderFooterMode
      ? b.headerFooterOnly
      : !b.headerFooterOnly;

    if (aRecommended && !bRecommended) return -1;
    if (!aRecommended && bRecommended) return 1;
    return a.name.localeCompare(b.name);
  });

  if (compact) {
    return (
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {sortedVariables.map((variable) => (
          <VariableItem
            key={variable.name}
            variable={variable}
            isRecommended={
              isHeaderFooterMode
                ? !!variable.headerFooterOnly
                : !variable.headerFooterOnly
            }
            compact
            onCopy={handleCopy}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Page Variables</h4>
        {isHeaderFooterMode && (
          <span className="text-primary bg-primary/10 rounded-full px-2 py-0.5 text-xs">
            📄 Header/Footer Mode
          </span>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        Use these variables in expressions for dynamic page content.
        {isHeaderFooterMode
          ? " Page numbering variables are highlighted."
          : " Page numbering variables work best in headers/footers."}
      </p>

      <div className="space-y-1">
        {sortedVariables.map((variable) => (
          <VariableItem
            key={variable.name}
            variable={variable}
            isRecommended={
              isHeaderFooterMode
                ? !!variable.headerFooterOnly
                : !variable.headerFooterOnly
            }
            onCopy={handleCopy}
          />
        ))}
      </div>
    </div>
  );
}

export default PageExpressionHelper;

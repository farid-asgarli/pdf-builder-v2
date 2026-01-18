/**
 * ExpressionPreview Component
 *
 * Displays the resolved value of expressions in property fields.
 * Shows how {{ expression }} values will resolve with current test data.
 *
 * Features:
 * - Shows resolved value for expressions
 * - Indicates when test data is missing
 * - Handles multiple expressions in a single value
 * - Truncates long values with tooltip
 * - Visual feedback for resolved/unresolved state
 */
"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTestData } from "@/hooks/useTestData";
import { CheckCircle2, AlertCircle, Database } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ExpressionPreviewProps {
  /** The value that may contain expressions */
  value: string | undefined;
  /** Maximum length before truncating (default: 50) */
  maxLength?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show inline or as a separate block */
  variant?: "inline" | "block";
  /** Custom label (default: "Resolves to:") */
  label?: string;
  /** Whether to always show the preview even if no expressions */
  alwaysShow?: boolean;
}

interface ResolvedSegment {
  type: "text" | "expression";
  original: string;
  resolved: string;
  isResolved: boolean;
  path?: string;
}

// ============================================================================
// Constants
// ============================================================================

const EXPRESSION_REGEX = /\{\{([^}]+)\}\}/g;
const DEFAULT_MAX_LENGTH = 50;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a string contains expression syntax
 */
function containsExpression(value: string | undefined): boolean {
  if (!value) return false;
  return EXPRESSION_REGEX.test(value);
}

/**
 * Parse a value and resolve all expressions
 */
function resolveAllExpressions(
  value: string,
  resolveExpression: (expr: string) => {
    value: unknown;
    resolved: boolean;
    path: string;
  }
): {
  segments: ResolvedSegment[];
  fullResolved: string;
  allResolved: boolean;
  hasExpressions: boolean;
} {
  const segments: ResolvedSegment[] = [];
  let lastIndex = 0;
  let allResolved = true;
  let hasExpressions = false;

  // Reset regex state
  EXPRESSION_REGEX.lastIndex = 0;

  let match;
  while ((match = EXPRESSION_REGEX.exec(value)) !== null) {
    hasExpressions = true;

    // Add text before the expression
    if (match.index > lastIndex) {
      const textBefore = value.slice(lastIndex, match.index);
      segments.push({
        type: "text",
        original: textBefore,
        resolved: textBefore,
        isResolved: true,
      });
    }

    // Resolve the expression
    const fullMatch = match[0];
    const result = resolveExpression(fullMatch);

    const resolvedValue =
      result.resolved && result.value !== undefined
        ? formatValue(result.value)
        : fullMatch;

    if (!result.resolved) {
      allResolved = false;
    }

    segments.push({
      type: "expression",
      original: fullMatch,
      resolved: resolvedValue,
      isResolved: result.resolved,
      path: result.path,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last expression
  if (lastIndex < value.length) {
    const textAfter = value.slice(lastIndex);
    segments.push({
      type: "text",
      original: textAfter,
      resolved: textAfter,
      isResolved: true,
    });
  }

  const fullResolved = segments.map((s) => s.resolved).join("");

  return { segments, fullResolved, allResolved, hasExpressions };
}

/**
 * Format a resolved value for display
 */
function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.length <= 3) {
      return `[${value.map((v) => formatValue(v)).join(", ")}]`;
    }
    return `[${value.length} items]`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value as object);
    if (keys.length === 0) return "{}";
    if (keys.length <= 2) {
      return `{${keys.join(", ")}}`;
    }
    return `{${keys.length} fields}`;
  }

  return String(value);
}

/**
 * Truncate a string with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

// ============================================================================
// Component
// ============================================================================

/**
 * ExpressionPreview - Shows resolved expression values in properties panel
 */
function ExpressionPreviewComponent({
  value,
  maxLength = DEFAULT_MAX_LENGTH,
  className,
  variant = "block",
  label = "Resolves to:",
  alwaysShow = false,
}: ExpressionPreviewProps) {
  const { resolveExpression, hasTestData } = useTestData();

  // Parse and resolve expressions
  const result = useMemo(() => {
    if (!value) return null;

    const hasExprs = containsExpression(value);
    if (!hasExprs && !alwaysShow) return null;

    return resolveAllExpressions(value, resolveExpression);
  }, [value, resolveExpression, alwaysShow]);

  // Don't render if no expressions (and not alwaysShow)
  if (!result || !result.hasExpressions) {
    return null;
  }

  const { fullResolved, allResolved, segments } = result;

  // Truncate display value
  const displayValue = truncate(fullResolved, maxLength);
  const isTruncated = fullResolved.length > maxLength;

  // Status icon
  const StatusIcon = allResolved ? CheckCircle2 : AlertCircle;
  const statusColor = allResolved
    ? "text-green-600 dark:text-green-400"
    : "text-amber-600 dark:text-amber-400";

  // No test data warning
  if (!hasTestData) {
    return (
      <div
        className={cn(
          "mt-1.5 flex items-center gap-1.5 rounded px-2 py-1",
          "bg-muted/50 text-muted-foreground",
          variant === "inline" && "mt-0 ml-2 inline-flex",
          className
        )}
      >
        <Database className="h-3 w-3 shrink-0" />
        <span className="text-[10px]">No test data available</span>
      </div>
    );
  }

  // Block variant
  if (variant === "block") {
    return (
      <div
        className={cn(
          "mt-1.5 rounded border px-2 py-1.5",
          allResolved
            ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
            : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
          className
        )}
      >
        <div className="flex items-start gap-1.5">
          <StatusIcon className={cn("mt-0.5 h-3 w-3 shrink-0", statusColor)} />
          <div className="min-w-0 flex-1">
            <span className="text-muted-foreground text-[10px]">{label}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <p
                  className={cn(
                    "text-xs font-medium break-all",
                    allResolved
                      ? "text-green-700 dark:text-green-300"
                      : "text-amber-700 dark:text-amber-300"
                  )}
                >
                  {displayValue}
                </p>
              </TooltipTrigger>
              {(isTruncated || segments.length > 1) && (
                <TooltipContent side="bottom" className="max-w-80">
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Full Resolved Value:</p>
                    <p className="text-xs break-all">{fullResolved}</p>
                    {segments.length > 1 && (
                      <>
                        <div className="border-t pt-2">
                          <p className="mb-1 text-xs font-medium">
                            Expressions:
                          </p>
                          <ul className="space-y-1">
                            {segments
                              .filter((s) => s.type === "expression")
                              .map((s, i) => (
                                <li key={i} className="text-[11px]">
                                  <code className="bg-muted rounded px-1">
                                    {s.original}
                                  </code>
                                  <span className="text-muted-foreground mx-1">
                                    →
                                  </span>
                                  <span
                                    className={
                                      s.isResolved
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-amber-600 dark:text-amber-400"
                                    }
                                  >
                                    {s.resolved}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Show unresolved paths */}
            {!allResolved && (
              <div className="mt-1 flex flex-wrap gap-1">
                {segments
                  .filter((s) => s.type === "expression" && !s.isResolved)
                  .map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] dark:bg-amber-900/50"
                    >
                      <AlertCircle className="h-2.5 w-2.5" />
                      {s.path || s.original}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]",
            allResolved
              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
            className
          )}
        >
          <StatusIcon className="h-2.5 w-2.5" />
          {displayValue}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-72">
        <div className="space-y-1">
          <p className="text-xs break-all">{fullResolved}</p>
          {!allResolved && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Some expressions could not be resolved
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export const ExpressionPreview = memo(ExpressionPreviewComponent);
ExpressionPreview.displayName = "ExpressionPreview";

export default ExpressionPreview;

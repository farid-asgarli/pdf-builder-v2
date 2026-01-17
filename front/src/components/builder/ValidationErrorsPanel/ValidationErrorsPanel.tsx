/**
 * ValidationErrorsPanel
 *
 * UI component to display validation errors and warnings.
 * Shows errors grouped by severity and provides navigation to problematic components.
 *
 * Features:
 * - Error/warning summary with counts
 * - Expandable sections by severity
 * - Click to select problematic component
 * - Suggestions for fixing errors
 * - Copy error details
 */
"use client";

import React, { useCallback, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useValidation } from "@/hooks/useValidation";
import { useSelectionStore } from "@/store/selection-store";
import { useCanvasStore } from "@/store/canvas-store";
import type {
  ValidationErrorDto,
  ValidationWarningDto,
  ValidationSeverity,
} from "@/types/api";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface ValidationErrorsPanelProps {
  /** Optional class name */
  className?: string;
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Maximum height of the panel */
  maxHeight?: string | number;
  /** Whether to show the validate button */
  showValidateButton?: boolean;
  /** Callback when an error is clicked */
  onErrorClick?: (nodeId: string | undefined) => void;
}

// ============================================================================
// Severity Configuration
// ============================================================================

const SEVERITY_CONFIG: Record<
  ValidationSeverity,
  {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
  }
> = {
  Critical: {
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-red-200 dark:border-red-800",
    label: "Critical",
  },
  Error: {
    icon: AlertCircle,
    color: "text-red-500 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-red-200 dark:border-red-800",
    label: "Error",
  },
  Warning: {
    icon: AlertTriangle,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    label: "Warning",
  },
  Info: {
    icon: Info,
    color: "text-blue-500 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
    label: "Info",
  },
};

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Single error/warning item display
 */
function ValidationItem({
  item,
  type,
  onNavigate,
}: {
  item: ValidationErrorDto | ValidationWarningDto;
  type: "error" | "warning";
  onNavigate: (nodeId: string | undefined) => void;
}) {
  const severity =
    type === "error"
      ? (item as ValidationErrorDto).severity || "Error"
      : "Warning";
  const config = SEVERITY_CONFIG[severity as ValidationSeverity];
  const Icon = config.icon;

  const suggestions =
    type === "error" ? (item as ValidationErrorDto).suggestions : undefined;

  const handleCopy = useCallback(() => {
    const text = [
      `[${item.code}] ${item.message}`,
      item.path ? `Path: ${item.path}` : null,
      item.nodeId ? `Node: ${item.nodeId}` : null,
      suggestions?.length ? `Suggestions:\n${suggestions.join("\n")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    toast.success("Error details copied to clipboard");
  }, [item, suggestions]);

  const handleNavigate = useCallback(() => {
    onNavigate(item.nodeId);
  }, [item.nodeId, onNavigate]);

  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        config.bgColor,
        config.borderColor
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.color)} />
        <div className="min-w-0 flex-1">
          {/* Code badge and message */}
          <div className="flex items-start gap-2">
            <Badge
              variant="outline"
              className={cn("shrink-0 text-[10px]", config.color)}
            >
              {item.code}
            </Badge>
            <p className="text-foreground leading-tight">{item.message}</p>
          </div>

          {/* Path and property */}
          {(item.path ||
            (type === "error" &&
              (item as ValidationErrorDto).propertyName)) && (
            <div className="text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {item.path && <span>Path: {item.path}</span>}
              {type === "error" &&
                (item as ValidationErrorDto).propertyName && (
                  <span>
                    Property: {(item as ValidationErrorDto).propertyName}
                  </span>
                )}
            </div>
          )}

          {/* Suggestions */}
          {suggestions && suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-muted-foreground mb-1 text-xs font-medium">
                Suggestions:
              </p>
              <ul className="text-muted-foreground list-inside list-disc space-y-0.5 text-xs">
                {suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-1">
          {item.nodeId && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleNavigate}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Go to component</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopy}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy details</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state when no validation issues
 */
function ValidationSuccess() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 rounded-full bg-green-50 p-3 dark:bg-green-950">
        <CheckCircle2 className="h-6 w-6 text-green-500" />
      </div>
      <h3 className="text-foreground text-sm font-medium">
        No validation issues
      </h3>
      <p className="text-muted-foreground mt-1 text-xs">
        Your layout is valid and ready for PDF generation.
      </p>
    </div>
  );
}

/**
 * Loading state during validation
 */
function ValidationLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Loader2 className="text-muted-foreground mb-3 h-6 w-6 animate-spin" />
      <h3 className="text-foreground text-sm font-medium">Validating...</h3>
      <p className="text-muted-foreground mt-1 text-xs">
        Checking your layout for issues.
      </p>
    </div>
  );
}

/**
 * Idle state before validation
 */
function ValidationIdle({ onValidate }: { onValidate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="bg-muted mb-3 rounded-full p-3">
        <AlertCircle className="text-muted-foreground h-6 w-6" />
      </div>
      <h3 className="text-foreground text-sm font-medium">
        Layout not validated
      </h3>
      <p className="text-muted-foreground mt-1 text-xs">
        Validate your layout to check for issues.
      </p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onValidate}>
        Validate Now
      </Button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ValidationErrorsPanel - Display validation errors and warnings
 */
export function ValidationErrorsPanel({
  className,
  collapsed = false,
  maxHeight = "400px",
  showValidateButton = true,
  onErrorClick,
}: ValidationErrorsPanelProps) {
  const {
    status,
    isValidating,
    isValid,
    errors,
    warnings,
    errorCount,
    warningCount,
    validate,
  } = useValidation();

  const select = useSelectionStore((state) => state.select);
  const hasNode = useCanvasStore((state) => state.hasNode);

  // Group errors by severity
  const errorsBySeverity = useMemo(() => {
    const grouped: Record<string, ValidationErrorDto[]> = {};
    for (const error of errors) {
      const severity = error.severity || "Error";
      if (!grouped[severity]) {
        grouped[severity] = [];
      }
      grouped[severity].push(error);
    }
    return grouped;
  }, [errors]);

  // Handle navigate to node
  const handleNavigate = useCallback(
    (nodeId: string | undefined) => {
      if (nodeId && hasNode(nodeId)) {
        select(nodeId);
        onErrorClick?.(nodeId);
      } else if (nodeId) {
        toast.error("Component not found in the layout tree");
      }
    },
    [select, hasNode, onErrorClick]
  );

  // Handle validate button click
  const handleValidate = useCallback(async () => {
    try {
      const result = await validate();
      if (result.success) {
        if (result.isValid) {
          toast.success("Layout is valid");
        } else {
          toast.warning(
            `Found ${result.errors.length} error(s) and ${result.warnings.length} warning(s)`
          );
        }
      } else {
        toast.error(result.errorMessage || "Validation failed");
      }
    } catch {
      toast.error("Validation failed");
    }
  }, [validate]);

  if (collapsed) {
    return null;
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Validation</h3>
          {status !== "idle" && (
            <div className="flex items-center gap-1.5">
              {errorCount > 0 && (
                <Badge variant="destructive" className="h-5 text-[10px]">
                  {errorCount} {errorCount === 1 ? "error" : "errors"}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge
                  variant="outline"
                  className="h-5 border-yellow-300 bg-yellow-50 text-[10px] text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                >
                  {warningCount} {warningCount === 1 ? "warning" : "warnings"}
                </Badge>
              )}
              {isValid && errorCount === 0 && warningCount === 0 && (
                <Badge
                  variant="outline"
                  className="h-5 border-green-300 bg-green-50 text-[10px] text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-400"
                >
                  Valid
                </Badge>
              )}
            </div>
          )}
        </div>
        {showValidateButton && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleValidate}
                  disabled={isValidating}
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isValidating ? "Validating..." : "Validate layout"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Content */}
      <ScrollArea style={{ maxHeight }} className="flex-1">
        <div className="p-3">
          {/* Loading state */}
          {isValidating && <ValidationLoading />}

          {/* Idle state */}
          {!isValidating && status === "idle" && (
            <ValidationIdle onValidate={handleValidate} />
          )}

          {/* Success state */}
          {!isValidating &&
            status !== "idle" &&
            errorCount === 0 &&
            warningCount === 0 && <ValidationSuccess />}

          {/* Errors and warnings */}
          {!isValidating && (errorCount > 0 || warningCount > 0) && (
            <Accordion
              type="multiple"
              defaultValue={["errors", "warnings"]}
              className="space-y-2"
            >
              {/* Errors section */}
              {errorCount > 0 && (
                <AccordionItem value="errors" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium">
                        Errors ({errorCount})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="space-y-2">
                      {/* Group by severity */}
                      {Object.entries(errorsBySeverity).map(
                        ([severity, severityErrors]) => (
                          <div key={severity} className="space-y-2">
                            {severityErrors.length > 1 && (
                              <p className="text-muted-foreground text-xs font-medium">
                                {severity} ({severityErrors.length})
                              </p>
                            )}
                            {severityErrors.map((error, index) => (
                              <ValidationItem
                                key={`${error.code}-${error.nodeId || index}`}
                                item={error}
                                type="error"
                                onNavigate={handleNavigate}
                              />
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Warnings section */}
              {warningCount > 0 && (
                <AccordionItem value="warnings" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">
                        Warnings ({warningCount})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="space-y-2">
                      {warnings.map((warning, index) => (
                        <ValidationItem
                          key={`${warning.code}-${warning.nodeId || index}`}
                          item={warning}
                          type="warning"
                          onNavigate={handleNavigate}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

ValidationErrorsPanel.displayName = "ValidationErrorsPanel";

export default ValidationErrorsPanel;

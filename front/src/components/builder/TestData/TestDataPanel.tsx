/**
 * TestDataPanel Component
 *
 * A panel for editing test data used in PDF template expressions.
 * Features:
 * - JSON editor with syntax highlighting
 * - Sample data templates (Insurance, Invoice, Report)
 * - JSON validation and error display
 * - Two-way sync with template store
 * - Expression preview capability
 */
"use client";

import { memo, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Download,
  FileJson,
  RefreshCw,
  Upload,
  Trash2,
  Sparkles,
  Info,
} from "lucide-react";
import { useTemplateStore, useTemplateTestData } from "@/store/template-store";
import {
  getSampleDataCategories,
  getSampleDataById,
  type SampleDataTemplate,
} from "@/lib/constants/sample-data-templates";

// ============================================================================
// TYPES
// ============================================================================

export interface TestDataPanelProps {
  /** Additional CSS class names */
  className?: string;
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Default height for the editor */
  editorHeight?: number;
  /** Whether to show the template selector */
  showTemplateSelector?: boolean;
  /** Whether to show the expression preview */
  showExpressionPreview?: boolean;
}

interface JsonValidationResult {
  valid: boolean;
  error?: string;
  errorLine?: number;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Validate JSON string
 */
function validateJson(value: string): JsonValidationResult {
  if (!value.trim()) {
    return { valid: true };
  }

  try {
    JSON.parse(value);
    return { valid: true };
  } catch (err) {
    const error = err as SyntaxError;
    // Try to extract line number from error message
    const lineMatch = error.message.match(/position (\d+)/);
    let errorLine: number | undefined;

    if (lineMatch) {
      const position = parseInt(lineMatch[1], 10);
      const lines = value.substring(0, position).split("\n");
      errorLine = lines.length;
    }

    return {
      valid: false,
      error: error.message,
      errorLine,
    };
  }
}

/**
 * Format JSON with proper indentation
 */
function formatJson(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

/**
 * Minify JSON
 */
function _minifyJson(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed);
  } catch {
    return value;
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Template selector dropdown grouped by category
 */
const TemplateSelectorComponent = memo(function TemplateSelector({
  onSelect,
}: {
  onSelect: (template: SampleDataTemplate) => void;
}) {
  const categories = getSampleDataCategories();
  const [value, setValue] = useState<string>("");

  const handleSelect = useCallback(
    (templateId: string) => {
      setValue(templateId);
      const template = getSampleDataById(templateId);
      if (template) {
        onSelect(template);
      }
    },
    [onSelect]
  );

  return (
    <Select value={value} onValueChange={handleSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a sample template..." />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <div key={category.category}>
            <div className="text-muted-foreground px-2 py-1.5 text-xs font-semibold">
              {category.label}
            </div>
            {category.templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex flex-col">
                  <span>{template.name}</span>
                </div>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
});

/**
 * JSON validation status indicator
 */
const ValidationStatus = memo(function ValidationStatus({
  validation,
}: {
  validation: JsonValidationResult;
}) {
  if (validation.valid) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <Check className="h-3.5 w-3.5" />
        <span>Valid JSON</span>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>
            Invalid JSON
            {validation.errorLine && ` (line ${validation.errorLine})`}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-80">
        <p className="text-xs">{validation.error}</p>
      </TooltipContent>
    </Tooltip>
  );
});

/**
 * Expression path preview - shows available data paths
 */
const ExpressionPreview = memo(function ExpressionPreview({
  data,
}: {
  data: Record<string, unknown>;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([""]));

  const paths = useMemo(() => {
    const result: {
      path: string;
      value: unknown;
      type: string;
      depth: number;
    }[] = [];

    function traverse(obj: unknown, currentPath: string, depth: number) {
      if (depth > 5) return; // Limit depth to prevent infinite loops

      if (obj === null) {
        result.push({ path: currentPath, value: null, type: "null", depth });
        return;
      }

      if (Array.isArray(obj)) {
        result.push({
          path: currentPath,
          value: `Array[${obj.length}]`,
          type: "array",
          depth,
        });
        if (obj.length > 0 && expanded.has(currentPath)) {
          // Show first item structure
          traverse(obj[0], `${currentPath}[0]`, depth + 1);
        }
        return;
      }

      if (typeof obj === "object") {
        result.push({
          path: currentPath,
          value: "{...}",
          type: "object",
          depth,
        });
        if (expanded.has(currentPath)) {
          Object.entries(obj).forEach(([key, value]) => {
            const newPath = currentPath ? `${currentPath}.${key}` : key;
            traverse(value, newPath, depth + 1);
          });
        }
        return;
      }

      const type = typeof obj;
      const displayValue =
        type === "string" && String(obj).length > 30
          ? `"${String(obj).substring(0, 30)}..."`
          : type === "string"
            ? `"${obj}"`
            : String(obj);

      result.push({ path: currentPath, value: displayValue, type, depth });
    }

    traverse(data, "", 0);
    return result.filter((p) => p.path !== "");
  }, [data, expanded]);

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const copyPath = useCallback((path: string) => {
    const expression = `{{ ${path} }}`;
    navigator.clipboard.writeText(expression);
  }, []);

  if (Object.keys(data).length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8 text-center text-sm">
        <Database className="h-8 w-8 opacity-50" />
        <p>No data available</p>
        <p className="text-xs">Add test data or select a sample template</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 font-mono text-xs">
      {paths.map((item) => {
        const isExpandable = item.type === "object" || item.type === "array";
        const isExpanded = expanded.has(item.path);

        return (
          <div
            key={item.path}
            className="hover:bg-muted/50 group flex items-center gap-1 rounded px-1 py-0.5"
            style={{ paddingLeft: `${item.depth * 12 + 4}px` }}
          >
            {isExpandable ? (
              <button
                onClick={() => toggleExpand(item.path)}
                className="text-muted-foreground hover:text-foreground flex h-4 w-4 items-center justify-center"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <span className="text-blue-600 dark:text-blue-400">
              {item.path.split(".").pop()}
            </span>
            <span className="text-muted-foreground">:</span>
            <span
              className={cn(
                "truncate",
                item.type === "string" && "text-green-600 dark:text-green-400",
                item.type === "number" &&
                  "text-orange-600 dark:text-orange-400",
                item.type === "boolean" &&
                  "text-purple-600 dark:text-purple-400",
                (item.type === "object" || item.type === "array") &&
                  "text-muted-foreground",
                item.type === "null" && "text-muted-foreground italic"
              )}
            >
              {String(item.value)}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => copyPath(item.path)}
                  className="text-muted-foreground hover:text-foreground ml-auto opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">Copy as expression</p>
              </TooltipContent>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
});

/**
 * Simple JSON textarea editor with syntax highlighting via a code-like appearance
 */
const JsonEditor = memo(function JsonEditor({
  value,
  onChange,
  validation,
  height = 300,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  validation: JsonValidationResult;
  height?: number;
  disabled?: boolean;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const lineCount = value.split("\n").length;
  const lineNumbers = Array.from(
    { length: Math.max(lineCount, 10) },
    (_, i) => i + 1
  );

  return (
    <div
      className={cn(
        "border-input bg-muted/30 flex overflow-hidden rounded-md border font-mono text-sm",
        !validation.valid && "border-red-500 dark:border-red-400"
      )}
      style={{ height }}
    >
      {/* Line numbers */}
      <div className="bg-muted/50 text-muted-foreground border-r px-2 py-2 text-right text-xs select-none">
        {lineNumbers.map((num) => (
          <div
            key={num}
            className={cn(
              "h-5 leading-5",
              validation.errorLine === num && "bg-red-500/20 text-red-600"
            )}
          >
            {num}
          </div>
        ))}
      </div>
      {/* Editor */}
      <textarea
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          "text-foreground flex-1 resize-none bg-transparent p-2 leading-5 focus:outline-none",
          disabled && "cursor-not-allowed opacity-50"
        )}
        spellCheck={false}
        placeholder='{\n  "key": "value"\n}'
      />
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * TestDataPanel - Main component for editing test data
 */
export const TestDataPanel = memo(function TestDataPanel({
  className,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  editorHeight = 300,
  showTemplateSelector = true,
  showExpressionPreview = true,
}: TestDataPanelProps) {
  // State
  const [isCollapsed, setIsCollapsed] = useState(controlledCollapsed ?? false);
  const [jsonValue, setJsonValue] = useState("");
  const [validation, setValidation] = useState<JsonValidationResult>({
    valid: true,
  });
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [hasChanges, setHasChanges] = useState(false);

  // Store
  const testData = useTemplateTestData();
  const updateTestData = useTemplateStore((state) => state.updateTestData);
  const template = useTemplateStore((state) => state.template);

  // Sync collapsed state
  const collapsed = controlledCollapsed ?? isCollapsed;
  const setCollapsed = useCallback(
    (value: boolean) => {
      setIsCollapsed(value);
      onCollapsedChange?.(value);
    },
    [onCollapsedChange]
  );

  // Track if we're syncing from external source
  const lastSyncedRef = useRef<string>("");
  const isExternalSync = useRef(false);

  // Sync from store when testData changes externally (via useEffect with queueMicrotask)
  useEffect(() => {
    const testDataString = JSON.stringify(testData);

    // Only sync if data changed externally (not from our own updates)
    if (testDataString !== lastSyncedRef.current && !hasChanges) {
      lastSyncedRef.current = testDataString;
      isExternalSync.current = true;

      // Use queueMicrotask to defer state update
      queueMicrotask(() => {
        const newValue =
          testData && Object.keys(testData).length > 0
            ? JSON.stringify(testData, null, 2)
            : "";
        setJsonValue(newValue);
        setValidation({ valid: true });
        isExternalSync.current = false;
      });
    }
  }, [testData, hasChanges]);

  // Handle JSON value change
  const handleJsonChange = useCallback((value: string) => {
    setJsonValue(value);
    const result = validateJson(value);
    setValidation(result);
    setHasChanges(true);
  }, []);

  // Apply changes to store
  const handleApply = useCallback(() => {
    if (!validation.valid) return;

    try {
      const parsed = jsonValue.trim() ? JSON.parse(jsonValue) : {};
      updateTestData(parsed);
      setHasChanges(false);
    } catch {
      // Should not happen since we validate
    }
  }, [jsonValue, validation.valid, updateTestData]);

  // Format JSON
  const handleFormat = useCallback(() => {
    const formatted = formatJson(jsonValue);
    setJsonValue(formatted);
    setValidation(validateJson(formatted));
  }, [jsonValue]);

  // Clear data
  const handleClear = useCallback(() => {
    setJsonValue("");
    setValidation({ valid: true });
    setHasChanges(true);
  }, []);

  // Load sample template
  const handleLoadTemplate = useCallback((template: SampleDataTemplate) => {
    const formatted = JSON.stringify(template.data, null, 2);
    setJsonValue(formatted);
    setValidation({ valid: true });
    setHasChanges(true);
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(jsonValue);
  }, [jsonValue]);

  // Download as JSON file
  const handleDownload = useCallback(() => {
    const blob = new Blob([jsonValue], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-data-${template?.name || "template"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [jsonValue, template?.name]);

  // Import from file
  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setJsonValue(content);
          const result = validateJson(content);
          setValidation(result);
          setHasChanges(true);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  // Parse data for preview
  const parsedData = useMemo(() => {
    if (!jsonValue.trim()) return {};
    try {
      return JSON.parse(jsonValue) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [jsonValue]);

  if (!template) {
    return (
      <div className={cn("bg-background border-t p-4", className)}>
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8 text-center text-sm">
          <FileJson className="h-8 w-8 opacity-50" />
          <p>No template loaded</p>
          <p className="text-xs">Open a template to edit test data</p>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
      <div className={cn("bg-background border-t", className)}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-2 text-sm font-medium">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Test Data</span>
              {hasChanges && (
                <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                  Unsaved
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "text-muted-foreground h-4 w-4 transition-transform duration-200",
                collapsed && "-rotate-90"
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-3 px-4 pb-4">
            {/* Template selector and info */}
            {showTemplateSelector && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Load Sample Data</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="text-muted-foreground h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-60">
                      <p className="text-xs">
                        Select a pre-built sample data template to quickly
                        populate test data. Use expressions like{" "}
                        {"{{ customer.name }}"} in your components.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <TemplateSelectorComponent onSelect={handleLoadTemplate} />
              </div>
            )}

            {/* Tabs for Editor and Preview */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "editor" | "preview")}
            >
              <div className="flex items-center justify-between">
                <TabsList className="h-8">
                  <TabsTrigger value="editor" className="h-7 px-3 text-xs">
                    <FileJson className="mr-1.5 h-3.5 w-3.5" />
                    JSON Editor
                  </TabsTrigger>
                  {showExpressionPreview && (
                    <TabsTrigger value="preview" className="h-7 px-3 text-xs">
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Data Paths
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Validation status */}
                <ValidationStatus validation={validation} />
              </div>

              <TabsContent value="editor" className="mt-2">
                {/* Editor toolbar */}
                <div className="mb-2 flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleFormat}
                        disabled={!jsonValue.trim()}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Format JSON</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleCopy}
                        disabled={!jsonValue.trim()}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy to clipboard</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleImport}
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Import from file</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleDownload}
                        disabled={!jsonValue.trim() || !validation.valid}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download as JSON</TooltipContent>
                  </Tooltip>

                  <div className="flex-1" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-7 w-7"
                        onClick={handleClear}
                        disabled={!jsonValue.trim()}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear all data</TooltipContent>
                  </Tooltip>
                </div>

                {/* JSON Editor */}
                <JsonEditor
                  value={jsonValue}
                  onChange={handleJsonChange}
                  validation={validation}
                  height={editorHeight}
                />

                {/* Apply button */}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-muted-foreground text-xs">
                    Use expressions like{" "}
                    <code className="bg-muted rounded px-1">
                      {"{{ path.to.field }}"}
                    </code>{" "}
                    in your components
                  </p>
                  <Button
                    size="sm"
                    onClick={handleApply}
                    disabled={!validation.valid || !hasChanges}
                    className="gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Apply Changes
                  </Button>
                </div>
              </TabsContent>

              {showExpressionPreview && (
                <TabsContent value="preview" className="mt-2">
                  <div className="text-muted-foreground mb-2 text-xs">
                    Click the copy icon to copy a field path as an expression
                  </div>
                  <ScrollArea className="border-input h-75 rounded-md border">
                    <div className="p-2">
                      <ExpressionPreview data={parsedData} />
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});

// Default export
export default TestDataPanel;

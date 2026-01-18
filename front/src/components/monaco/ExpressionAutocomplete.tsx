/**
 * ExpressionAutocomplete
 * Enhanced autocomplete provider for Monaco editor with hierarchical data field suggestions
 *
 * Features:
 * - Hierarchical data field completion (supports nested objects)
 * - Context-aware suggestions (only inside {{ }} blocks)
 * - Type-based icons and descriptions
 * - Built-in function suggestions
 * - Sample data extraction for field inference
 */

import type { editor, languages, IDisposable, Position } from "monaco-editor";
import type * as monacoEditor from "monaco-editor";
import type { DataField } from "./MonacoExpressionEditor";

// ============================================================================
// Types
// ============================================================================

/**
 * Monaco instance type - represents the Monaco editor namespace
 */
type Monaco = typeof monacoEditor;

/**
 * Autocomplete configuration
 */
export interface AutocompleteConfig {
  /** Available data fields */
  dataFields: DataField[];
  /** Whether to include built-in functions */
  includeBuiltinFunctions?: boolean;
  /** Whether to include page context variables (currentPage, totalPages, etc.) */
  includePageVariables?: boolean;
  /** Current editing mode - affects page variable suggestions */
  editingMode?: "content" | "header" | "footer";
  /** Trigger characters for autocomplete */
  triggerCharacters?: string[];
}

/**
 * Built-in function definition for autocomplete
 */
interface BuiltinFunction {
  name: string;
  signature: string;
  description: string;
  returnType: string;
}

// ============================================================================
// Built-in Functions (matching backend DynamicExpresso)
// ============================================================================

/**
 * Built-in functions available in expressions
 * These are functions supported by the backend expression evaluator
 */
const BUILTIN_FUNCTIONS: BuiltinFunction[] = [
  // String functions
  {
    name: "ToUpper",
    signature: "string.ToUpper()",
    description: "Converts string to uppercase",
    returnType: "string",
  },
  {
    name: "ToLower",
    signature: "string.ToLower()",
    description: "Converts string to lowercase",
    returnType: "string",
  },
  {
    name: "Trim",
    signature: "string.Trim()",
    description: "Removes leading and trailing whitespace",
    returnType: "string",
  },
  {
    name: "Substring",
    signature: "string.Substring(startIndex, length?)",
    description: "Extracts part of a string",
    returnType: "string",
  },
  {
    name: "Replace",
    signature: "string.Replace(oldValue, newValue)",
    description: "Replaces occurrences of a string",
    returnType: "string",
  },
  {
    name: "Contains",
    signature: "string.Contains(value)",
    description: "Checks if string contains a value",
    returnType: "boolean",
  },
  {
    name: "StartsWith",
    signature: "string.StartsWith(value)",
    description: "Checks if string starts with a value",
    returnType: "boolean",
  },
  {
    name: "EndsWith",
    signature: "string.EndsWith(value)",
    description: "Checks if string ends with a value",
    returnType: "boolean",
  },
  {
    name: "Length",
    signature: "string.Length",
    description: "Gets the length of the string",
    returnType: "number",
  },
  // Math functions
  {
    name: "Math.Round",
    signature: "Math.Round(value, decimals?)",
    description: "Rounds a number to specified decimals",
    returnType: "number",
  },
  {
    name: "Math.Floor",
    signature: "Math.Floor(value)",
    description: "Rounds down to nearest integer",
    returnType: "number",
  },
  {
    name: "Math.Ceiling",
    signature: "Math.Ceiling(value)",
    description: "Rounds up to nearest integer",
    returnType: "number",
  },
  {
    name: "Math.Abs",
    signature: "Math.Abs(value)",
    description: "Returns absolute value",
    returnType: "number",
  },
  {
    name: "Math.Min",
    signature: "Math.Min(a, b)",
    description: "Returns the smaller of two values",
    returnType: "number",
  },
  {
    name: "Math.Max",
    signature: "Math.Max(a, b)",
    description: "Returns the larger of two values",
    returnType: "number",
  },
  // Date functions
  {
    name: "DateTime.Now",
    signature: "DateTime.Now",
    description: "Gets current date and time",
    returnType: "DateTime",
  },
  {
    name: "DateTime.Today",
    signature: "DateTime.Today",
    description: "Gets current date (without time)",
    returnType: "DateTime",
  },
  {
    name: "ToString",
    signature: "value.ToString(format?)",
    description: "Converts value to string with optional format",
    returnType: "string",
  },
  // Collection functions
  {
    name: "Count",
    signature: "collection.Count()",
    description: "Gets the number of items in a collection",
    returnType: "number",
  },
  {
    name: "First",
    signature: "collection.First()",
    description: "Gets the first item in a collection",
    returnType: "any",
  },
  {
    name: "Last",
    signature: "collection.Last()",
    description: "Gets the last item in a collection",
    returnType: "any",
  },
  {
    name: "Sum",
    signature: "collection.Sum(selector?)",
    description: "Sums numeric values in a collection",
    returnType: "number",
  },
  // Type conversion
  {
    name: "Convert.ToInt32",
    signature: "Convert.ToInt32(value)",
    description: "Converts value to integer",
    returnType: "number",
  },
  {
    name: "Convert.ToDouble",
    signature: "Convert.ToDouble(value)",
    description: "Converts value to double",
    returnType: "number",
  },
  {
    name: "Convert.ToBoolean",
    signature: "Convert.ToBoolean(value)",
    description: "Converts value to boolean",
    returnType: "boolean",
  },
];

/**
 * Page context variable definition for autocomplete
 */
interface PageVariable {
  name: string;
  description: string;
  returnType: string;
  /** If true, this variable is only available/recommended in header/footer */
  headerFooterOnly?: boolean;
}

/**
 * Page context variables available in expressions
 * These are variables provided by the backend RenderContext for pagination
 */
const PAGE_VARIABLES: PageVariable[] = [
  {
    name: "currentPage",
    description: "Current page number (1-based)",
    returnType: "number",
    headerFooterOnly: true,
  },
  {
    name: "totalPages",
    description: "Total number of pages in the document",
    returnType: "number",
    headerFooterOnly: true,
  },
  {
    name: "section.name",
    description: "Current section name",
    returnType: "string",
    headerFooterOnly: false,
  },
  {
    name: "template.title",
    description: "Document/template title",
    returnType: "string",
    headerFooterOnly: false,
  },
  {
    name: "template.createdDate",
    description: "Template creation date",
    returnType: "DateTime",
    headerFooterOnly: false,
  },
  {
    name: "template.updatedDate",
    description: "Template last update date",
    returnType: "DateTime",
    headerFooterOnly: false,
  },
];

/**
 * Keywords available in expressions
 */
const EXPRESSION_KEYWORDS: string[] = [
  "data",
  "true",
  "false",
  "null",
  "new",
  "if",
  "else",
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get Monaco completion item kind based on field type
 */
function getCompletionKind(
  monaco: Monaco,
  type: DataField["type"]
): languages.CompletionItemKind {
  switch (type) {
    case "string":
      return monaco.languages.CompletionItemKind.Text;
    case "number":
      return monaco.languages.CompletionItemKind.Value;
    case "boolean":
      return monaco.languages.CompletionItemKind.Keyword;
    case "array":
      return monaco.languages.CompletionItemKind.Struct;
    case "object":
      return monaco.languages.CompletionItemKind.Class;
    case "date":
      return monaco.languages.CompletionItemKind.Property;
    default:
      return monaco.languages.CompletionItemKind.Variable;
  }
}

/**
 * Check if cursor is inside an expression block
 */
function isInsideExpression(
  model: editor.ITextModel,
  position: Position
): { isInside: boolean; expressionStart: number } {
  const lineContent = model.getLineContent(position.lineNumber);
  const beforeCursor = lineContent.substring(0, position.column - 1);

  const lastOpen = beforeCursor.lastIndexOf("{{");
  const lastClose = beforeCursor.lastIndexOf("}}");

  return {
    isInside: lastOpen !== -1 && lastOpen > lastClose,
    expressionStart: lastOpen,
  };
}

/**
 * Get the current word being typed with context
 */
function getWordContext(
  model: editor.ITextModel,
  position: Position
): { prefix: string; word: string; isAfterDot: boolean } {
  const lineContent = model.getLineContent(position.lineNumber);
  const beforeCursor = lineContent.substring(0, position.column - 1);

  // Find the current word and any prefix (for nested access)
  const match = beforeCursor.match(
    /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\.?([a-zA-Z_][a-zA-Z0-9_]*)?$/
  );

  if (match) {
    const fullPath = match[0];
    const isAfterDot =
      fullPath.endsWith(".") || Boolean(match[2] && fullPath.includes("."));
    const parts = fullPath.replace(/\.$/, "").split(".");
    const word = parts.pop() || "";
    const prefix = parts.join(".");

    return { prefix, word, isAfterDot };
  }

  return { prefix: "", word: "", isAfterDot: false };
}

/**
 * Filter data fields based on prefix path
 */
function filterFieldsByPrefix(
  fields: DataField[],
  prefix: string
): DataField[] {
  if (!prefix) {
    // Return top-level fields
    return fields.filter(
      (f) => !f.path.includes(".") || f.path.startsWith("data.")
    );
  }

  // Return fields that match the prefix and have one more segment
  const prefixWithDot = prefix + ".";
  const matchingFields: DataField[] = [];

  for (const field of fields) {
    if (field.path.startsWith(prefixWithDot)) {
      const remainingPath = field.path.substring(prefixWithDot.length);
      const nextSegment = remainingPath.split(".")[0];

      // Check if we already have this segment
      const alreadyAdded = matchingFields.some(
        (f) => f.path === `${prefix}.${nextSegment}`
      );

      if (!alreadyAdded) {
        matchingFields.push({
          ...field,
          path: `${prefix}.${nextSegment}`,
          label: nextSegment,
        });
      }
    }
  }

  return matchingFields;
}

/**
 * Extract data fields from sample data object
 * Recursively flattens nested objects into field paths
 */
export function extractDataFieldsFromSampleData(
  data: Record<string, unknown>,
  prefix = "data"
): DataField[] {
  const fields: DataField[] = [];

  function processValue(value: unknown, path: string, key: string): void {
    if (value === null || value === undefined) {
      fields.push({
        path,
        label: key,
        type: "string",
        description: "Nullable field",
      });
      return;
    }

    if (Array.isArray(value)) {
      fields.push({
        path,
        label: key,
        type: "array",
        description: `Array with ${value.length} items`,
      });

      // Also add array item fields if array has items
      if (
        value.length > 0 &&
        typeof value[0] === "object" &&
        value[0] !== null
      ) {
        const itemPrefix = `${path}[0]`;
        for (const [itemKey, itemValue] of Object.entries(
          value[0] as Record<string, unknown>
        )) {
          processValue(itemValue, `${itemPrefix}.${itemKey}`, itemKey);
        }
      }
      return;
    }

    if (typeof value === "object" && value !== null) {
      // Check if it's a Date
      if (
        value instanceof Date ||
        typeof (value as { toISOString?: unknown }).toISOString === "function"
      ) {
        fields.push({
          path,
          label: key,
          type: "date",
          description: "Date value",
        });
        return;
      }

      fields.push({
        path,
        label: key,
        type: "object",
        description: "Nested object",
      });

      // Recurse into object
      for (const [childKey, childValue] of Object.entries(
        value as Record<string, unknown>
      )) {
        processValue(childValue, `${path}.${childKey}`, childKey);
      }
      return;
    }

    // Primitive types
    let type: DataField["type"] = "string";
    if (typeof value === "number") {
      type = "number";
    } else if (typeof value === "boolean") {
      type = "boolean";
    }

    fields.push({
      path,
      label: key,
      type,
      description: `${type} value`,
    });
  }

  // Start with 'data' as root
  fields.push({
    path: "data",
    label: "data",
    type: "object",
    description: "Root data object",
  });

  // Process all top-level keys
  for (const [key, value] of Object.entries(data)) {
    processValue(value, `${prefix}.${key}`, key);
  }

  return fields;
}

// ============================================================================
// Autocomplete Provider
// ============================================================================

/**
 * Create and register an autocomplete provider for the expression language
 */
export function registerExpressionAutocomplete(
  monaco: Monaco,
  languageId: string,
  config: AutocompleteConfig
): IDisposable {
  const {
    dataFields,
    includeBuiltinFunctions = true,
    includePageVariables = true,
    editingMode = "content",
    triggerCharacters = [".", "{"],
  } = config;

  // Determine if we're in header/footer mode
  const isHeaderFooterMode =
    editingMode === "header" || editingMode === "footer";

  return monaco.languages.registerCompletionItemProvider(languageId, {
    triggerCharacters,

    provideCompletionItems(
      model: editor.ITextModel,
      position: Position
    ): languages.ProviderResult<languages.CompletionList> {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Check if we're inside an expression block
      const { isInside } = isInsideExpression(model, position);
      if (!isInside) {
        // Suggest opening expression block
        const lineContent = model.getLineContent(position.lineNumber);
        const charBefore = lineContent[position.column - 2];

        if (charBefore === "{") {
          return {
            suggestions: [
              {
                label: "{{ expression }}",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: "{ $1 }}",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: "Expression block",
                documentation:
                  "Insert an expression block. Use data.fieldName to access data.",
                range,
              },
            ],
          };
        }
        return { suggestions: [] };
      }

      const suggestions: languages.CompletionItem[] = [];
      const context = getWordContext(model, position);

      // Filter fields based on current context
      const relevantFields = filterFieldsByPrefix(dataFields, context.prefix);

      // Add data field suggestions
      for (const field of relevantFields) {
        const displayLabel = context.prefix
          ? field.path.substring(context.prefix.length + 1)
          : field.path;

        suggestions.push({
          label: displayLabel,
          kind: getCompletionKind(monaco, field.type),
          insertText: displayLabel,
          detail: field.type,
          documentation: field.description || `Access ${field.path}`,
          range,
          sortText: `0_${displayLabel}`, // Prioritize data fields
        });
      }

      // Add page context variables if enabled and not after a dot (unless it's for section/template)
      if (
        includePageVariables &&
        (!context.isAfterDot ||
          context.prefix === "section" ||
          context.prefix === "template")
      ) {
        for (const pageVar of PAGE_VARIABLES) {
          // Check if variable name matches current prefix context
          if (context.prefix) {
            // If we have a prefix, only show variables that start with that prefix
            if (!pageVar.name.startsWith(context.prefix + ".")) continue;
          }

          // Check if the current word matches the variable name
          const displayName = context.prefix
            ? pageVar.name.substring(context.prefix.length + 1)
            : pageVar.name;

          if (
            context.word &&
            !displayName.toLowerCase().startsWith(context.word.toLowerCase())
          ) {
            continue;
          }

          // Calculate sort priority - prioritize page vars in header/footer mode
          const priorityPrefix = isHeaderFooterMode
            ? pageVar.headerFooterOnly
              ? "00" // Highest priority for page-specific vars in header/footer
              : "01"
            : pageVar.headerFooterOnly
              ? "3" // Lower priority for page-specific vars in content mode
              : "1";

          // Add visual indicator for header/footer only variables
          const headerFooterBadge = pageVar.headerFooterOnly ? " 📄" : "";
          const modeHint = pageVar.headerFooterOnly
            ? "\n\n*Best used in headers/footers*"
            : "";

          suggestions.push({
            label: displayName + headerFooterBadge,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: displayName,
            detail: `Page: ${pageVar.returnType}`,
            documentation: {
              value: `${pageVar.description}${modeHint}\n\n**Returns:** ${pageVar.returnType}`,
            },
            range,
            sortText: `${priorityPrefix}_${displayName}`,
            // Add a tag to distinguish page variables
            tags: pageVar.headerFooterOnly
              ? [monaco.languages.CompletionItemTag.Deprecated] // Visual indicator (strikethrough won't apply, but it marks it)
              : undefined,
          });
        }
      }

      // Add built-in functions if enabled and not after a dot with data
      if (
        includeBuiltinFunctions &&
        (!context.isAfterDot ||
          context.prefix === "Math" ||
          context.prefix === "Convert" ||
          context.prefix === "DateTime")
      ) {
        const functionPrefix = context.prefix;

        for (const func of BUILTIN_FUNCTIONS) {
          // Filter by prefix for namespaced functions
          if (functionPrefix) {
            if (!func.name.startsWith(functionPrefix + ".")) continue;
          }

          const displayName = functionPrefix
            ? func.name.substring(functionPrefix.length + 1)
            : func.name;

          suggestions.push({
            label: displayName,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: displayName.includes("(") ? displayName : displayName,
            detail: func.signature,
            documentation: {
              value: `${func.description}\n\n**Returns:** ${func.returnType}`,
            },
            range,
            sortText: `1_${displayName}`, // After data fields
          });
        }
      }

      // Add keywords if at start of expression or after operators
      if (!context.isAfterDot) {
        for (const keyword of EXPRESSION_KEYWORDS) {
          if (
            !context.word ||
            keyword.toLowerCase().startsWith(context.word.toLowerCase())
          ) {
            suggestions.push({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              detail: "Keyword",
              range,
              sortText: `2_${keyword}`, // After functions
            });
          }
        }
      }

      return { suggestions };
    },
  });
}

// ============================================================================
// Hover Provider
// ============================================================================

/**
 * Create and register a hover provider for expression fields
 */
export function registerExpressionHoverProvider(
  monaco: Monaco,
  languageId: string,
  dataFields: DataField[]
): IDisposable {
  return monaco.languages.registerHoverProvider(languageId, {
    provideHover(
      model: editor.ITextModel,
      position: Position
    ): languages.ProviderResult<languages.Hover> {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      // Check if inside expression
      const { isInside } = isInsideExpression(model, position);
      if (!isInside) return null;

      // Find matching data field
      const lineContent = model.getLineContent(position.lineNumber);

      // Try to extract the full path at this position
      const beforeWord = lineContent.substring(0, word.startColumn - 1);
      const pathMatch = beforeWord.match(
        /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\.$/
      );
      const prefix = pathMatch ? pathMatch[1] : "";
      const fullPath = prefix ? `${prefix}.${word.word}` : word.word;

      // Find field
      const field = dataFields.find((f) => f.path === fullPath);
      if (field) {
        return {
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          },
          contents: [
            { value: `**${field.path}**` },
            { value: `Type: \`${field.type}\`` },
            ...(field.description ? [{ value: field.description }] : []),
          ],
        };
      }

      // Check for built-in function
      const func = BUILTIN_FUNCTIONS.find(
        (f) =>
          f.name === fullPath ||
          f.name === word.word ||
          (prefix && f.name === `${prefix}.${word.word}`)
      );
      if (func) {
        return {
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          },
          contents: [
            { value: `**${func.name}**` },
            { value: `\`${func.signature}\`` },
            { value: func.description },
            { value: `Returns: \`${func.returnType}\`` },
          ],
        };
      }

      // Check for page context variable
      const pageVar = PAGE_VARIABLES.find(
        (v) =>
          v.name === fullPath ||
          v.name === word.word ||
          (prefix && v.name === `${prefix}.${word.word}`)
      );
      if (pageVar) {
        const headerFooterNote = pageVar.headerFooterOnly
          ? "\n\n*📄 Best used in headers/footers for page numbering*"
          : "";
        return {
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          },
          contents: [
            { value: `**${pageVar.name}** *(Page Context)*` },
            { value: pageVar.description + headerFooterNote },
            { value: `Returns: \`${pageVar.returnType}\`` },
          ],
        };
      }

      return null;
    },
  });
}

// ============================================================================
// Exports
// ============================================================================

export { BUILTIN_FUNCTIONS, EXPRESSION_KEYWORDS, PAGE_VARIABLES };
export type { PageVariable };

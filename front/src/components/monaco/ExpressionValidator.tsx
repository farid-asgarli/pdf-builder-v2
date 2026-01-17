/**
 * ExpressionValidator
 * Client-side expression validation that mirrors backend rules
 *
 * Features:
 * - Syntax validation for {{ expression }} blocks
 * - Security pattern detection
 * - Bracket balance checking
 * - Nesting depth validation
 * - Position-aware error reporting
 * - Real-time validation for Monaco editor
 */

import type { ExpressionError } from "./MonacoExpressionEditor";

// ============================================================================
// Constants (mirroring backend ExpressionValidator)
// ============================================================================

/**
 * Maximum allowed expression length
 */
const MAX_EXPRESSION_LENGTH = 2048;

/**
 * Maximum nesting depth for expressions
 */
const MAX_NESTING_DEPTH = 10;

/**
 * Patterns that are forbidden for security reasons
 * Mirrors backend PDFBuilder.Validation.Validators.ExpressionValidator
 */
const FORBIDDEN_PATTERNS: string[] = [
  "System.Reflection",
  "System.IO",
  "System.Diagnostics",
  "System.Runtime",
  "System.Net",
  "System.Security",
  "Process",
  "Assembly",
  "AppDomain",
  "Environment.Exit",
  "Environment.GetEnvironmentVariable",
  "File.",
  "Directory.",
  "Path.",
  "typeof(",
  "GetType(",
  "Activator.",
  "MethodInfo",
  "FieldInfo",
  "PropertyInfo",
  "Invoke(",
  "DynamicInvoke",
  "Emit",
  "Marshal",
  "GCHandle",
  "unsafe",
  "fixed(",
  "stackalloc",
  "__arglist",
  "__makeref",
  "__reftype",
  "__refvalue",
];

/**
 * Patterns that trigger warnings but are allowed
 */
const WARNING_PATTERNS: string[] = [
  "while(",
  "for(",
  "foreach(",
  "do{",
  "goto",
  "Thread.",
  "Task.",
  "async",
  "await",
];

// Note: These patterns are kept for reference but actual parsing uses a different approach
// for more accurate position tracking
// const EXPRESSION_PATTERN = /\{\{([^}]*)\}\}/g;
// const UNCLOSED_START_PATTERN = /\{\{(?![^{]*\}\})/g;
// const ORPHAN_CLOSE_PATTERN = /(?<!\{\{[^}]*)\}\}/g;

// ============================================================================
// Types
// ============================================================================

/**
 * Validation result with detailed position info
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ExpressionError[];
  warnings: string[];
}

/**
 * Internal match info for tracking expression positions
 */
interface ExpressionMatch {
  fullMatch: string;
  content: string;
  startIndex: number;
  endIndex: number;
  lineNumber: number;
  startColumn: number;
  endColumn: number;
}

// ============================================================================
// Position Utilities
// ============================================================================

/**
 * Get line number and column from string index
 */
function getPositionFromIndex(
  text: string,
  index: number
): { lineNumber: number; column: number } {
  const beforeIndex = text.substring(0, index);
  const lines = beforeIndex.split("\n");
  const lineNumber = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { lineNumber, column };
}

/**
 * Find all expression matches with position information
 */
function findExpressionMatches(input: string): ExpressionMatch[] {
  const matches: ExpressionMatch[] = [];
  const regex = /\{\{([^}]*)\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;
    const startPos = getPositionFromIndex(input, startIndex);
    const endPos = getPositionFromIndex(input, endIndex);

    matches.push({
      fullMatch: match[0],
      content: match[1].trim(),
      startIndex,
      endIndex,
      lineNumber: startPos.lineNumber,
      startColumn: startPos.column,
      endColumn: endPos.column,
    });
  }

  return matches;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check for unclosed expression blocks
 */
function checkUnclosedExpressions(input: string): ExpressionError[] {
  const errors: ExpressionError[] = [];

  // Find {{ without matching }}
  let depth = 0;
  let startPos: { lineNumber: number; column: number } | null = null;

  for (let i = 0; i < input.length; i++) {
    if (input[i] === "{" && input[i + 1] === "{") {
      if (depth === 0) {
        startPos = getPositionFromIndex(input, i);
      }
      depth++;
      i++; // Skip second brace
    } else if (input[i] === "}" && input[i + 1] === "}") {
      depth--;
      if (depth < 0) {
        // Found }} without matching {{
        const pos = getPositionFromIndex(input, i);
        errors.push({
          message:
            "Unexpected closing braces '}}' without matching opening '{{'",
          lineNumber: pos.lineNumber,
          startColumn: pos.column,
          endColumn: pos.column + 2,
        });
        depth = 0;
      }
      i++; // Skip second brace
    }
  }

  // If we end with unclosed expressions
  if (depth > 0 && startPos) {
    errors.push({
      message: "Unclosed expression - missing closing '}}'",
      lineNumber: startPos.lineNumber,
      startColumn: startPos.column,
      endColumn: startPos.column + 2,
    });
  }

  return errors;
}

/**
 * Validate bracket balance within an expression
 */
function checkBracketBalance(
  expression: string,
  lineNumber: number,
  baseColumn: number
): ExpressionError[] {
  const errors: ExpressionError[] = [];
  const stack: { char: string; index: number }[] = [];
  const pairs: Record<string, string> = {
    "(": ")",
    "[": "]",
    "{": "}",
  };
  const openingBrackets = Object.keys(pairs);
  const closingBrackets = Object.values(pairs);

  let inString = false;
  let stringChar = "";

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];

    // Handle string literals
    if (
      (char === '"' || char === "'") &&
      (i === 0 || expression[i - 1] !== "\\")
    ) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (inString) continue;

    if (openingBrackets.includes(char)) {
      stack.push({ char, index: i });
    } else if (closingBrackets.includes(char)) {
      const expectedOpening = openingBrackets[closingBrackets.indexOf(char)];

      if (stack.length === 0) {
        errors.push({
          message: `Unexpected closing '${char}' without matching opening '${expectedOpening}'`,
          lineNumber,
          startColumn: baseColumn + i,
          endColumn: baseColumn + i + 1,
        });
      } else {
        const last = stack.pop()!;
        if (pairs[last.char] !== char) {
          errors.push({
            message: `Mismatched brackets: expected '${pairs[last.char]}' but found '${char}'`,
            lineNumber,
            startColumn: baseColumn + i,
            endColumn: baseColumn + i + 1,
          });
        }
      }
    }
  }

  // Check for unclosed brackets
  for (const unclosed of stack) {
    errors.push({
      message: `Unclosed '${unclosed.char}' - missing '${pairs[unclosed.char]}'`,
      lineNumber,
      startColumn: baseColumn + unclosed.index,
      endColumn: baseColumn + unclosed.index + 1,
    });
  }

  // Check for unclosed strings
  if (inString) {
    errors.push({
      message: `Unclosed string literal - missing closing ${stringChar}`,
      lineNumber,
      startColumn: baseColumn,
      endColumn: baseColumn + expression.length,
    });
  }

  return errors;
}

/**
 * Check for security-forbidden patterns
 */
function checkSecurityPatterns(
  expression: string,
  lineNumber: number,
  baseColumn: number
): ExpressionError[] {
  const errors: ExpressionError[] = [];

  for (const pattern of FORBIDDEN_PATTERNS) {
    const index = expression.toLowerCase().indexOf(pattern.toLowerCase());
    if (index !== -1) {
      errors.push({
        message: `Security violation: '${pattern}' is not allowed in expressions`,
        lineNumber,
        startColumn: baseColumn + index,
        endColumn: baseColumn + index + pattern.length,
      });
    }
  }

  return errors;
}

/**
 * Check for warning patterns (allowed but discouraged)
 */
function checkWarningPatterns(expression: string): string[] {
  const warnings: string[] = [];

  for (const pattern of WARNING_PATTERNS) {
    if (expression.toLowerCase().includes(pattern.toLowerCase())) {
      warnings.push(
        `Pattern '${pattern}' may cause performance issues or unexpected behavior`
      );
    }
  }

  return warnings;
}

/**
 * Check expression length
 */
function checkExpressionLength(
  expression: string,
  lineNumber: number,
  startColumn: number,
  endColumn: number
): ExpressionError | null {
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    return {
      message: `Expression exceeds maximum length of ${MAX_EXPRESSION_LENGTH} characters`,
      lineNumber,
      startColumn,
      endColumn,
    };
  }
  return null;
}

/**
 * Check nesting depth of expression
 */
function checkNestingDepth(
  expression: string,
  lineNumber: number,
  baseColumn: number
): ExpressionError | null {
  let maxDepth = 0;
  let currentDepth = 0;
  let maxDepthIndex = 0;

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    if (char === "(" || char === "[" || char === "{") {
      currentDepth++;
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
        maxDepthIndex = i;
      }
    } else if (char === ")" || char === "]" || char === "}") {
      currentDepth--;
    }
  }

  if (maxDepth > MAX_NESTING_DEPTH) {
    return {
      message: `Expression nesting depth (${maxDepth}) exceeds maximum of ${MAX_NESTING_DEPTH}`,
      lineNumber,
      startColumn: baseColumn + maxDepthIndex,
      endColumn: baseColumn + maxDepthIndex + 1,
    };
  }

  return null;
}

/**
 * Validate expression syntax (basic parsing)
 */
function validateSyntax(
  expression: string,
  lineNumber: number,
  baseColumn: number
): ExpressionError[] {
  const errors: ExpressionError[] = [];
  const trimmed = expression.trim();

  // Empty expression
  if (!trimmed) {
    errors.push({
      message: "Expression cannot be empty",
      lineNumber,
      startColumn: baseColumn,
      endColumn: baseColumn + 2,
    });
    return errors;
  }

  // Check for common syntax errors
  const syntaxPatterns: { pattern: RegExp; message: string }[] = [
    {
      pattern: /\.\./,
      message: "Invalid syntax: consecutive dots '..'",
    },
    {
      pattern: /^\./,
      message: "Expression cannot start with a dot",
    },
    {
      pattern: /\.$/,
      message: "Expression cannot end with a dot",
    },
    {
      pattern: /\(\s*\)/,
      message: "Empty function call '()' - missing arguments or expression",
    },
    {
      pattern: /\[\s*\]/,
      message: "Empty index access '[]' - missing index expression",
    },
    {
      pattern: /,\s*,/,
      message: "Consecutive commas - missing value between commas",
    },
    {
      pattern: /,\s*\)/,
      message: "Trailing comma before closing parenthesis",
    },
    {
      pattern: /\(\s*,/,
      message: "Leading comma after opening parenthesis",
    },
    {
      pattern: /[+\-*/%]\s*[+\-*/%]/,
      message: "Consecutive operators without operand",
    },
    {
      pattern: /^[+*/%]/,
      message: "Expression cannot start with an operator (except unary minus)",
    },
    {
      pattern: /[+\-*/%]$/,
      message: "Expression cannot end with an operator",
    },
  ];

  for (const { pattern, message } of syntaxPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const index = match.index ?? 0;
      errors.push({
        message,
        lineNumber,
        startColumn: baseColumn + index,
        endColumn: baseColumn + index + match[0].length,
      });
    }
  }

  // Note: Field path validation could be enhanced here to validate against known data fields
  // For now, basic syntax validation is sufficient

  return errors;
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate an entire input string containing expressions
 * Returns detailed error information for Monaco editor integration
 */
export function validateExpressions(input: string): ValidationResult {
  const errors: ExpressionError[] = [];
  const warnings: string[] = [];

  if (!input || input.trim() === "") {
    return { isValid: true, errors: [], warnings: [] };
  }

  // Check for unclosed expression blocks first
  const unclosedErrors = checkUnclosedExpressions(input);
  errors.push(...unclosedErrors);

  // If we have structural issues, don't continue with detailed validation
  if (unclosedErrors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Find and validate each expression block
  const matches = findExpressionMatches(input);

  for (const match of matches) {
    const expression = match.content;
    const baseColumn = match.startColumn + 2; // +2 for {{

    // Length check
    const lengthError = checkExpressionLength(
      expression,
      match.lineNumber,
      match.startColumn,
      match.endColumn
    );
    if (lengthError) {
      errors.push(lengthError);
      continue; // Skip other checks for this expression
    }

    // Bracket balance
    const bracketErrors = checkBracketBalance(
      expression,
      match.lineNumber,
      baseColumn
    );
    errors.push(...bracketErrors);

    // Security patterns
    const securityErrors = checkSecurityPatterns(
      expression,
      match.lineNumber,
      baseColumn
    );
    errors.push(...securityErrors);

    // Nesting depth
    const nestingError = checkNestingDepth(
      expression,
      match.lineNumber,
      baseColumn
    );
    if (nestingError) {
      errors.push(nestingError);
    }

    // Syntax validation
    const syntaxErrors = validateSyntax(
      expression,
      match.lineNumber,
      baseColumn
    );
    errors.push(...syntaxErrors);

    // Warning patterns
    const expressionWarnings = checkWarningPatterns(expression);
    warnings.push(...expressionWarnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single expression (without {{ }} wrapper)
 * Useful for validating raw expressions in property fields
 */
export function validateSingleExpression(expression: string): ValidationResult {
  const errors: ExpressionError[] = [];
  const warnings: string[] = [];

  if (!expression || expression.trim() === "") {
    errors.push({
      message: "Expression cannot be empty",
      lineNumber: 1,
      startColumn: 1,
      endColumn: 1,
    });
    return { isValid: false, errors, warnings };
  }

  const trimmed = expression.trim();
  const baseColumn = 1;
  const lineNumber = 1;

  // Length check
  const lengthError = checkExpressionLength(
    trimmed,
    lineNumber,
    baseColumn,
    trimmed.length
  );
  if (lengthError) {
    errors.push(lengthError);
    return { isValid: false, errors, warnings };
  }

  // Bracket balance
  errors.push(...checkBracketBalance(trimmed, lineNumber, baseColumn));

  // Security patterns
  errors.push(...checkSecurityPatterns(trimmed, lineNumber, baseColumn));

  // Nesting depth
  const nestingError = checkNestingDepth(trimmed, lineNumber, baseColumn);
  if (nestingError) {
    errors.push(nestingError);
  }

  // Syntax validation
  errors.push(...validateSyntax(trimmed, lineNumber, baseColumn));

  // Warning patterns
  warnings.push(...checkWarningPatterns(trimmed));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create a validation function for use with MonacoExpressionEditor
 * Returns a function that can be passed to the 'validate' prop
 */
export function createExpressionValidator(): (
  value: string
) => ExpressionError[] {
  return (value: string): ExpressionError[] => {
    const result = validateExpressions(value);
    return result.errors;
  };
}

// ============================================================================
// Exports
// ============================================================================

export { MAX_EXPRESSION_LENGTH, MAX_NESTING_DEPTH, FORBIDDEN_PATTERNS };

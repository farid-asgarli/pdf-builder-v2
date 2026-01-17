/**
 * SelectField Component
 * Dropdown select for enum/option properties
 *
 * Features:
 * - Dropdown with searchable options
 * - Keyboard navigation
 * - Expression support ({{ data.option }})
 * - Option groups support
 * - Custom option rendering
 * - Clearable selection
 */
"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useId,
  useMemo,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, CheckIcon, SearchIcon, XIcon } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Option type for select dropdown
 */
export interface SelectOption {
  /** Display label */
  label: string;
  /** Option value */
  value: string | number;
  /** Optional description */
  description?: string;
  /** Whether the option is disabled */
  disabled?: boolean;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Group name for grouped options */
  group?: string;
}

/**
 * Props for SelectField component
 */
export interface SelectFieldProps {
  /** Field label */
  label: string;
  /** Current value */
  value: string | number | undefined;
  /** Callback when value changes */
  onChange: (value: string | number | undefined) => void;
  /** Available options */
  options: readonly SelectOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Whether to allow empty/undefined values */
  allowEmpty?: boolean;
  /** Whether to show search filter */
  showSearch?: boolean;
  /** Whether the selection can be cleared */
  clearable?: boolean;
  /** Whether expression syntax is supported ({{ }}) */
  supportsExpression?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** ID for accessibility */
  id?: string;
  /** Help text shown below the input */
  helpText?: string;
  /** Error message to display */
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const EXPRESSION_REGEX = /\{\{[^}]*\}\}/;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a string contains expression syntax
 */
function containsExpression(value: string | number | undefined): boolean {
  if (typeof value !== "string") return false;
  return EXPRESSION_REGEX.test(value);
}

/**
 * Group options by their group property
 */
function groupOptions(
  options: readonly SelectOption[]
): Map<string | undefined, SelectOption[]> {
  const groups = new Map<string | undefined, SelectOption[]>();

  options.forEach((option) => {
    const group = option.group;
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(option);
  });

  return groups;
}

// ============================================================================
// Component
// ============================================================================

/**
 * SelectField - Dropdown select for enum/option properties
 */
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select option...",
  disabled = false,
  readOnly = false,
  allowEmpty: _allowEmpty = true,
  showSearch = true,
  clearable = true,
  supportsExpression = false,
  className,
  id,
  helpText,
  error,
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Generate unique ID
  const generatedId = useId();
  const fieldId = id ?? `select-field-${generatedId}`;
  const listboxId = `${fieldId}-listbox`;

  // Check if value is an expression
  const hasExpression =
    supportsExpression && value !== undefined && containsExpression(value);

  // Filter options based on search query - memoized to ensure stable reference for downstream memoization
  const filteredOptions = useMemo(
    () =>
      options.filter(
        (option) =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          option.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [options, searchQuery]
  );

  // Group filtered options
  const groupedOptions = groupOptions(filteredOptions);
  const hasGroups = Array.from(groupedOptions.keys()).some(
    (g) => g !== undefined
  );

  // Flatten filtered options for keyboard navigation - memoized for stability
  const flatOptions = useMemo(
    () => filteredOptions.filter((o) => !o.disabled),
    [filteredOptions]
  );

  // Get selected option label
  const selectedOption = options.find((o) => o.value === value);
  const displayValue =
    selectedOption?.label ?? (value !== undefined ? String(value) : "");

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch) {
      searchInputRef.current?.focus();
    }
  }, [isOpen, showSearch]);

  // Reset highlighted index when search changes
  // This is an intentional state synchronization pattern - when search query changes,
  // the highlighted index must reset to provide correct UX behavior
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.querySelector(
        '[data-highlighted="true"]'
      );
      highlightedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, isOpen]);

  /**
   * Toggle dropdown
   */
  const handleToggle = useCallback(() => {
    if (disabled || readOnly) return;
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearchQuery("");
      setHighlightedIndex(0);
    }
  }, [disabled, readOnly, isOpen]);

  /**
   * Select an option
   */
  const handleSelect = useCallback(
    (option: SelectOption) => {
      if (option.disabled || disabled || readOnly) return;
      onChange(option.value);
      setIsOpen(false);
      setSearchQuery("");
    },
    [disabled, readOnly, onChange]
  );

  /**
   * Clear selection
   */
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled || readOnly) return;
      onChange(undefined);
    },
    [disabled, readOnly, onChange]
  );

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled || readOnly) return;

      switch (e.key) {
        case "Enter":
          e.preventDefault();
          if (isOpen && flatOptions[highlightedIndex]) {
            handleSelect(flatOptions[highlightedIndex]);
          } else {
            setIsOpen(true);
          }
          break;

        case " ":
          if (!isOpen) {
            e.preventDefault();
            setIsOpen(true);
          }
          break;

        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery("");
          break;

        case "ArrowDown":
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) =>
              Math.min(prev + 1, flatOptions.length - 1)
            );
          } else {
            setIsOpen(true);
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          } else {
            setIsOpen(true);
          }
          break;

        case "Home":
          if (isOpen) {
            e.preventDefault();
            setHighlightedIndex(0);
          }
          break;

        case "End":
          if (isOpen) {
            e.preventDefault();
            setHighlightedIndex(flatOptions.length - 1);
          }
          break;
      }
    },
    [disabled, readOnly, isOpen, flatOptions, highlightedIndex, handleSelect]
  );

  /**
   * Render option item
   */
  const renderOption = (option: SelectOption, _index: number) => {
    const isSelected = option.value === value;
    const isHighlighted =
      flatOptions.indexOf(option) === highlightedIndex && !option.disabled;
    const flatIndex = flatOptions.indexOf(option);

    return (
      <div
        key={`${option.value}`}
        role="option"
        aria-selected={isSelected}
        aria-disabled={option.disabled}
        data-highlighted={isHighlighted}
        onClick={() => handleSelect(option)}
        onMouseEnter={() => {
          if (!option.disabled) {
            setHighlightedIndex(flatIndex >= 0 ? flatIndex : 0);
          }
        }}
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
          isHighlighted && "bg-accent text-accent-foreground",
          isSelected && "font-medium",
          option.disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {option.icon && <span className="shrink-0">{option.icon}</span>}
        <div className="min-w-0 flex-1">
          <div className="truncate">{option.label}</div>
          {option.description && (
            <div className="text-muted-foreground truncate text-xs">
              {option.description}
            </div>
          )}
        </div>
        {isSelected && <CheckIcon className="h-4 w-4 shrink-0" />}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={cn("space-y-2", className)}>
      {/* Label */}
      <Label
        htmlFor={fieldId}
        className={cn(
          "text-sm font-medium",
          disabled && "opacity-50",
          error && "text-destructive"
        )}
      >
        {label}
      </Label>

      {/* Select Trigger */}
      <div className="relative">
        <Button
          id={fieldId}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={cn(
            "border-input flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm",
            "ring-offset-background focus:ring-ring focus:ring-1 focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !displayValue && "text-muted-foreground",
            hasExpression && "font-mono text-xs",
            error && "border-destructive"
          )}
          variant="outline"
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <div className="flex items-center gap-1">
            {clearable && value !== undefined && !disabled && !readOnly && (
              <XIcon
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 opacity-50 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </Button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className={cn(
              "bg-popover absolute z-50 mt-1 w-full rounded-md border p-1 shadow-md",
              "animate-in fade-in-0 zoom-in-95"
            )}
          >
            {/* Search Input */}
            {showSearch && options.length > 5 && (
              <div className="relative mb-1">
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            )}

            {/* Options List */}
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={label}
              className="max-h-50 overflow-y-auto"
            >
              {filteredOptions.length === 0 ? (
                <div className="text-muted-foreground py-2 text-center text-sm">
                  No options found
                </div>
              ) : hasGroups ? (
                // Render grouped options
                Array.from(groupedOptions.entries()).map(
                  ([group, groupOptions]) => (
                    <div key={group ?? "ungrouped"}>
                      {group && (
                        <div className="text-muted-foreground px-2 py-1.5 text-xs font-semibold">
                          {group}
                        </div>
                      )}
                      {groupOptions.map((option, index) =>
                        renderOption(option, index)
                      )}
                    </div>
                  )
                )
              ) : (
                // Render flat options
                filteredOptions.map((option, index) =>
                  renderOption(option, index)
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      {helpText && !error && (
        <p className="text-muted-foreground text-xs">{helpText}</p>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Default export for convenience
export default SelectField;

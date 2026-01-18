using System.Text.Json;

namespace PDFBuilder.Core.Domain;

/// <summary>
/// Represents the runtime context for rendering a PDF layout.
/// Contains all data and state needed during the rendering process.
/// </summary>
public class RenderContext
{
    private readonly Dictionary<string, object?> _variables;
    private readonly Stack<Dictionary<string, object?>> _scopeStack;

    /// <summary>
    /// Initializes a new instance of the RenderContext class.
    /// </summary>
    public RenderContext()
    {
        _variables = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        _scopeStack = new Stack<Dictionary<string, object?>>();
        PageInfo = new PageInfo();
        DocumentInfo = new DocumentInfo();
        TemplateInfo = new TemplateInfo();
        SectionInfo = new SectionInfo();
    }

    /// <summary>
    /// Initializes a new instance of the RenderContext with data.
    /// </summary>
    /// <param name="data">The data object for expression evaluation.</param>
    public RenderContext(object? data)
        : this()
    {
        if (data is not null)
        {
            SetVariable("data", data);
        }
    }

    /// <summary>
    /// Gets the current page information.
    /// </summary>
    public PageInfo PageInfo { get; }

    /// <summary>
    /// Gets the document-level information.
    /// </summary>
    public DocumentInfo DocumentInfo { get; }

    /// <summary>
    /// Gets the template metadata information.
    /// Accessible via {{ template.* }} expressions (e.g., {{ template.title }}, {{ template.createdDate }}).
    /// </summary>
    public TemplateInfo TemplateInfo { get; }

    /// <summary>
    /// Gets the current section information.
    /// Accessible via {{ section.* }} expressions (e.g., {{ section.name }}).
    /// </summary>
    public SectionInfo SectionInfo { get; }

    /// <summary>
    /// Gets or sets the inherited style from parent nodes.
    /// </summary>
    public StyleProperties? InheritedStyle { get; set; }

    /// <summary>
    /// Gets or sets the current section name (for table of contents).
    /// </summary>
    public string? CurrentSection { get; set; }

    /// <summary>
    /// Gets or sets whether the current render is in a repeating context.
    /// </summary>
    public bool IsRepeating { get; set; }

    /// <summary>
    /// Gets or sets the current iteration index in a repeat loop.
    /// </summary>
    public int RepeatIndex { get; set; }

    /// <summary>
    /// Gets or sets the total count in the current repeat loop.
    /// </summary>
    public int RepeatCount { get; set; }

    /// <summary>
    /// Gets whether this is the first iteration in a repeat loop.
    /// </summary>
    public bool IsFirstIteration => RepeatIndex == 0;

    /// <summary>
    /// Gets whether this is the last iteration in a repeat loop.
    /// </summary>
    public bool IsLastIteration => RepeatIndex == RepeatCount - 1;

    /// <summary>
    /// Sets a variable in the current scope.
    /// </summary>
    /// <param name="name">The variable name.</param>
    /// <param name="value">The variable value.</param>
    public void SetVariable(string name, object? value)
    {
        if (_scopeStack.Count > 0)
        {
            _scopeStack.Peek()[name] = value;
        }
        else
        {
            _variables[name] = value;
        }
    }

    /// <summary>
    /// Gets a variable value by name, searching through scope stack.
    /// </summary>
    /// <param name="name">The variable name.</param>
    /// <returns>The variable value or null if not found.</returns>
    public object? GetVariable(string name)
    {
        // Search through scope stack from top to bottom
        foreach (var scope in _scopeStack)
        {
            if (scope.TryGetValue(name, out var value))
            {
                return value;
            }
        }

        // Fall back to root variables
        return _variables.TryGetValue(name, out var rootValue) ? rootValue : null;
    }

    /// <summary>
    /// Gets a variable value by name with type conversion.
    /// </summary>
    /// <typeparam name="T">The expected type.</typeparam>
    /// <param name="name">The variable name.</param>
    /// <param name="defaultValue">Default value if not found or conversion fails.</param>
    /// <returns>The variable value or default.</returns>
    public T? GetVariable<T>(string name, T? defaultValue = default)
    {
        var value = GetVariable(name);
        if (value is null)
        {
            return defaultValue;
        }

        if (value is T typedValue)
        {
            return typedValue;
        }

        try
        {
            if (value is JsonElement jsonElement)
            {
                return jsonElement.Deserialize<T>();
            }

            return (T)Convert.ChangeType(value, typeof(T));
        }
        catch
        {
            return defaultValue;
        }
    }

    /// <summary>
    /// Checks if a variable exists in any scope.
    /// </summary>
    /// <param name="name">The variable name.</param>
    /// <returns>True if the variable exists; otherwise, false.</returns>
    public bool HasVariable(string name)
    {
        foreach (var scope in _scopeStack)
        {
            if (scope.ContainsKey(name))
            {
                return true;
            }
        }

        return _variables.ContainsKey(name);
    }

    /// <summary>
    /// Pushes a new scope for local variables (e.g., in a repeat loop).
    /// </summary>
    public void PushScope()
    {
        _scopeStack.Push(new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Pops the current scope, removing all local variables.
    /// </summary>
    public void PopScope()
    {
        if (_scopeStack.Count > 0)
        {
            _scopeStack.Pop();
        }
    }

    /// <summary>
    /// Creates a scoped context that automatically pops when disposed.
    /// </summary>
    /// <returns>A disposable scope.</returns>
    public IDisposable CreateScope()
    {
        PushScope();
        return new ScopeDisposer(this);
    }

    /// <summary>
    /// Gets all variables as a dictionary for expression evaluation.
    /// </summary>
    /// <returns>A dictionary containing all visible variables.</returns>
    public IDictionary<string, object?> GetAllVariables()
    {
        var result = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        // Start with root variables
        foreach (var kvp in _variables)
        {
            result[kvp.Key] = kvp.Value;
        }

        // Overlay scoped variables (later scopes override earlier ones)
        var scopes = _scopeStack.Reverse().ToList();
        foreach (var scope in scopes)
        {
            foreach (var kvp in scope)
            {
                result[kvp.Key] = kvp.Value;
            }
        }

        // Add built-in variables
        result["page"] = PageInfo;
        result["document"] = DocumentInfo;
        result["template"] = TemplateInfo;
        result["section"] = SectionInfo;
        result["isFirst"] = IsFirstIteration;
        result["isLast"] = IsLastIteration;
        result["repeatIndex"] = RepeatIndex;
        result["repeatCount"] = RepeatCount;

        // Add convenience aliases for page context variables
        // These allow direct access like {{ currentPage }} instead of {{ page.CurrentPage }}
        result["currentPage"] = PageInfo.CurrentPage;
        result["totalPages"] = PageInfo.TotalPages;

        return result;
    }

    /// <summary>
    /// Creates a child context with inherited style.
    /// </summary>
    /// <param name="nodeStyle">The style from the current node.</param>
    /// <returns>A new context with merged styles.</returns>
    public RenderContext CreateChildContext(StyleProperties? nodeStyle)
    {
        var childContext = new RenderContext
        {
            InheritedStyle = nodeStyle?.MergeWith(InheritedStyle) ?? InheritedStyle?.Clone(),
            CurrentSection = CurrentSection,
            IsRepeating = IsRepeating,
            RepeatIndex = RepeatIndex,
            RepeatCount = RepeatCount,
        };

        // Copy all variables
        foreach (var kvp in _variables)
        {
            childContext._variables[kvp.Key] = kvp.Value;
        }

        // Copy page, document, template, and section info references
        childContext.PageInfo.CopyFrom(PageInfo);
        childContext.DocumentInfo.CopyFrom(DocumentInfo);
        childContext.TemplateInfo.CopyFrom(TemplateInfo);
        childContext.SectionInfo.CopyFrom(SectionInfo);

        return childContext;
    }

    /// <summary>
    /// Creates a shallow clone of this render context.
    /// Variables and scopes are copied, but the actual variable values are shared references.
    /// </summary>
    /// <returns>A cloned render context.</returns>
    public RenderContext Clone()
    {
        var cloned = new RenderContext
        {
            InheritedStyle = InheritedStyle?.Clone(),
            CurrentSection = CurrentSection,
            IsRepeating = IsRepeating,
            RepeatIndex = RepeatIndex,
            RepeatCount = RepeatCount,
        };

        // Copy all root variables
        foreach (var kvp in _variables)
        {
            cloned._variables[kvp.Key] = kvp.Value;
        }

        // Copy all scopes (as new dictionaries with same values)
        var scopesList = _scopeStack.Reverse().ToList();
        foreach (var scope in scopesList)
        {
            cloned._scopeStack.Push(
                new Dictionary<string, object?>(scope, StringComparer.OrdinalIgnoreCase)
            );
        }

        // Copy page, document, template, and section info
        cloned.PageInfo.CopyFrom(PageInfo);
        cloned.DocumentInfo.CopyFrom(DocumentInfo);
        cloned.TemplateInfo.CopyFrom(TemplateInfo);
        cloned.SectionInfo.CopyFrom(SectionInfo);

        return cloned;
    }

    /// <summary>
    /// Sets up the context for a repeat iteration.
    /// </summary>
    /// <param name="index">The current iteration index (0-based).</param>
    /// <param name="count">The total number of items in the collection.</param>
    /// <param name="item">The current item.</param>
    /// <param name="itemName">The variable name for the item. Default is "item".</param>
    /// <param name="indexName">The variable name for the index. Default is "index".</param>
    public void SetupRepeatIteration(
        int index,
        int count,
        object? item,
        string itemName = "item",
        string indexName = "index"
    )
    {
        IsRepeating = true;
        RepeatIndex = index;
        RepeatCount = count;

        SetVariable(itemName, item);
        SetVariable(indexName, index);
        SetVariable("isFirst", IsFirstIteration);
        SetVariable("isLast", IsLastIteration);
    }

    /// <summary>
    /// Resets the context to its initial state for object pooling.
    /// Clears all variables, scopes, and resets state properties.
    /// </summary>
    public void Reset()
    {
        _variables.Clear();
        _scopeStack.Clear();

        InheritedStyle = null;
        CurrentSection = null;
        IsRepeating = false;
        RepeatIndex = 0;
        RepeatCount = 0;

        PageInfo.Reset();
        DocumentInfo.Reset();
        TemplateInfo.Reset();
        SectionInfo.Reset();
    }

    /// <summary>
    /// Internal class for automatic scope disposal.
    /// </summary>
    private sealed class ScopeDisposer(RenderContext context) : IDisposable
    {
        private readonly RenderContext _context = context;
        private bool _disposed;

        public void Dispose()
        {
            if (!_disposed)
            {
                _context.PopScope();
                _disposed = true;
            }
        }
    }
}

/// <summary>
/// Contains information about the current page during rendering.
/// </summary>
public class PageInfo
{
    /// <summary>
    /// Gets or sets the current page number (1-based).
    /// </summary>
    public int CurrentPage { get; set; } = 1;

    /// <summary>
    /// Gets or sets the total number of pages.
    /// This is only accurate after the first rendering pass.
    /// </summary>
    public int TotalPages { get; set; } = 1;

    /// <summary>
    /// Gets or sets the page width in points.
    /// </summary>
    public float PageWidth { get; set; }

    /// <summary>
    /// Gets or sets the page height in points.
    /// </summary>
    public float PageHeight { get; set; }

    /// <summary>
    /// Gets or sets the left margin in points.
    /// </summary>
    public float MarginLeft { get; set; }

    /// <summary>
    /// Gets or sets the right margin in points.
    /// </summary>
    public float MarginRight { get; set; }

    /// <summary>
    /// Gets or sets the top margin in points.
    /// </summary>
    public float MarginTop { get; set; }

    /// <summary>
    /// Gets or sets the bottom margin in points.
    /// </summary>
    public float MarginBottom { get; set; }

    /// <summary>
    /// Gets the content width (page width minus horizontal margins).
    /// </summary>
    public float ContentWidth => PageWidth - MarginLeft - MarginRight;

    /// <summary>
    /// Gets the content height (page height minus vertical margins).
    /// </summary>
    public float ContentHeight => PageHeight - MarginTop - MarginBottom;

    /// <summary>
    /// Gets whether this is the first page.
    /// </summary>
    public bool IsFirstPage => CurrentPage == 1;

    /// <summary>
    /// Gets whether this is the last page.
    /// </summary>
    public bool IsLastPage => CurrentPage == TotalPages;

    /// <summary>
    /// Copies values from another PageInfo instance.
    /// </summary>
    /// <param name="other">The source to copy from.</param>
    public void CopyFrom(PageInfo other)
    {
        CurrentPage = other.CurrentPage;
        TotalPages = other.TotalPages;
        PageWidth = other.PageWidth;
        PageHeight = other.PageHeight;
        MarginLeft = other.MarginLeft;
        MarginRight = other.MarginRight;
        MarginTop = other.MarginTop;
        MarginBottom = other.MarginBottom;
    }

    /// <summary>
    /// Resets PageInfo to default values for object pooling.
    /// </summary>
    public void Reset()
    {
        CurrentPage = 1;
        TotalPages = 1;
        PageWidth = 0;
        PageHeight = 0;
        MarginLeft = 0;
        MarginRight = 0;
        MarginTop = 0;
        MarginBottom = 0;
    }
}

/// <summary>
/// Contains document-level information.
/// </summary>
public class DocumentInfo
{
    /// <summary>
    /// Gets or sets the document title.
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Gets or sets the document author.
    /// </summary>
    public string? Author { get; set; }

    /// <summary>
    /// Gets or sets the document subject.
    /// </summary>
    public string? Subject { get; set; }

    /// <summary>
    /// Gets or sets the document keywords.
    /// </summary>
    public string? Keywords { get; set; }

    /// <summary>
    /// Gets or sets the document creator application.
    /// </summary>
    public string? Creator { get; set; }

    /// <summary>
    /// Gets or sets the document creation date.
    /// </summary>
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the document modification date.
    /// </summary>
    public DateTime ModificationDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the template ID used to generate this document.
    /// </summary>
    public Guid? TemplateId { get; set; }

    /// <summary>
    /// Gets or sets the template name used to generate this document.
    /// </summary>
    public string? TemplateName { get; set; }

    /// <summary>
    /// Gets or sets custom metadata key-value pairs.
    /// </summary>
    public Dictionary<string, string>? Metadata { get; set; }

    /// <summary>
    /// Copies values from another DocumentInfo instance.
    /// </summary>
    /// <param name="other">The source to copy from.</param>
    public void CopyFrom(DocumentInfo other)
    {
        Title = other.Title;
        Author = other.Author;
        Subject = other.Subject;
        Keywords = other.Keywords;
        Creator = other.Creator;
        CreationDate = other.CreationDate;
        ModificationDate = other.ModificationDate;
        TemplateId = other.TemplateId;
        TemplateName = other.TemplateName;
        Metadata = other.Metadata is not null
            ? new Dictionary<string, string>(other.Metadata)
            : null;
    }

    /// <summary>
    /// Resets DocumentInfo to default values for object pooling.
    /// </summary>
    public void Reset()
    {
        Title = null;
        Author = null;
        Subject = null;
        Keywords = null;
        Creator = null;
        CreationDate = DateTime.UtcNow;
        ModificationDate = DateTime.UtcNow;
        TemplateId = null;
        TemplateName = null;
        Metadata = null;
    }
}

/// <summary>
/// Contains template-level metadata information for expression evaluation.
/// This provides access to template properties via {{ template.* }} expressions.
/// </summary>
public class TemplateInfo
{
    /// <summary>
    /// Gets or sets the template title/name.
    /// Accessible via {{ template.title }} expression.
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Gets or sets the template description.
    /// Accessible via {{ template.description }} expression.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the template creation date.
    /// Accessible via {{ template.createdDate }} expression.
    /// </summary>
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the template last update date.
    /// Accessible via {{ template.updatedDate }} expression.
    /// </summary>
    public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the template version.
    /// Accessible via {{ template.version }} expression.
    /// </summary>
    public int Version { get; set; } = 1;

    /// <summary>
    /// Gets or sets the template category.
    /// Accessible via {{ template.category }} expression.
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Gets or sets the template author.
    /// Accessible via {{ template.author }} expression.
    /// </summary>
    public string? Author { get; set; }

    /// <summary>
    /// Copies values from another TemplateInfo instance.
    /// </summary>
    /// <param name="other">The source to copy from.</param>
    public void CopyFrom(TemplateInfo other)
    {
        Title = other.Title;
        Description = other.Description;
        CreatedDate = other.CreatedDate;
        UpdatedDate = other.UpdatedDate;
        Version = other.Version;
        Category = other.Category;
        Author = other.Author;
    }

    /// <summary>
    /// Resets TemplateInfo to default values for object pooling.
    /// </summary>
    public void Reset()
    {
        Title = null;
        Description = null;
        CreatedDate = DateTime.UtcNow;
        UpdatedDate = DateTime.UtcNow;
        Version = 1;
        Category = null;
        Author = null;
    }
}

/// <summary>
/// Contains section-related information for expression evaluation and page numbering.
/// This provides access to section context via {{ section.* }} expressions.
/// </summary>
public class SectionInfo
{
    /// <summary>
    /// Gets or sets the current section name.
    /// Accessible via {{ section.name }} expression.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Gets or sets the current section title (display name).
    /// Accessible via {{ section.title }} expression.
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Gets or sets the section nesting level (0 = top level).
    /// Accessible via {{ section.level }} expression.
    /// </summary>
    public int Level { get; set; }

    /// <summary>
    /// Gets or sets the section index within its parent (0-based).
    /// Accessible via {{ section.index }} expression.
    /// </summary>
    public int Index { get; set; }

    /// <summary>
    /// Gets whether the section has a name defined.
    /// </summary>
    public bool HasSection => !string.IsNullOrEmpty(Name);

    /// <summary>
    /// Copies values from another SectionInfo instance.
    /// </summary>
    /// <param name="other">The source to copy from.</param>
    public void CopyFrom(SectionInfo other)
    {
        Name = other.Name;
        Title = other.Title;
        Level = other.Level;
        Index = other.Index;
    }

    /// <summary>
    /// Resets SectionInfo to default values for object pooling.
    /// </summary>
    public void Reset()
    {
        Name = null;
        Title = null;
        Level = 0;
        Index = 0;
    }
}

/// <summary>
/// Page size presets matching common paper sizes.
/// </summary>
public static class PageSizes
{
    // A-series (ISO 216)
    public static readonly (float Width, float Height) A0 = (2384, 3370);
    public static readonly (float Width, float Height) A1 = (1684, 2384);
    public static readonly (float Width, float Height) A2 = (1190, 1684);
    public static readonly (float Width, float Height) A3 = (842, 1190);
    public static readonly (float Width, float Height) A4 = (595, 842);
    public static readonly (float Width, float Height) A5 = (420, 595);
    public static readonly (float Width, float Height) A6 = (298, 420);
    public static readonly (float Width, float Height) A7 = (210, 298);
    public static readonly (float Width, float Height) A8 = (148, 210);

    // B-series (ISO 216)
    public static readonly (float Width, float Height) B0 = (2834, 4008);
    public static readonly (float Width, float Height) B1 = (2004, 2834);
    public static readonly (float Width, float Height) B2 = (1417, 2004);
    public static readonly (float Width, float Height) B3 = (1000, 1417);
    public static readonly (float Width, float Height) B4 = (708, 1000);
    public static readonly (float Width, float Height) B5 = (498, 708);

    // US sizes
    public static readonly (float Width, float Height) Letter = (612, 792);
    public static readonly (float Width, float Height) Legal = (612, 1008);
    public static readonly (float Width, float Height) Tabloid = (792, 1224);
    public static readonly (float Width, float Height) Ledger = (1224, 792);
    public static readonly (float Width, float Height) Executive = (522, 756);

    /// <summary>
    /// Gets the page size by name.
    /// </summary>
    /// <param name="name">The page size name (e.g., "A4", "Letter").</param>
    /// <returns>The width and height in points, or A4 if not found.</returns>
    public static (float Width, float Height) GetByName(string name)
    {
        return name.ToUpperInvariant() switch
        {
            "A0" => A0,
            "A1" => A1,
            "A2" => A2,
            "A3" => A3,
            "A4" => A4,
            "A5" => A5,
            "A6" => A6,
            "A7" => A7,
            "A8" => A8,
            "B0" => B0,
            "B1" => B1,
            "B2" => B2,
            "B3" => B3,
            "B4" => B4,
            "B5" => B5,
            "LETTER" => Letter,
            "LEGAL" => Legal,
            "TABLOID" => Tabloid,
            "LEDGER" => Ledger,
            "EXECUTIVE" => Executive,
            _ => A4, // Default to A4
        };
    }
}

/// <summary>
/// Page orientation enumeration.
/// </summary>
public enum PageOrientation
{
    /// <summary>Portrait orientation (height > width).</summary>
    Portrait,

    /// <summary>Landscape orientation (width > height).</summary>
    Landscape,
}

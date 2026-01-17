namespace PDFBuilder.Core.Interfaces;

/// <summary>
/// Interface for layout validation services.
/// Provides comprehensive validation of layout definitions before PDF generation.
/// </summary>
/// <remarks>
/// The actual implementation uses Contracts DTOs for request/response, but the Core interface
/// is defined abstractly to avoid circular dependencies. The concrete implementation in
/// Validation assembly bridges the Core interface with Contracts types.
/// </remarks>
public interface ILayoutValidator
{
    /// <summary>
    /// Validates a layout definition asynchronously.
    /// </summary>
    /// <typeparam name="TRequest">The type of validation request.</typeparam>
    /// <typeparam name="TResponse">The type of validation response.</typeparam>
    /// <param name="request">The validation request containing the layout and options.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A validation response with errors, warnings, and statistics.</returns>
    Task<TResponse> ValidateAsync<TRequest, TResponse>(
        TRequest request,
        CancellationToken cancellationToken = default
    )
        where TRequest : class
        where TResponse : class, new();

    /// <summary>
    /// Gets documentation for all supported component types.
    /// </summary>
    /// <returns>Component documentation including properties and their constraints.</returns>
    ComponentDocumentation GetComponentDocumentation();

    /// <summary>
    /// Checks if a component type is valid.
    /// </summary>
    /// <param name="componentType">The component type to check.</param>
    /// <returns>True if the component type is valid; otherwise, false.</returns>
    bool IsValidComponentType(string componentType);
}

/// <summary>
/// Documentation for supported components.
/// </summary>
public class ComponentDocumentation
{
    /// <summary>
    /// Gets or sets the list of component definitions.
    /// </summary>
    public List<ComponentDefinition> Components { get; set; } = [];

    /// <summary>
    /// Gets or sets the version of the component schema.
    /// </summary>
    public string SchemaVersion { get; set; } = "1.0";
}

/// <summary>
/// Definition of a single component type.
/// </summary>
public class ComponentDefinition
{
    /// <summary>
    /// Gets or sets the component type name.
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the category of the component.
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the component description.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets whether the component accepts children.
    /// </summary>
    public bool AcceptsChildren { get; set; }

    /// <summary>
    /// Gets or sets whether the component accepts a single child.
    /// </summary>
    public bool AcceptsSingleChild { get; set; }

    /// <summary>
    /// Gets or sets the required properties.
    /// </summary>
    public List<PropertyDefinition> RequiredProperties { get; set; } = [];

    /// <summary>
    /// Gets or sets the optional properties.
    /// </summary>
    public List<PropertyDefinition> OptionalProperties { get; set; } = [];
}

/// <summary>
/// Definition of a component property.
/// </summary>
public class PropertyDefinition
{
    /// <summary>
    /// Gets or sets the property name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the property type.
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the property description.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the default value if any.
    /// </summary>
    public object? DefaultValue { get; set; }

    /// <summary>
    /// Gets or sets whether the property supports expressions.
    /// </summary>
    public bool SupportsExpressions { get; set; } = true;
}

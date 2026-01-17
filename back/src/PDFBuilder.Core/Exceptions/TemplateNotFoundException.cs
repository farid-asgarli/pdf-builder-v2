namespace PDFBuilder.Core.Exceptions;

/// <summary>
/// Exception thrown when a template is not found.
/// </summary>
public class TemplateNotFoundException : PdfBuilderException
{
    /// <inheritdoc />
    public override string ErrorCode => "TEMPLATE_NOT_FOUND";

    /// <summary>
    /// Gets the template ID that was not found.
    /// </summary>
    public Guid? TemplateId { get; }

    /// <summary>
    /// Gets the template name that was searched for.
    /// </summary>
    public string? TemplateName { get; }

    /// <summary>
    /// Initializes a new instance of the TemplateNotFoundException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public TemplateNotFoundException(string message)
        : base(message) { }

    /// <summary>
    /// Initializes a new instance of the TemplateNotFoundException class.
    /// </summary>
    /// <param name="templateId">The template ID that was not found.</param>
    public TemplateNotFoundException(Guid templateId)
        : base($"Template with ID '{templateId}' was not found.")
    {
        TemplateId = templateId;
    }

    /// <summary>
    /// Initializes a new instance of the TemplateNotFoundException class.
    /// </summary>
    /// <param name="templateName">The template name that was not found.</param>
    /// <param name="isName">Indicator that this is a name lookup.</param>
#pragma warning disable IDE0060 // Remove unused parameter - isName is used for overload resolution
    public TemplateNotFoundException(string templateName, bool isName)
        : base($"Template with name '{templateName}' was not found.")
#pragma warning restore IDE0060
    {
        TemplateName = templateName;
    }

    /// <summary>
    /// Initializes a new instance of the TemplateNotFoundException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="innerException">The inner exception.</param>
    public TemplateNotFoundException(string message, Exception innerException)
        : base(message, innerException) { }

    /// <summary>
    /// Creates an exception for a not found by ID scenario.
    /// </summary>
    /// <param name="id">The template ID.</param>
    /// <returns>A new TemplateNotFoundException.</returns>
    public static TemplateNotFoundException ById(Guid id) => new(id);

    /// <summary>
    /// Creates an exception for a not found by name scenario.
    /// </summary>
    /// <param name="name">The template name.</param>
    /// <returns>A new TemplateNotFoundException.</returns>
    public static TemplateNotFoundException ByName(string name) => new(name, true);
}

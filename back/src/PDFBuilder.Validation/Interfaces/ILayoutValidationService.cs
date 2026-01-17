using PDFBuilder.Contracts.Requests;
using PDFBuilder.Contracts.Responses;
using PDFBuilder.Core.Interfaces;

namespace PDFBuilder.Validation.Interfaces;

/// <summary>
/// Interface for layout validation services.
/// Provides comprehensive validation of layout definitions before PDF generation.
/// </summary>
public interface ILayoutValidationService
{
    /// <summary>
    /// Validates a layout definition asynchronously.
    /// </summary>
    /// <param name="request">The validation request containing the layout and options.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A validation response with errors, warnings, and statistics.</returns>
    Task<ValidationResponse> ValidateAsync(
        ValidateLayoutRequest request,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Validates a layout definition synchronously.
    /// </summary>
    /// <param name="request">The validation request containing the layout and options.</param>
    /// <returns>A validation response with errors, warnings, and statistics.</returns>
    ValidationResponse Validate(ValidateLayoutRequest request);

    /// <summary>
    /// Validates a full PDF generation request asynchronously.
    /// </summary>
    /// <param name="request">The PDF generation request to validate.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A validation response with errors and warnings.</returns>
    Task<ValidationResponse> ValidateGeneratePdfRequestAsync(
        GeneratePdfRequest request,
        CancellationToken cancellationToken = default
    );

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

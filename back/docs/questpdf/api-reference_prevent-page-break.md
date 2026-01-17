# API Reference: Prevent Page Break

Attempts to keep the container's content together on its first page of occurrence. If the content does not fit entirely on that page, it is moved to the next page. If it spans multiple pages, all subsequent pages are rendered as usual without restriction.

## Example

This method is useful for ensuring that content remains visually coherent and is not arbitrarily split.

```c#
container.Column(column =>
{
    column.Item().Height(400).Background(Colors.Grey.Lighten3);
    column.Item().Height(30);

    column.Item()
        .PreventPageBreak()
        .Text(text =>
        {
            text.ParagraphSpacing(15);
            
            text.Span("Optimizing Content Placement").Bold().FontColor(Colors.Blue.Darken2).FontSize(24);
            text.Span("\n");
            text.Span("By carefully determining where to place a page break, you can avoid awkward text separations and maintain readability. Thoughtful formatting improves the overall user experience, making complex topics easier to digest.");
        });
});
```

#### Without PreventPageBreak

Unable to display PDF file. [Download](/api-reference/prevent-page-break-disabled.pdf) instead.

#### With PreventPageBreak

Unable to display PDF file. [Download](/api-reference/prevent-page-break-enabled.pdf) instead.
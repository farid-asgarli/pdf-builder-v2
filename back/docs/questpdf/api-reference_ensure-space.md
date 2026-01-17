# API Reference: Ensure Space

Ensures that the container's content occupies at least a specified minimum height on its first page of occurrence.

- If there is enough space, the content is rendered as usual.
- However, if a page break is required, this method ensures that a minimum amount of space is available before rendering the content. If the required space is not available, the content is moved to the next page.
- This rule applies only to the first page where the content appears. If the content spans multiple pages, all subsequent pages are rendered without this restriction.

## Example

This method is particularly useful for structured elements like tables, where rendering only a small fragment at the bottom of a page could negatively impact readability. By ensuring a minimum height, you can prevent undesired content fragmentation.

```c#
container.Column(column =>
{
    column.Item().Height(400).Background(Colors.Grey.Lighten3);
    column.Item().Height(30); 
    
    column.Item()
        .EnsureSpace(100)
        .Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.ConstantColumn(40);
                columns.RelativeColumn();
            });

            foreach (var i in Enumerable.Range(1, 12))
            {
                table.Cell().Text($"{i}.");
                table.Cell().ShowEntire().Text(Placeholders.Sentence());
            }
        });
});
```

#### Without EnsureSpace

Unable to display PDF file. [Download](/api-reference/ensure-space-disabled.pdf) instead.

#### With EnsureSpace

Unable to display PDF file. [Download](/api-reference/ensure-space-enabled.pdf) instead.
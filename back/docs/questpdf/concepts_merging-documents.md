# Concepts Merging Documents

QuestPDF makes it easy to generate multiple PDF documents and then combine them into one. You can merge documents while either preserving each document’s original page numbers or creating a continuous page numbering sequence throughout the merged output.

QuestPDF supports two merging strategies regarding page numbering. Choose the one that best suits your needs.

> **WARNING:** This feature can be used only while generating PDF documents. To merge existing files, please use the [Document Operations](/concepts/document-operations.html) feature.

## Generating sample document

Before merging, you need to create individual documents. The sample code below defines a helper method that creates a report with a header, content area, and a footer displaying page numbers.

```c#
static Document GenerateReport(string title, int itemsCount)
{
    return Document.Create(document =>
    {
        document.Page(page =>
        {
            page.Size(PageSizes.A5);
            page.Margin(0.5f, Unit.Inch);
            
            page.Header()
                .Text(title)
                .Bold()
                .FontSize(24)
                .FontColor(Colors.Blue.Accent2);
            
            page.Content()
                .PaddingVertical(20)
                .Column(column =>
                {
                    column.Spacing(10);

                    foreach (var i in Enumerable.Range(0, itemsCount))
                    {
                        column
                            .Item()
                            .Width(200)
                            .Height(50)
                            .Background(Colors.Grey.Lighten3)
                            .AlignMiddle()
                            .AlignCenter()
                            .Text($"Item {i}")
                            .FontSize(16);
                    }
                });
            
            page.Footer()
                .AlignCenter()
                .PaddingVertical(20)
                .Text(text =>
                {
                    text.DefaultTextStyle(TextStyle.Default.FontSize(16));
                    
                    text.CurrentPageNumber();
                    text.Span(" / ");
                    text.TotalPages();
                });
        });
    });
}
```

## Original page numbers

Documents maintain their own page numbers upon merging, without continuity between them. As a result, APIs related to page numbers reflect individual documents, not the cumulative count. All documents are simply be merged together.

Example: Merging a two-page document with a three-page document results in a sequence: 1, 2, 1, 2, 3.

```c#
Document
    .Merge(
        GenerateReport("Short Document 1", 5),
        GenerateReport("Medium Document 2", 10),
        GenerateReport("Long Document 3", 15))
    .UseOriginalPageNumbers()
    .GeneratePdf("merged.pdf");
```

Unable to display PDF file. [Download](/api-reference/document-merge-original.pdf) instead.

## Continuous page numbers

Consolidates the content from every document, creating a continuous seamless one. Page number APIs return a consecutive numbering for this unified document.

Merging a two-page document with a three-page document results in a sequence: 1, 2, 3, 4, 5.

```c#
Document
    .Merge(
        GenerateReport("Short Document 1", 5),
        GenerateReport("Medium Document 2", 10),
        GenerateReport("Long Document 3", 15))
    .UseContinuousPageNumbers()
    .GeneratePdf("merged.pdf");
```

Unable to display PDF file. [Download](/api-reference/document-merge-continuous.pdf) instead.
# API Reference: Skip Once

If the container spans multiple pages, its content is omitted on the first page and then displayed on the second and subsequent pages.

A common use-case for this element is when displaying a consistent header across pages but needing to conditionally show/hide specific fragments on the first page.

> **TIP:** Combine this element with SkipOnce to achieve more complex behaviors, e.g.:

### Example

In this example, the SkipOnce and ShowOnce elements are combined to ensure that if a glossary term spans multiple pages, the header displays "Continued" on the second and subsequent pages.

```c#
container
    .Column(column =>
    {
        var terms = new[]
        {
            ("Repository", "A centralized storage location for source code and related files, typically managed using version control systems like Git. Repositories allow multiple developers to collaborate on projects, track changes, and maintain version history."),
            ("Version Control", "A system that tracks changes to code over time, enabling developers to collaborate efficiently, revert to previous versions, and maintain a structured development workflow. Popular version control tools include Git, Mercurial, and Subversion."),
            ("Abstraction", "A programming concept that hides complex implementation details and exposes only the necessary parts. Abstraction helps simplify code and allows developers to focus on high-level design rather than low-level implementation details."),
            ("Namespace", "A container that groups related identifiers, such as variables, functions, and classes, to prevent naming conflicts in a program. Namespaces are commonly used in large projects to organize code efficiently."),
        };
        
        column.Spacing(15);
        
        foreach (var term in terms)
        {
            column.Item().Decoration(decoration =>
            {
                decoration.Before()
                    .DefaultTextStyle(x => x.FontSize(24).Bold().FontColor(Colors.Blue.Darken2))
                    .Column(innerColumn =>
                    {
                        innerColumn.Item().ShowOnce().Text(term.Item1);
                        
                        innerColumn.Item().SkipOnce().Text(text =>
                        {
                            text.Span(term.Item1);
                            text.Span(" (continued)").Light().Italic();
                        });
                    });

                decoration.Content().Text(term.Item2);
            });
        }
    });
```

![example](/api-reference/skip-once-0.webp)

![example](/api-reference/skip-once-1.webp)
using PDFBuilder.API.Extensions;
using PDFBuilder.API.Filters;
using QuestPDF.Infrastructure;
using Serilog;

// Configure Serilog from appsettings.json
Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateBootstrapLogger();

try
{
    Log.Information("Starting PDF Builder API...");

    var builder = WebApplication.CreateBuilder(args);

    // Configure Serilog
    builder.Host.UseSerilog(
        (context, services, configuration) =>
            configuration
                .ReadFrom.Configuration(context.Configuration)
                .ReadFrom.Services(services)
                .Enrich.FromLogContext()
                .Enrich.WithMachineName()
                .Enrich.WithThreadId()
    );

    // Configure QuestPDF License
    QuestPDF.Settings.License = LicenseType.Community;

    // Add controllers with validation filter
    builder.Services.AddControllers(options =>
    {
        options.Filters.Add<ValidationFilter>();
    });

    // Add API Explorer and Swagger
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.SwaggerDoc(
            "v1",
            new Microsoft.OpenApi.Models.OpenApiInfo
            {
                Title = "PDF Builder API",
                Version = "v1",
                Description = "API for generating PDF documents from JSON layouts using QuestPDF",
                Contact = new Microsoft.OpenApi.Models.OpenApiContact
                {
                    Name = "PDF Builder Team",
                    Email = "support@pdfbuilder.local",
                },
            }
        );

        options.EnableAnnotations();

        // Include XML comments if available
        var xmlFile = $"{typeof(Program).Assembly.GetName().Name}.xml";
        var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        if (File.Exists(xmlPath))
        {
            options.IncludeXmlComments(xmlPath);
        }
    });

    // Add PDF Builder services
    builder.Services.AddPdfBuilderServices(builder.Configuration);

    // Add ImageProcessor options from configuration
    builder.Services.AddImageProcessorOptions(builder.Configuration);

    // Add PDF Builder Engine services (LayoutEngine, RendererFactory, etc.)
    builder.Services.AddPdfBuilderEngine();

    // Add all component renderers
    builder.Services.AddPdfBuilderRenderers();

    // Add CORS
    builder.Services.AddPdfBuilderCors(builder.Configuration);

    // Add SignalR for real-time progress reporting
    builder.Services.AddPdfBuilderSignalR(builder.Configuration);

    // Add image upload service
    builder.Services.AddPdfBuilderImageUpload();

    // Add Health Checks
    builder.Services.AddPdfBuilderHealthChecks(builder.Configuration);

    // Add AutoMapper
    builder.Services.AddAutoMapper(typeof(Program).Assembly);

    var app = builder.Build();

    // Configure the HTTP request pipeline
    app.UsePdfBuilderMiddleware(app.Environment);

    // CORS
    if (app.Environment.IsDevelopment())
    {
        app.UseCors("Development");
    }
    else
    {
        app.UseCors("PdfBuilderPolicy");
    }

    // Swagger (development only)
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "PDF Builder API v1");
            options.RoutePrefix = string.Empty; // Serve Swagger at root
            options.DocumentTitle = "PDF Builder API";
        });
    }

    app.UseHttpsRedirection();

    app.UseRouting();

    app.UseAuthorization();

    app.MapControllers();

    // Health check endpoints
    app.MapPdfBuilderHealthChecks();

    // SignalR hubs
    app.MapPdfBuilderHubs();

    // Log startup information
    Log.Information("PDF Builder API started successfully");
    Log.Information("Environment: {Environment}", app.Environment.EnvironmentName);

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

/// <summary>
/// Partial class for integration test support.
/// </summary>
public partial class Program { }

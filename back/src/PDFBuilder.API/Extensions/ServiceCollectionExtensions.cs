using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PDFBuilder.API.Filters;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Services;
using PDFBuilder.Infrastructure.Configuration;
using PDFBuilder.Infrastructure.Persistence;
using PDFBuilder.Validation.Validators;

namespace PDFBuilder.API.Extensions;

/// <summary>
/// Extension methods for configuring services in the DI container.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds core PDF Builder services to the service collection.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderServices(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        // Add configuration settings
        services.AddPdfBuilderConfiguration(configuration);

        // Add database services
        services.AddPdfBuilderDatabase(configuration);

        // Add repositories
        services.AddPdfBuilderRepositories();

        // Add validation
        services.AddPdfBuilderValidation();

        // Add HTTP clients
        services.AddPdfBuilderHttpClients();

        // Add caching
        services.AddPdfBuilderCaching();

        // Add expression evaluation services
        services.AddPdfBuilderExpressionEvaluator();

        return services;
    }

    /// <summary>
    /// Adds configuration settings to the service collection.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderConfiguration(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        services.Configure<DatabaseSettings>(
            configuration.GetSection(DatabaseSettings.SectionName)
        );

        services.Configure<QuestPdfSettings>(
            configuration.GetSection(QuestPdfSettings.SectionName)
        );

        services.Configure<StorageSettings>(configuration.GetSection(StorageSettings.SectionName));

        services.Configure<ExpressionSettings>(
            configuration.GetSection(ExpressionSettings.SectionName)
        );

        services.Configure<CorsSettings>(configuration.GetSection(CorsSettings.SectionName));

        return services;
    }

    /// <summary>
    /// Adds database services to the service collection.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderDatabase(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var databaseSettings =
            configuration.GetSection(DatabaseSettings.SectionName).Get<DatabaseSettings>()
            ?? new DatabaseSettings();

        services.AddDbContext<TemplateDbContext>(options =>
        {
            options.UseNpgsql(
                databaseSettings.ConnectionString,
                npgsqlOptions =>
                {
                    npgsqlOptions.CommandTimeout(databaseSettings.CommandTimeoutSeconds);
                    npgsqlOptions.EnableRetryOnFailure(
                        maxRetryCount: databaseSettings.MaxRetryCount,
                        maxRetryDelay: TimeSpan.FromSeconds(databaseSettings.MaxRetryDelaySeconds),
                        errorCodesToAdd: null
                    );
                    npgsqlOptions.MigrationsAssembly(typeof(TemplateDbContext).Assembly.FullName);
                }
            );

            if (databaseSettings.EnableDetailedErrors)
            {
                options.EnableDetailedErrors();
            }

            if (databaseSettings.EnableSensitiveDataLogging)
            {
                options.EnableSensitiveDataLogging();
            }
        });

        return services;
    }

    /// <summary>
    /// Adds repository services to the service collection.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderRepositories(this IServiceCollection services)
    {
        services.AddScoped<ITemplateRepository, TemplateRepository>();

        return services;
    }

    /// <summary>
    /// Adds validation services to the service collection.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderValidation(this IServiceCollection services)
    {
        // Register all validators from the Validation assembly
        services.AddValidatorsFromAssemblyContaining<PDFBuilder.Validation.AssemblyMarker>();

        // Add validation filter
        services.AddScoped<ValidationFilter>();

        // Add layout validation service
        services.AddScoped<
            PDFBuilder.Validation.Interfaces.ILayoutValidationService,
            PDFBuilder.Validation.Services.LayoutValidationService
        >();

        return services;
    }

    /// <summary>
    /// Adds HTTP client services to the service collection.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderHttpClients(this IServiceCollection services)
    {
        services
            .AddHttpClient(
                "ImageClient",
                client =>
                {
                    client.Timeout = TimeSpan.FromSeconds(30);
                    client.DefaultRequestHeaders.Add("User-Agent", "PDFBuilder/1.0");
                }
            )
            .AddStandardResilienceHandler();

        return services;
    }

    /// <summary>
    /// Adds caching services to the service collection.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderCaching(this IServiceCollection services)
    {
        services.AddMemoryCache(options =>
        {
            options.SizeLimit = 1024 * 1024 * 100; // 100MB cache limit
        });

        return services;
    }

    /// <summary>
    /// Adds CORS policy to the service collection.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderCors(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var corsSettings =
            configuration.GetSection(CorsSettings.SectionName).Get<CorsSettings>()
            ?? new CorsSettings();

        services.AddCors(options =>
        {
            options.AddPolicy(
                "PdfBuilderPolicy",
                builder =>
                {
                    builder
                        .WithOrigins(corsSettings.AllowedOrigins)
                        .WithMethods(corsSettings.AllowedMethods)
                        .WithHeaders(corsSettings.AllowedHeaders)
                        .WithExposedHeaders(corsSettings.ExposedHeaders)
                        .SetPreflightMaxAge(
                            TimeSpan.FromSeconds(corsSettings.PreflightMaxAgeSeconds)
                        );

                    if (corsSettings.AllowCredentials)
                    {
                        builder.AllowCredentials();
                    }
                }
            );

            // Development policy - allows any origin
            options.AddPolicy(
                "Development",
                builder =>
                {
                    builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
                }
            );
        });

        return services;
    }

    /// <summary>
    /// Adds health check services to the service collection.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderHealthChecks(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var databaseSettings =
            configuration.GetSection(DatabaseSettings.SectionName).Get<DatabaseSettings>()
            ?? new DatabaseSettings();

        services
            .AddHealthChecks()
            .AddNpgSql(
                connectionString: databaseSettings.ConnectionString,
                name: "database",
                tags: ["ready"]
            )
            .AddDbContextCheck<TemplateDbContext>(name: "ef-core", tags: ["ready"]);

        return services;
    }

    /// <summary>
    /// Adds expression evaluation services to the service collection.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderExpressionEvaluator(
        this IServiceCollection services
    )
    {
        // Register the expression evaluator as singleton (it's thread-safe with caching)
        services.AddSingleton<IExpressionEvaluator, ExpressionEvaluator>();

        // Register the expression validator as singleton (stateless)
        services.AddSingleton<ExpressionValidator>();

        return services;
    }
}

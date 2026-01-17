using System.Collections.Concurrent;

namespace PDFBuilder.Infrastructure.External;

/// <summary>
/// Manages font loading, registration, and caching for PDF generation.
/// Provides thread-safe access to custom fonts with fallback support.
/// </summary>
public sealed class FontManager : IDisposable
{
    private readonly ConcurrentDictionary<string, FontData> _fontCache;
    private readonly FontManagerOptions _options;
    private readonly ILogger<FontManager> _logger;
    private readonly SemaphoreSlim _loadLock = new(1, 1);
    private bool _disposed;
    private bool _fontsRegistered;

    /// <summary>
    /// Default font family names for fallback.
    /// </summary>
    public static class DefaultFonts
    {
        public const string Regular = "Arial";
        public const string Serif = "Times New Roman";
        public const string Monospace = "Courier New";
        public const string SansSerif = "Helvetica";
    }

    /// <summary>
    /// Initializes a new instance of the FontManager class.
    /// </summary>
    /// <param name="options">Font manager options.</param>
    /// <param name="logger">The logger instance.</param>
    public FontManager(FontManagerOptions options, ILogger<FontManager> logger)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _fontCache = new ConcurrentDictionary<string, FontData>(StringComparer.OrdinalIgnoreCase);

        _logger.LogInformation(
            "Font manager initialized with base path: {BasePath}",
            _options.FontBasePath ?? "default"
        );
    }

    /// <summary>
    /// Gets the count of loaded fonts.
    /// </summary>
    public int LoadedFontCount => _fontCache.Count;

    /// <summary>
    /// Gets the total size of loaded fonts in bytes.
    /// </summary>
    public long TotalFontSizeBytes => _fontCache.Values.Sum(f => f.SizeBytes);

    /// <summary>
    /// Registers all fonts from the configured font directory with QuestPDF.
    /// Should be called during application startup.
    /// </summary>
    public async Task RegisterFontsAsync(CancellationToken cancellationToken = default)
    {
        if (_fontsRegistered)
        {
            _logger.LogDebug("Fonts already registered, skipping");
            return;
        }

        await _loadLock.WaitAsync(cancellationToken);
        try
        {
            if (_fontsRegistered)
                return;

            // Register fonts from configured directory
            if (
                !string.IsNullOrEmpty(_options.FontBasePath)
                && Directory.Exists(_options.FontBasePath)
            )
            {
                var fontFiles = Directory
                    .GetFiles(_options.FontBasePath, "*.*", SearchOption.AllDirectories)
                    .Where(f =>
                        f.EndsWith(".ttf", StringComparison.OrdinalIgnoreCase)
                        || f.EndsWith(".otf", StringComparison.OrdinalIgnoreCase)
                    );

                foreach (var fontFile in fontFiles)
                {
                    try
                    {
                        await LoadAndRegisterFontAsync(fontFile, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to register font: {FontFile}", fontFile);
                    }
                }

                _logger.LogInformation(
                    "Registered {Count} custom fonts from {Path}",
                    _fontCache.Count,
                    _options.FontBasePath
                );
            }

            _fontsRegistered = true;
        }
        finally
        {
            _loadLock.Release();
        }
    }

    /// <summary>
    /// Loads a font from a file path.
    /// </summary>
    /// <param name="fontPath">The path to the font file.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The font data, or null if loading failed.</returns>
    public async Task<FontData?> LoadFontAsync(
        string fontPath,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(fontPath))
            return null;

        // Check cache first
        var cacheKey = Path.GetFullPath(fontPath).ToLowerInvariant();
        if (_fontCache.TryGetValue(cacheKey, out var cached))
        {
            cached.RecordAccess();
            return cached;
        }

        try
        {
            var fontBytes = await File.ReadAllBytesAsync(fontPath, cancellationToken);
            var fontData = new FontData
            {
                Data = fontBytes,
                FilePath = fontPath,
                FamilyName = ExtractFontFamilyName(fontPath),
                SizeBytes = fontBytes.Length,
            };

            _fontCache.TryAdd(cacheKey, fontData);
            _logger.LogDebug("Font loaded: {FontPath} ({Size} bytes)", fontPath, fontBytes.Length);

            return fontData;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load font: {FontPath}", fontPath);
            return null;
        }
    }

    /// <summary>
    /// Loads a font from a byte array.
    /// </summary>
    /// <param name="fontData">The font data.</param>
    /// <param name="familyName">The font family name.</param>
    /// <returns>The font data entry.</returns>
    public FontData? LoadFontFromBytes(byte[] fontData, string familyName)
    {
        if (fontData is null || fontData.Length == 0)
            return null;

        if (string.IsNullOrWhiteSpace(familyName))
        {
            _logger.LogWarning("Font family name is required when loading from bytes");
            return null;
        }

        var cacheKey = $"memory:{familyName.ToLowerInvariant()}";
        if (_fontCache.TryGetValue(cacheKey, out var cached))
        {
            cached.RecordAccess();
            return cached;
        }

        var data = new FontData
        {
            Data = fontData,
            FilePath = null,
            FamilyName = familyName,
            SizeBytes = fontData.Length,
        };

        _fontCache.TryAdd(cacheKey, data);

        // Register with QuestPDF
        try
        {
            FontManager.RegisterFont(fontData);
            _logger.LogDebug(
                "Font registered from bytes: {FamilyName} ({Size} bytes)",
                familyName,
                fontData.Length
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to register font with QuestPDF: {FamilyName}",
                familyName
            );
        }

        return data;
    }

    /// <summary>
    /// Gets a font by family name, loading it if necessary.
    /// </summary>
    /// <param name="familyName">The font family name.</param>
    /// <returns>The font data, or null if not found.</returns>
    public FontData? GetFont(string familyName)
    {
        if (string.IsNullOrWhiteSpace(familyName))
            return null;

        // Search by family name
        var font = _fontCache.Values.FirstOrDefault(f =>
            f.FamilyName.Equals(familyName, StringComparison.OrdinalIgnoreCase)
        );

        font?.RecordAccess();
        return font;
    }

    /// <summary>
    /// Checks if a font is available.
    /// </summary>
    /// <param name="familyName">The font family name.</param>
    /// <returns>True if the font is available; otherwise, false.</returns>
    public bool IsFontAvailable(string familyName)
    {
        if (string.IsNullOrWhiteSpace(familyName))
            return false;

        return _fontCache.Values.Any(f =>
            f.FamilyName.Equals(familyName, StringComparison.OrdinalIgnoreCase)
        );
    }

    /// <summary>
    /// Gets the fallback font family name.
    /// </summary>
    /// <param name="requestedFamily">The requested family.</param>
    /// <returns>The fallback family name if the requested one is not available.</returns>
    public string GetFallbackFont(string? requestedFamily)
    {
        if (!string.IsNullOrWhiteSpace(requestedFamily) && IsFontAvailable(requestedFamily))
        {
            return requestedFamily;
        }

        // Try configured fallback
        if (!string.IsNullOrWhiteSpace(_options.DefaultFontFamily))
        {
            return _options.DefaultFontFamily;
        }

        // Use system default
        return DefaultFonts.Regular;
    }

    /// <summary>
    /// Gets cache statistics.
    /// </summary>
    /// <returns>Font cache statistics.</returns>
    public FontCacheStatistics GetStatistics()
    {
        return new FontCacheStatistics
        {
            LoadedFontCount = _fontCache.Count,
            TotalSizeBytes = TotalFontSizeBytes,
            Fonts = _fontCache
                .Values.Select(f => new FontInfo
                {
                    FamilyName = f.FamilyName,
                    FilePath = f.FilePath,
                    SizeBytes = f.SizeBytes,
                    AccessCount = f.AccessCount,
                })
                .ToList(),
        };
    }

    /// <summary>
    /// Clears the font cache.
    /// </summary>
    public void ClearCache()
    {
        _fontCache.Clear();
        _fontsRegistered = false;
        _logger.LogInformation("Font cache cleared");
    }

    private async Task LoadAndRegisterFontAsync(
        string fontPath,
        CancellationToken cancellationToken
    )
    {
        var fontData = await LoadFontAsync(fontPath, cancellationToken);
        if (fontData?.Data is not null)
        {
            FontManager.RegisterFont(fontData.Data);
        }
    }

    private static void RegisterFont(byte[] fontData)
    {
        // QuestPDF uses SkiaSharp internally for font management
        // The FontManager.RegisterFont method handles font registration
        using var stream = new MemoryStream(fontData);
        QuestPDF.Drawing.FontManager.RegisterFontWithCustomName(
            ExtractFontFamilyNameFromData(fontData) ?? "CustomFont",
            stream
        );
    }

    private static string ExtractFontFamilyName(string filePath)
    {
        // Simple extraction from filename
        var fileName = Path.GetFileNameWithoutExtension(filePath);
        // Remove common suffixes like -Regular, -Bold, etc.
        var suffixes = new[]
        {
            "-Regular",
            "-Bold",
            "-Italic",
            "-Light",
            "-Medium",
            "-SemiBold",
            "_Regular",
            "_Bold",
        };
        foreach (var suffix in suffixes)
        {
            if (fileName.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            {
                fileName = fileName[..^suffix.Length];
                break;
            }
        }
        return fileName;
    }

    private static string? ExtractFontFamilyNameFromData(byte[] fontData)
    {
        // This is a simplified implementation
        // A full implementation would parse the font file's name table (OpenType/TrueType)
        // The name table contains the font family name at nameID 1
        // For now, return null to use a default name
        _ = fontData; // Suppress unused parameter warning
        return null;
    }

    /// <inheritdoc />
    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;
        _loadLock.Dispose();
        _fontCache.Clear();
    }
}

/// <summary>
/// Font manager configuration options.
/// </summary>
public sealed class FontManagerOptions
{
    /// <summary>
    /// Gets or sets the base path for custom fonts.
    /// </summary>
    public string? FontBasePath { get; set; }

    /// <summary>
    /// Gets or sets the default font family.
    /// </summary>
    public string DefaultFontFamily { get; set; } = "Arial";

    /// <summary>
    /// Gets or sets whether to preload fonts on startup.
    /// </summary>
    public bool PreloadFonts { get; set; } = true;

    /// <summary>
    /// Gets or sets the maximum cache size for fonts in bytes.
    /// </summary>
    public long MaxCacheSizeBytes { get; set; } = 50 * 1024 * 1024; // 50 MB
}

/// <summary>
/// Represents cached font data.
/// </summary>
public sealed class FontData
{
    /// <summary>
    /// Gets or sets the font file data.
    /// </summary>
    public required byte[] Data { get; init; }

    /// <summary>
    /// Gets or sets the file path (null if loaded from memory).
    /// </summary>
    public string? FilePath { get; init; }

    /// <summary>
    /// Gets or sets the font family name.
    /// </summary>
    public required string FamilyName { get; init; }

    /// <summary>
    /// Gets or sets the size in bytes.
    /// </summary>
    public long SizeBytes { get; init; }

    /// <summary>
    /// Gets the time when this font was loaded.
    /// </summary>
    public DateTime LoadedAt { get; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the last access time.
    /// </summary>
    public DateTime LastAccessedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the access count.
    /// </summary>
    public long AccessCount { get; set; }

    /// <summary>
    /// Records an access to this font.
    /// </summary>
    public void RecordAccess()
    {
        LastAccessedAt = DateTime.UtcNow;
        Interlocked.Increment(ref _accessCount);
    }

    private long _accessCount;
}

/// <summary>
/// Font cache statistics.
/// </summary>
public sealed class FontCacheStatistics
{
    /// <summary>
    /// Gets or sets the number of loaded fonts.
    /// </summary>
    public int LoadedFontCount { get; init; }

    /// <summary>
    /// Gets or sets the total size in bytes.
    /// </summary>
    public long TotalSizeBytes { get; init; }

    /// <summary>
    /// Gets or sets the list of loaded fonts.
    /// </summary>
    public List<FontInfo> Fonts { get; init; } = [];
}

/// <summary>
/// Information about a loaded font.
/// </summary>
public sealed class FontInfo
{
    /// <summary>
    /// Gets or sets the font family name.
    /// </summary>
    public required string FamilyName { get; init; }

    /// <summary>
    /// Gets or sets the file path.
    /// </summary>
    public string? FilePath { get; init; }

    /// <summary>
    /// Gets or sets the size in bytes.
    /// </summary>
    public long SizeBytes { get; init; }

    /// <summary>
    /// Gets or sets the access count.
    /// </summary>
    public long AccessCount { get; init; }
}

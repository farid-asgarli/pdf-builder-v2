using Microsoft.EntityFrameworkCore;
using PDFBuilder.Core.Domain;

namespace PDFBuilder.Infrastructure.Persistence;

/// <summary>
/// Entity Framework Core database context for PDF Builder.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="TemplateDbContext"/> class.
/// </remarks>
/// <param name="options">The DbContext options.</param>
public class TemplateDbContext(DbContextOptions<TemplateDbContext> options) : DbContext(options)
{
    /// <summary>
    /// Gets or sets the Templates DbSet.
    /// </summary>
    public DbSet<Template> Templates => Set<Template>();

    /// <inheritdoc/>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all entity configurations from this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TemplateDbContext).Assembly);

        // Configure Template entity
        modelBuilder.Entity<Template>(entity =>
        {
            entity.ToTable("Templates");

            entity.HasKey(t => t.Id);

            entity.Property(t => t.Id).ValueGeneratedOnAdd();

            entity.Property(t => t.Name).IsRequired().HasMaxLength(255);

            entity.Property(t => t.Description).HasMaxLength(2000);

            entity.Property(t => t.Category).HasMaxLength(100);

            entity.Property(t => t.LayoutJson).IsRequired().HasColumnType("text");

            entity.Property(t => t.Version).IsRequired().HasDefaultValue(1);

            entity.Property(t => t.IsActive).IsRequired().HasDefaultValue(true);

            entity.Property(t => t.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(t => t.UpdatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(t => t.CreatedBy).HasMaxLength(255);

            entity.Property(t => t.UpdatedBy).HasMaxLength(255);

            // Indexes
            entity.HasIndex(t => t.Name);
            entity.HasIndex(t => t.Category);
            entity.HasIndex(t => t.IsActive);
            entity.HasIndex(t => t.CreatedAt);
        });
    }

    /// <inheritdoc/>
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc/>
    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    private void UpdateTimestamps()
    {
        var entries = ChangeTracker.Entries<Template>();

        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = DateTime.UtcNow;
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }
    }
}

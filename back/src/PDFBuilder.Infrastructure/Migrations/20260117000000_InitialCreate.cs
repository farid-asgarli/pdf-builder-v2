using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDFBuilder.Infrastructure.Migrations;

/// <inheritdoc />
public partial class InitialCreate : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Templates",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(
                    type: "character varying(255)",
                    maxLength: 255,
                    nullable: false
                ),
                Description = table.Column<string>(
                    type: "character varying(2000)",
                    maxLength: 2000,
                    nullable: true
                ),
                Category = table.Column<string>(
                    type: "character varying(100)",
                    maxLength: 100,
                    nullable: true
                ),
                LayoutJson = table.Column<string>(type: "text", nullable: false),
                Version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                CreatedAt = table.Column<DateTime>(
                    type: "timestamp with time zone",
                    nullable: false,
                    defaultValueSql: "CURRENT_TIMESTAMP"
                ),
                UpdatedAt = table.Column<DateTime>(
                    type: "timestamp with time zone",
                    nullable: false,
                    defaultValueSql: "CURRENT_TIMESTAMP"
                ),
                CreatedBy = table.Column<string>(
                    type: "character varying(255)",
                    maxLength: 255,
                    nullable: true
                ),
                UpdatedBy = table.Column<string>(
                    type: "character varying(255)",
                    maxLength: 255,
                    nullable: true
                ),
                MetadataJson = table.Column<string>(type: "text", nullable: true),
                Tags = table.Column<string>(
                    type: "character varying(500)",
                    maxLength: 500,
                    nullable: true
                ),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Templates", x => x.Id);
            }
        );

        migrationBuilder.CreateIndex(
            name: "IX_Templates_Category",
            table: "Templates",
            column: "Category"
        );

        migrationBuilder.CreateIndex(
            name: "IX_Templates_CreatedAt",
            table: "Templates",
            column: "CreatedAt"
        );

        migrationBuilder.CreateIndex(
            name: "IX_Templates_IsActive",
            table: "Templates",
            column: "IsActive"
        );

        migrationBuilder.CreateIndex(name: "IX_Templates_Name", table: "Templates", column: "Name");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Templates");
    }
}

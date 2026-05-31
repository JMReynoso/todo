using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceDueWithStartsOn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Add the new user-chosen anchor column, nullable for now so we
            //    can backfill existing rows before enforcing NOT NULL.
            migrationBuilder.AddColumn<DateOnly>(
                name: "StartsOn",
                table: "Todos",
                type: "date",
                nullable: true);

            // 2. Backfill the anchor from each row's creation timestamp.
            migrationBuilder.Sql(@"UPDATE ""Todos"" SET ""StartsOn"" = ""CreatedAt""::date;");

            // 3. Backfill any missing DueOn as StartsOn + one cadence period,
            //    matching the client/reset-job period math. Cadence enum values:
            //    0=Once, 1=Daily, 2=Weekly, 3=Monthly, 4=Quarterly. Once is due
            //    on its anchor (no recurrence).
            migrationBuilder.Sql(@"
                UPDATE ""Todos""
                SET ""DueOn"" = CASE ""Cadence""
                    WHEN 1 THEN ""StartsOn"" + 1
                    WHEN 2 THEN ""StartsOn"" + 7
                    WHEN 3 THEN (""StartsOn"" + INTERVAL '1 month')::date
                    WHEN 4 THEN (""StartsOn"" + INTERVAL '3 months')::date
                    ELSE ""StartsOn""
                END
                WHERE ""DueOn"" IS NULL;");

            // 4. Every row now has an anchor — enforce NOT NULL.
            migrationBuilder.AlterColumn<DateOnly>(
                name: "StartsOn",
                table: "Todos",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateOnly),
                oldType: "date",
                oldNullable: true);

            // 5. Drop the retired free-text hint and the Once-only anchor; both
            //    are superseded by StartsOn.
            migrationBuilder.DropColumn(name: "Due", table: "Todos");
            migrationBuilder.DropColumn(name: "Date", table: "Todos");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The original free-text values can't be reconstructed; restore the
            // column shapes with empty/null defaults.
            migrationBuilder.AddColumn<string>(
                name: "Due",
                table: "Todos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateOnly>(
                name: "Date",
                table: "Todos",
                type: "date",
                nullable: true);

            migrationBuilder.DropColumn(name: "StartsOn", table: "Todos");
        }
    }
}

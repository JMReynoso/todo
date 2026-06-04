using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCompletedDates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly[]>(
                name: "CompletedDates",
                table: "Todos",
                type: "date[]",
                nullable: false,
                defaultValue: Array.Empty<DateOnly>());
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompletedDates",
                table: "Todos");
        }
    }
}

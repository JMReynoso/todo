using api.Application.DTOs.Requests;
using FluentValidation;

namespace api.Application.Validators;

public class UpdateTodoRequestValidator : AbstractValidator<UpdateTodoRequest>
{
    public UpdateTodoRequestValidator()
    {
        RuleFor(todo => todo.Title).NotEmpty().MaximumLength(200);
        RuleFor(todo => todo.Priority).IsInEnum();

        // Assignee is optional; when set it must reference a real person id.
        RuleFor(todo => todo.AssigneeId!.Value)
            .GreaterThan(0)
            .When(todo => todo.AssigneeId.HasValue);
    }
}

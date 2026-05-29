using api.Application.DTOs.Requests;
using FluentValidation;

namespace api.Application.Validators;

public class UpdateScoringSettingsRequestValidator : AbstractValidator<UpdateScoringSettingsRequest>
{
    public UpdateScoringSettingsRequestValidator()
    {
        RuleFor(scoring => scoring.StreakThreshold).GreaterThanOrEqualTo(0);
    }
}

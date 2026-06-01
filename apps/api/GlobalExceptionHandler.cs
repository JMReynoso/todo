using api.Domain.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using FluentValidation;

namespace api;

/// <summary>
/// Translates anticipated exception types into clean 400 ProblemDetails
/// responses so bad input never surfaces as a 500. A 500 should mean "an
/// unhandled bug we need to fix" — anything we can attribute to the caller
/// (failed validation, a violated domain rule, an undecodable upload) is mapped
/// here instead. Unrecognised exceptions fall through (return false) to the
/// framework's default handler, which logs and returns 500.
/// </summary>
public sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetails,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        var problem = exception switch
        {
            ValidationException ve => new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation failed",
                Extensions =
                {
                    ["errors"] = ve.Errors
                        .GroupBy(e => e.PropertyName)
                        .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray()),
                },
            },
            DomainException de => new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Request could not be processed",
                Detail = de.Message,
            },
            _ => null,
        };

        if (problem is null) return false; // not ours — let the default 500 path handle it

        logger.LogWarning(exception, "Returning {Status} for {ExceptionType}",
            problem.Status, exception.GetType().Name);

        httpContext.Response.StatusCode = problem.Status!.Value;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = problem,
        });
    }
}

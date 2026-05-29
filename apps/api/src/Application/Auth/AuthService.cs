using api.Application.DTOs.Requests;
using api.Application.DTOs.Responses;
using api.Domain.Interfaces;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace api.Application.Auth;

public class AuthService(IPersonRepository persons, IOptions<JwtOptions> jwtOptions)
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var person = await persons.GetByEmailAsync(request.Email, ct);
        if (person is null || string.IsNullOrEmpty(person.PasswordHash))
            return null;

        if (!BCrypt.Net.BCrypt.Verify(request.Password, person.PasswordHash))
            return null;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Value.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims:
            [
                new Claim(ClaimTypes.NameIdentifier, person.Id.ToString()),
                new Claim(ClaimTypes.Email, person.Email),
                new Claim(ClaimTypes.Name, person.Name),
            ],
            signingCredentials: creds);

        return new LoginResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            person.Id,
            person.Name,
            person.Email);
    }
}

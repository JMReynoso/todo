namespace api.Application.Auth;

public class JwtOptions
{
    public string Secret { get; set; } = string.Empty;

    /// <summary>
    /// How long an issued token stays valid. Tokens are stateless and can't be
    /// revoked server-side, so this bounds the blast radius of a leaked token.
    /// </summary>
    public int ExpiryDays { get; set; } = 30;
}

namespace Backend.Infra;

/// <summary>
/// Abstraction over a secrets store.
///
/// Two implementations ship with this example:
/// <list type="bullet">
///   <item><see cref="InMemorySecretStore"/> — demo only. Secrets are lost on restart and not shared across processes.</item>
///   <item><see cref="KeyVaultSecretStore"/> — production pattern using Azure Key Vault, mirroring how the NomaSign internal services manage secrets.</item>
/// </list>
///
/// DI selects between them based on configuration: if <c>KeyVault:Url</c> is set in
/// <c>appsettings.json</c>, the Key Vault implementation is wired up; otherwise the
/// in-memory store is used (with a startup warning).
///
/// NEVER store production secrets in <c>appsettings.json</c>, source control, or a database.
/// </summary>
public interface ISecretStore
{
    /// <summary>Retrieve a secret by key. Returns null if not found.</summary>
    Task<string?> GetSecretAsync(string key);

    /// <summary>Store or update a secret.</summary>
    Task SetSecretAsync(string key, string value);
}

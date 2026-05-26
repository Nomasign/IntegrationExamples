using System.Collections.Concurrent;

namespace Backend.Infra;

/// <summary>
/// Process-local secret store backed by a <see cref="ConcurrentDictionary{TKey, TValue}"/>.
/// Intended ONLY for the interactive demo.
///
/// Known limitations (deliberately not addressed — use <see cref="KeyVaultSecretStore"/> in production):
/// <list type="bullet">
///   <item><b>Lost on restart.</b> Secrets live only in process memory. Restarting the backend wipes them.</item>
///   <item><b>Single-process.</b> Behind a load balancer, each instance would have its own copy; webhook deliveries hitting the wrong node would fail signature verification.</item>
///   <item><b>No encryption at rest.</b> Memory dumps and crash logs may expose the secret.</item>
///   <item><b>No access auditing.</b> Production stores log who read what, when.</item>
/// </list>
///
/// Thread-safety: the underlying <see cref="ConcurrentDictionary{TKey, TValue}"/> is safe for concurrent
/// reads/writes (webhook requests arrive on the thread pool; the UI's "Set Secret" call writes from a separate request thread).
/// </summary>
public class InMemorySecretStore : ISecretStore
{
    private readonly ConcurrentDictionary<string, string> _secrets = new();

    public Task<string?> GetSecretAsync(string key) =>
        Task.FromResult(_secrets.TryGetValue(key, out var value) ? value : null);

    public Task SetSecretAsync(string key, string value)
    {
        _secrets[key] = value;
        return Task.CompletedTask;
    }
}

/// <summary>
/// Startup hosted service that logs a warning when the demo is running with the in-memory
/// secret store. Registered only when <c>KeyVault:Url</c> is not configured.
/// </summary>
public class InMemorySecretStoreStartupWarning : IHostedService
{
    private readonly ILogger<InMemorySecretStoreStartupWarning> _logger;

    public InMemorySecretStoreStartupWarning(ILogger<InMemorySecretStoreStartupWarning> logger)
    {
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogWarning(
            "Using InMemorySecretStore. Secrets are lost on restart and not shared across processes. " +
            "For production, configure KeyVault:Url in appsettings.json to use KeyVaultSecretStore.");
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

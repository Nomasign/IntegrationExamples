namespace Backend.Services;

/// <summary>
/// Holds runtime-configurable settings that can be changed via the UI.
/// Initialised from appsettings.json, overridable at runtime.
/// </summary>
public class RuntimeSettings
{
    private string _baseUrl;

    public RuntimeSettings(string baseUrl)
    {
        _baseUrl = baseUrl;
    }

    public string BaseUrl
    {
        get => _baseUrl;
        set => _baseUrl = value.TrimEnd('/');
    }
}

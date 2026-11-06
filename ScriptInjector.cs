using System.Text.RegularExpressions;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.VideoFilters;

/// <summary>
/// Adds a script tag to jellyfin-web's index.html on startup and removes it on shutdown.
/// The jellyfin-web folder must be writable by the user running Jellyfin.
/// </summary>
public class ScriptInjector : IHostedService
{
    internal const string Marker = "<!-- VideoFilters plugin -->";

    // Relative on purpose: index.html lives at <base>/web/index.html, so "../" reaches <base>/VideoFilters/...
    // and this keeps working when Jellyfin runs under a base URL such as /jellyfin.
    private const string ScriptTag =
        "<script plugin=\"VideoFilters\" defer src=\"../VideoFilters/script.js?v={0}\"></script>";

    /// <summary>The marker comment plus the script tag, as inserted into index.html.</summary>
    internal static string BuildBlock()
    {
        var version = typeof(Plugin).Assembly.GetName().Version?.ToString() ?? "1";
        return Marker + string.Format(ScriptTag, version);
    }

    private static readonly Regex ExistingBlock = new(
        Regex.Escape(Marker) + @".*?</script>",
        RegexOptions.Singleline | RegexOptions.Compiled);

    private readonly IApplicationPaths _paths;
    private readonly ILogger<ScriptInjector> _logger;

    public ScriptInjector(IApplicationPaths paths, ILogger<ScriptInjector> logger)
    {
        _paths = paths;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            Inject();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Video Filters could not write to index.html in '{WebPath}' (read-only?). The script tag is added while serving the page instead.",
                _paths.WebPath);
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        try
        {
            Remove();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Video Filters could not clean up index.html.");
        }

        return Task.CompletedTask;
    }

    private string? IndexPath()
    {
        var path = Path.Combine(_paths.WebPath, "index.html");
        if (File.Exists(path))
        {
            return path;
        }

        _logger.LogWarning("Video Filters: index.html not found at '{Path}' (is the web client disabled?).", path);
        return null;
    }

    private void Inject()
    {
        var path = IndexPath();
        if (path is null)
        {
            return;
        }

        var block = BuildBlock();

        var html = File.ReadAllText(path);
        var cleaned = ExistingBlock.Replace(html, string.Empty);

        var bodyEnd = cleaned.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        if (bodyEnd < 0)
        {
            _logger.LogWarning("Video Filters: no </body> tag found in index.html, nothing injected.");
            return;
        }

        var updated = cleaned.Insert(bodyEnd, block);
        if (updated == html)
        {
            _logger.LogInformation("Video Filters: script tag already present.");
            return;
        }

        File.WriteAllText(path, updated);
        _logger.LogInformation("Video Filters: script tag injected into {Path}", path);
    }

    private void Remove()
    {
        var path = IndexPath();
        if (path is null)
        {
            return;
        }

        var html = File.ReadAllText(path);
        var cleaned = ExistingBlock.Replace(html, string.Empty);
        if (cleaned != html)
        {
            File.WriteAllText(path, cleaned);
            _logger.LogInformation("Video Filters: script tag removed from {Path}", path);
        }
    }
}

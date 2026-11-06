using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.VideoFilters;

/// <summary>
/// Video Filters: live brightness / contrast / saturation / gamma controls for the web player.
/// All processing happens in the browser; the plugin only serves and injects a small script.
/// </summary>
public class Plugin : BasePlugin<BasePluginConfiguration>
{
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public static Plugin? Instance { get; private set; }

    public override string Name => "Video Filters";

    public override Guid Id => Guid.Parse("6f1c2a4e-3b7d-4c59-9a1e-8d2f5b7c0e13");

    public override string Description =>
        "Adds live brightness, contrast, saturation, gamma, hue, sepia and grayscale controls to the web player.";
}

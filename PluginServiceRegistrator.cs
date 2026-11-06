using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.VideoFilters;

/// <summary>Registers the service that adds the script tag to the web client.</summary>
public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        // Adds the script tag to the served index.html (works with a read-only web folder).
        serviceCollection.AddSingleton<IStartupFilter, InjectionStartupFilter>();

        // Also tries to write the tag into index.html at startup. Harmless if the folder is read-only.
        serviceCollection.AddHostedService<ScriptInjector>();
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.VideoFilters;

/// <summary>Serves the embedded filter script to the web client.</summary>
[ApiController]
[AllowAnonymous]
[Route("VideoFilters")]
public class VideoFiltersController : ControllerBase
{
    /// <summary>Gets the player filter script.</summary>
    [HttpGet("script.js")]
    [Produces("application/javascript")]
    public ActionResult GetScript()
    {
        var assembly = typeof(VideoFiltersController).Assembly;
        var resourceName = assembly
            .GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("videofilters.js", StringComparison.OrdinalIgnoreCase));

        if (resourceName is null)
        {
            return NotFound();
        }

        var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "no-cache";
        return File(stream, "application/javascript");
    }
}

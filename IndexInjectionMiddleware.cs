using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace Jellyfin.Plugin.VideoFilters;

/// <summary>
/// Puts the middleware at the start of the request pipeline, so it sees the web client's index.html
/// before it is sent to the browser.
/// </summary>
public class InjectionStartupFilter : IStartupFilter
{
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return app =>
        {
            app.UseMiddleware<IndexInjectionMiddleware>();
            next(app);
        };
    }
}

/// <summary>
/// Adds the script tag to index.html as it is served. This works even when the jellyfin-web folder
/// is read-only (common in Docker), because nothing is written to disk.
/// </summary>
public class IndexInjectionMiddleware
{
    private readonly RequestDelegate _next;

    public IndexInjectionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!IsIndexRequest(context.Request))
        {
            await _next(context);
            return;
        }

        // Ask the rest of the pipeline for a complete, uncompressed, unconditional response,
        // so the body can be edited before it is sent.
        var headers = context.Request.Headers;
        headers.Remove("Accept-Encoding");
        headers.Remove("If-None-Match");
        headers.Remove("If-Modified-Since");
        headers.Remove("If-Range");
        headers.Remove("Range");

        var original = context.Response.Body;
        using var buffer = new MemoryStream();
        context.Response.Body = buffer;

        try
        {
            await _next(context);
        }
        finally
        {
            context.Response.Body = original;
        }

        var isHtml = context.Response.StatusCode == StatusCodes.Status200OK
            && (context.Response.ContentType?.StartsWith("text/html", StringComparison.OrdinalIgnoreCase) ?? false)
            && !context.Response.Headers.ContainsKey("Content-Encoding");

        if (isHtml)
        {
            var html = Encoding.UTF8.GetString(buffer.ToArray());
            var modified = Inject(html);
            if (modified is not null)
            {
                var bytes = Encoding.UTF8.GetBytes(modified);
                context.Response.Headers.Remove("ETag");
                context.Response.ContentLength = bytes.Length;
                await original.WriteAsync(bytes, context.RequestAborted);
                return;
            }
        }

        buffer.Position = 0;
        await buffer.CopyToAsync(original, context.RequestAborted);
    }

    private static bool IsIndexRequest(HttpRequest request)
    {
        if (!HttpMethods.IsGet(request.Method))
        {
            return false;
        }

        // The path may still include a base URL prefix here, so only the ending is compared.
        var path = request.Path.Value ?? string.Empty;
        return path.EndsWith("/web/index.html", StringComparison.OrdinalIgnoreCase)
            || path.EndsWith("/web/", StringComparison.OrdinalIgnoreCase);
    }

    private static string? Inject(string html)
    {
        if (html.Contains(ScriptInjector.Marker, StringComparison.Ordinal))
        {
            // Already present, for example because it was written to the file at startup.
            return null;
        }

        var bodyEnd = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        return bodyEnd < 0 ? null : html.Insert(bodyEnd, ScriptInjector.BuildBlock());
    }
}

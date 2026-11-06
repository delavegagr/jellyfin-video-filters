# Jellyfin Video Filters plugin

Live brightness, contrast, saturation, gamma, hue, sepia and grayscale controls for the Jellyfin **web player**, with presets. Everything runs in the browser. There is no server processing, no AI and no extra container.

## How it works

- The plugin serves one small script at `/VideoFilters/script.js`.
- It adds a `<script>` tag to jellyfin-web's `index.html` **as the page is served**, so nothing has to be written to disk. This is what makes it work in Docker containers where the web folder is read-only.
- As a second route, it also tries to write the same tag into `index.html` at startup. If the folder is read-only you get a harmless warning in the log.
- The script adds a filter button next to the subtitles button in the player (or press **Alt+B**). Settings are saved per browser.

## Status

This source was written without a .NET compiler, so it has **not been compiled or run yet**. Build it first, then check the Jellyfin log and the player.

## Build

Built for **Jellyfin 12.x** (net10.0, Jellyfin.Controller 12.0.0, targetAbi 12.0.0.0).

1. Open your Jellyfin appdata folder (for example `/mnt/user/appdata/jellyfin/`) and find the `plugins` folder. In the official image it is `plugins/`; in the LinuxServer image it is usually `data/plugins/`. An existing plugin's folder is the easiest way to confirm.
2. Create a folder `VideoFilters` inside it and put `Jellyfin.Plugin.VideoFilters.dll` and `meta.json` in it.
3. Restart the Jellyfin container.
4. Hard-refresh the browser (Ctrl+F5) and play a video. In the Jellyfin log you should see a line starting with `Video Filters`.

## Other Jellyfin versions

| Jellyfin | Target framework | Jellyfin.Controller | targetAbi in meta.json |
|---|---|---|---|
| 12.x | net10.0 | 12.0.0 | 12.0.0.0 |
| 10.11.x | net9.0 | 10.11.0 | 10.11.0.0 |

Also change `dotnet-version` in `.github/workflows/build.yml` to match.

## Troubleshooting

- **No filter button.** Check the Jellyfin log for `Video Filters` lines. Open `/VideoFilters/script.js` on your server address in a browser; if that shows JavaScript, the plugin is loaded and only the injection is missing. In that case the userscript version is a working fallback.
- **Plugin not loaded after a Jellyfin update.** Plugins built for an older major version are ignored. Rebuild with the matching table row above.
- **Other clients.** Only the browser player is affected. Apps and TV clients are unchanged.

## Uninstall

Delete the plugin folder and restart Jellyfin. If the startup write did succeed, the tag is removed again when the server shuts down.

Disclaimer : 
I am not a coder, I created this project with Claude for my own personal usage, I will try to keep it updated

# Jellyfin Video Filters plugin

Live brightness, contrast, saturation, gamma, hue, sepia and grayscale controls for the Jellyfin **web player**, with presets. Everything runs in the browser. There is no server processing, no AI and no extra container.

## How it works

- The plugin serves one small script at `/VideoFilters/script.js`.
- It adds a `<script>` tag to jellyfin-web's `index.html` **as the page is served**, so nothing has to be written to disk. This is what makes it work in Docker containers where the web folder is read-only.
- As a second route, it also tries to write the same tag into `index.html` at startup. If the folder is read-only you get a harmless warning in the log.
- The script adds a filter button next to the subtitles button in the player (or press **Alt+B**). Settings are saved per browser.

## Status

Working in Jellyfin 12.4 

## Troubleshooting
- **No filter button.** Check the Jellyfin log for `Video Filters` lines. Open `/VideoFilters/script.js` on your server address in a browser; if that shows JavaScript, the plugin is loaded and only the injection is missing. In that case the userscript version is a working fallback.
- **Plugin not loaded after a Jellyfin update.** Plugins built for an older major version are ignored. Rebuild with the matching table row above.
- **Other clients.** Only the browser player is affected. Apps and TV clients are unchanged.

## Uninstall

Delete the plugin folder and restart Jellyfin. If the startup write did succeed, the tag is removed again when the server shuts down.

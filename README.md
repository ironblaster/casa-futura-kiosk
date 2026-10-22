<p align="center"><img src="https://raw.githubusercontent.com/ironblaster/casa-futura-kiosk/main/images/banner.png" alt="Casa Futura"></p>

# Casa Futura Kiosk

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/docs/faq/custom_repositories)
[![GitHub release](https://img.shields.io/github/v/release/ironblaster/casa-futura-kiosk)](https://github.com/ironblaster/casa-futura-kiosk/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ff69b4)](https://github.com/sponsors/ironblaster)

Three small fixes for Home Assistant on a wall tablet, set from one invisible card with a visual editor:

- **Status bar color.** In full screen the Android companion app still keeps the space of the status bar at the top and paints it with the header color of your theme: a band that does not match your background. The card paints it the color you want.
- **Zoom.** Every card of the view smaller or bigger, like the zoom of the browser, optionally only on wide screens. Windows and more-info keep their size.
- **Return home.** After some time without touches it closes the open windows (more-info, browser_mod popups, Casa Futura dialogs) and goes back to the first view, scrolled to the top.

Everything can apply to some users only, e.g. the user of the wall tablet: on your phone the dashboard stays as it is.

![Casa Futura Kiosk in edit mode](https://raw.githubusercontent.com/ironblaster/casa-futura-kiosk/main/images/preview.png)

🇮🇹 [Leggi in italiano](README.it.md) · Pairs well with [kiosk-mode](https://github.com/NemesisRE/kiosk-mode) (hides the header and the sidebar) and with the other [Casa Futura](#the-casa-futura-family) packages.

## Installation

### HACS

1. In HACS open the menu (⋮) → **Custom repositories**.
2. Add `https://github.com/ironblaster/casa-futura-kiosk` with type **Dashboard**.
3. Install **Casa Futura Kiosk** and reload the browser.

### Manual

1. Download `casa-futura-kiosk.js` from the [latest release](https://github.com/ironblaster/casa-futura-kiosk/releases) into `config/www/`.
2. In **Settings → Dashboards → ⋮ → Resources** add `/local/casa-futura-kiosk.js?v=1.0.0` as a **JavaScript module**. When you update the file by hand, change the `?v=` number too: Home Assistant lets browsers cache files in `/local` for a long time.

## Use

Add the card **Casa Futura · Kiosk** to every view of the dashboard you use on the tablet (copy it from one view to the others). It is invisible: you see it only while editing the dashboard, with a summary of what it does.

```yaml
type: custom:casa-futura-kiosk-card
users:
  - tablet               # the Home Assistant user of the wall tablet
status_bar: true
status_color: "#000000"  # the color of your background
zoom: 0.85
zoom_min_width: 700      # only on screens wider than 700 px
return_home: true
timeout: 120             # seconds without touches
```

| Option | Default | Description |
| --- | --- | --- |
| `users` | everyone | Names (or ids) of the users the card works for. |
| `status_bar` | `false` | Paint the status bar of the Android companion app. Does nothing in a browser or in the iOS app. |
| `status_color` | `#000000` | `"#rrggbb"`, `"r, g, b"` or `[r, g, b]`. |
| `zoom` | `1` | `0.85` makes every card 15% smaller, `1.1` 10% bigger. |
| `zoom_min_width` | `0` | Apply the zoom only on screens at least this wide, in pixels. `0`: always. |
| `return_home` | `false` | Go back home after `timeout` seconds without touches. Paused while you edit the dashboard. |
| `timeout` | `120` | Seconds, from 10. |
| `home` | the first view | The path of a view of this dashboard (`lights`), a full path (`/dashboard-tablet/home`) or a number (`0`). |
| `close_windows` | `true` | Close more-info, browser_mod popups and the windows of the Casa Futura cards before going home. |
| `scroll_top` | `true` | Scroll back to the top. |

### How the status bar fix works

The Android app (2025 and later) draws the space of the status bar above the page and, on every `theme-update` message, reads `--app-header-background-color` from the page. The card sets that variable on the dashboard, sends `theme-update` to the app and puts the variable back if Home Assistant applies the theme again. When you leave the dashboard the theme color comes back.

## Development

One JavaScript file, no build step and no dependencies. Serve the folder (`python3 -m http.server`) and open `demo/index.html`; `?edit=0` hides the card, `?config={...}` sets the options.

## Support

If Casa Futura makes your home a little nicer, you can [sponsor the project on GitHub](https://github.com/sponsors/ironblaster). Thank you!

## The Casa Futura family

- [Glass Clock Weather Card](https://github.com/ironblaster/glass-clock-weather-card): a big clock with animated weather.
- [Casa Futura Cards](https://github.com/ironblaster/casa-futura-cards): gauge, alerts bell, action buttons with PIN, climate, light, vacuum and cameras.
- [Casa Futura Theme](https://github.com/ironblaster/casa-futura-theme): the dark liquid glass theme.
- [Casa Futura Kiosk](https://github.com/ironblaster/casa-futura-kiosk): status bar color, zoom and return home for wall tablets.

## License

[MIT](LICENSE) © 2026 ironblaster

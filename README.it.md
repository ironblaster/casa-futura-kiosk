<p align="center"><img src="https://raw.githubusercontent.com/ironblaster/casa-futura-kiosk/main/images/banner.png" alt="Casa Futura"></p>

# Casa Futura Kiosk

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/docs/faq/custom_repositories)
[![GitHub release](https://img.shields.io/github/v/release/ironblaster/casa-futura-kiosk)](https://github.com/ironblaster/casa-futura-kiosk/releases)
[![Licenza: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ff69b4)](https://github.com/sponsors/ironblaster)

Tre piccole correzioni per Home Assistant su un tablet a muro, da una card invisibile con l'editor visuale:

- **Colore della barra di stato.** A schermo intero l'app Android di Home Assistant lascia comunque in cima lo spazio della barra di stato e lo colora con il colore dell'intestazione del tema: una fascia che non c'entra con il tuo sfondo. La card la colora come vuoi tu.
- **Zoom.** Tutte le card della vista più piccole o più grandi, come lo zoom del browser, anche solo sugli schermi larghi. Finestre e dettagli restano come sono.
- **Ritorno alla home.** Dopo un po' che nessuno tocca lo schermo chiude le finestre aperte (dettagli, popup di browser_mod, finestre delle card Casa Futura) e torna alla prima vista, in cima alla pagina.

Tutto può valere solo per alcuni utenti, per esempio quello del tablet: sul tuo telefono la dashboard resta com'è.

![Casa Futura Kiosk in modifica](https://raw.githubusercontent.com/ironblaster/casa-futura-kiosk/main/images/preview.png)

🇬🇧 [Read in English](README.md)

## Installazione

### HACS

1. In HACS apri il menu (⋮) → **Repository personalizzati**.
2. Aggiungi `https://github.com/ironblaster/casa-futura-kiosk` con tipo **Dashboard**.
3. Installa **Casa Futura Kiosk** e ricarica il browser.

### A mano

1. Scarica `casa-futura-kiosk.js` dall'[ultima versione](https://github.com/ironblaster/casa-futura-kiosk/releases) e copialo in `config/www/`.
2. In **Impostazioni → Plance → ⋮ → Risorse** aggiungi `/local/casa-futura-kiosk.js?v=1.0.0` come **modulo JavaScript**. Quando aggiorni il file a mano cambia anche il numero dopo `?v=`.

## Uso

Aggiungi la card **Casa Futura · Kiosk** in ogni vista della dashboard che usi sul tablet (copiala da una vista alle altre). Non si vede: compare solo mentre modifichi la dashboard, con un riassunto di cosa fa.

```yaml
type: custom:casa-futura-kiosk-card
users:
  - tablet               # l'utente di Home Assistant del tablet a muro
status_bar: true
status_color: "#000000"  # il colore del tuo sfondo
zoom: 0.85
zoom_min_width: 700      # solo su schermi più larghi di 700 px
return_home: true
timeout: 120             # secondi senza tocchi
```

Tutte le opzioni sono nella [tabella del README in inglese](README.md#use) e nell'editor visuale: i nomi sono gli stessi.

## Sostieni il progetto

Se Casa Futura ti piace, puoi [sostenere il progetto su GitHub Sponsors](https://github.com/sponsors/ironblaster). Grazie!

## La famiglia Casa Futura

- [Glass Clock Weather Card](https://github.com/ironblaster/glass-clock-weather-card): un orologio grande con il meteo animato.
- [Casa Futura Cards](https://github.com/ironblaster/casa-futura-cards): quadrante, campanella degli avvisi, pulsanti con PIN, clima, luci, robot e telecamere.
- [Casa Futura Theme](https://github.com/ironblaster/casa-futura-theme): il tema scuro in stile vetro.
- [Casa Futura Kiosk](https://github.com/ironblaster/casa-futura-kiosk): colore della barra di stato, zoom e ritorno alla home per i tablet a muro.

## Licenza

[MIT](LICENSE) © 2026 ironblaster

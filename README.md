# Kringsringen

En avantgardistisk "bullet heaven" overlevelsesopplevelse bygget med Phaser 3, React og TypeScript.

## ⚔️ Oversikt
Kringsringen er et mørkt, minimalistisk spill hvor du må overleve bølger av monstre i et sirkulært landskap. Bruk gull fra falne fiender til å kjøpe oppgraderinger, låse opp synergier som "Thermal Shock", og bekjemp legendariske bosser.

## 🏗️ Prosjektstruktur
- `src/game/`: Kjerne-logikken (Phaser scener, managers, spill-objekter).
- `src/components/`: React UI-lag (Hud, Butikk, Menyer).
- `src/config/`: Spill-data (Enemies, Bosses, Upgrades, GameConfig).
- `docs/`: Omfattende spilldesign- og teknisk dokumentasjon.
- `public/assets/`: Alle spill-aktiva (Sprites, Audio, Kart).

## 🛠️ Teknisk Stack
- **Engine:** Phaser 3.80.1
- **UI:** React 18
- **Language:** TypeScript
- **Styling:** Vanilla CSS (Medieval-themed)
- **Networking:** PeerJS (Multiplayer)

## 📖 Dokumentasjon
- [Game Design Document](file:///home/irik/Kringsringen/docs/gamedesign_document.md) — Mekanikk, monstre og bølgeoversikt.
- [Audio Catalog](file:///home/irik/Kringsringen/docs/audio_catalog.md) — Oversikt over all lyd og musikk.
- [Save System](file:///home/irik/Kringsringen/docs/save_system.md) — Teknisk guide til lagring og Phaser lifecycle.

## 🚀 Kom i gang
1. `npm install`
2. `npm run dev`
3. Åpne `http://localhost:5173`

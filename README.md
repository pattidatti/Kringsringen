# Kringsringen

En avantgardistisk "bullet heaven" overlevelsesopplevelse bygget med Phaser 3, React og TypeScript.

## ⚔️ Oversikt
Kringsringen er et mørkt, minimalistisk spill hvor du må overleve bølger av monstre i et sirkulært landskap. Bruk gull fra falne fiender til å kjøpe oppgraderinger, låse opp synergier som "Thermal Shock", og bekjemp legendariske bosser.

### 🌟 Nye Features
- **Paragon Progression**: Slå level 10 og "ascend" til Paragon 1-10 med eksponentielt skalerende vanskelighetsgrad
- **Multi-Character System**: Opprett opptil 6 karakterer med separate profiler og progresjon
- **Cloud Save**: Synkroniser karakterer på tvers av enheter via Firebase (Google eller Email/Password)
- **Achievement System**: 30+ achievements som sporer gameplay-prestasjoner
- **Paragon Abilities**: Lås opp kraftige evner ved Paragon 2/4/6 (E/F/Q hotkeys)

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
- **Backend:** Firebase (Authentication + Firestore for cloud saves)

## 📖 Dokumentasjon
- [Game Design Document](./docs/gamedesign_document.md) — Mekanikk, monstre og bølgeoversikt
- [Architecture Guide](./docs/architecture.md) — Manager-mønster og systemflyt
- [Audio Catalog](./docs/audio_catalog.md) — Oversikt over all lyd og musikk
- [Save System](./docs/save_system.md) — Teknisk guide til lagring og Phaser lifecycle
- [Paragon Design](./docs/PARAGON_DESIGN.md) — Paragon progression system og design-filosofi
- [Cloud Save Architecture](./docs/CLOUD_SAVE_ARCHITECTURE.md) — Firebase sync strategi og konfliktløsning
- [Achievement System](./docs/ACHIEVEMENT_SYSTEM.md) — Achievement kategorier og hvordan legge til nye

## 🚀 Kom i gang

### Forutsetninger
- Node.js 18+ og npm
- Firebase-prosjekt (valgfritt for cloud save)

### Installasjon
```bash
npm install
```

### Firebase Oppsett (valgfritt)
1. Opprett et Firebase-prosjekt på [console.firebase.google.com](https://console.firebase.google.com)
2. Aktiver Authentication (Google + Email/Password providers)
3. Aktiver Firestore Database
4. Kopier Firebase config fra Project Settings
5. Opprett `.env.local` basert på `.env.example`:
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... (se .env.example for alle felter)
```

### Kjør spillet
```bash
npm run dev
```
Åpne `http://localhost:5173`

### Bygg for produksjon
```bash
npm run build
npm run preview
```

# Kringsringen: Arkitektur & Systemflyt

Denne guiden beskriver spillets modulariserte arkitektur, hvor "Manager-mønsteret" brukes til å dekomponere den tidligere massive `main.ts`-filen.

## 🏛️ Manager-mønsteret

For å redusere kompleksitet og forbedre testbarhet, er spillets kjerne-logikk delt inn i spesialiserte managere. `MainScene` fungerer som en orkestrator som delegerer spesifikke oppgaver.

### Sentrale Managere i `src/game/`

| Manager | Ansvar |
| :--- | :--- |
| `InputManager` | Håndtering av tastatur- og museinput, inkludert dash og våpenbytte. |
| `WeaponManager` | Styring av spillerens våpenarsenal, prosjektil-spawning og cooldowns. |
| `ClassAbilityManager` | Spesialiserte klasse-evner (Whirlwind, Phantom Volley, Arcane Cascade, Resonanspuls). |
| `PlayerStatsManager` | Derivering av alle spiller-stats fra upgrade-nivåer i registry. Kalkulerer HP, skade, fart, rustning, crit, etc. |
| `PlayerCombatManager` | Skadeinntak, rustning, invincibility frames, knockback og dødsdeteksjon. |
| `BuffManager` | Håndtering av buffs/debuffs med kategoriinndeling, stat-modifikatorer og varighet. Integrert med UI-lag. |
| `CollisionManager` | Definisjon av kollisjons-lag og håndtering av "overlaps" (Phaser Arcade Physics). |
| `SceneVisualManager` | Kamera-effekter (shake, flash), belysning og partikkel-emitters. |
| `WaveManager` | Fiende-spawning, bølge-logikk, nivå-progresjon og boss-trigger. |
| `ObjectPoolManager` | Gjenbrukbar pool for damage text, blod VFX, eksplosjon sprites — reduserer GC-press. |
| `SpatialHashGrid` | Rask fiende-nærhetssøk for kollisjonsdeteksjon (performance-kritisk). |
| `WeatherManager` | Regn- og tåke-partikkeleffekter per level-tema. |
| `AmbientParticleManager` | Ildfluer, løv, embers — ambient VFX basert på level-tema. |
| `SaveManager` | Persistens av meta-progresjon og "in-run" tilstand (to-lags localStorage). |
| `AudioManager` | Global orkestrering av BGM, BGS og asynkron loading av SFX-varianter. |
| `NetworkPacketHandler` | Multiplayer-pakke serialisering/deserialisering via BinaryPacker (kun i multiplayer-modus). |

## 🔗 `IMainScene` interfacet

For å unngå sirkulære avhengigheter og sikre type-sikkerhet, kommuniserer managere med `MainScene` gjennom `IMainScene`-interfacet. Dette definerer de nødvendige egenskapene og metodene managere trenger tilgang til (f.eks. `physics`, `registry`, `player`).

```mermaid
graph TD
    subgraph Core
        MS[MainScene]
    end

    subgraph Interface
        IMS[IMainScene interface]
    end

    subgraph Managers
        IM[InputManager]
        WM[WeaponManager]
        CM[CollisionManager]
        SVM[SceneVisualManager]
        WAV[WaveManager]
    end

    MS -.->|implements| IMS
    IM -.->|uses| IMS
    WM -.->|uses| IMS
    CM -.->|uses| IMS
    SVM -.->|uses| IMS
    WAV -.->|uses| IMS

    IM --> MS
    WM --> MS
    CM --> MS
    SVM --> MS
    WAV --> MS
```

## 🛠️ Spill-løkken (Update Loop)

`MainScene.update()` er holdt minimalistisk. Den kaller kun `update()` på managere som trenger det:

1.  **`Movement & Input`**: `InputManager` beregner spiller-vektorer.
2.  **`Logic`**: `WeaponManager` sjekker angreps-tilstand.
3.  **`Physics`**: Phaser håndterer kollisjoner via `CollisionManager` sitt oppsett.
4.  **`Visuals`**: `SceneVisualManager` oppdaterer dynamisk lys og kamera-vignett.

---
*Sist oppdatert: 3. mars 2026*

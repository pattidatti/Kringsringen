# Multiplayer Architecture Guide: Kringsringen

Dette dokumentet gir en teknisk dypdykk i multiplayer-arkitekturen til Kringsringen. Systemet er bygget for å håndtere sanntidssynkronisering over WebRTC (PeerJS) med et sterkt fokus på ytelse og "game feel".

## 1. Overordnet Modell
Kringsringen bruker en **Host-Authority** modell over en **Peer-to-Peer (P2P)** mesh.

*   **Host (Server):** Kjører all spill-logikk, AI (WaveManager), kollisjonsdeteksjon for fiender, og validering av skade.
*   **Client (Puppet):** Rendrer verden basert på data fra Host, sender egne bevegelser, og utfører "Client-Side Prediction" for umiddelbar respons.

## 2. Nettverkslag (NetworkManager)
Systemet bruker **PeerJS** for WebRTC-kommunikasjon. Hver tilkobling består av to kanaler:

1.  **Reliable (TCP-like):** Brukes for kritiske hendelser (`GAME_EVENT`, `GAME_STATE`). Garanterer rekkefølge og levering.
2.  **Unreliable (UDP-like):** Brukes for høyfrekvent posisjonsdata (`PLAYER_SYNC`, `ENEMY_SYNC`). Prioriterer lav forsinkelse over garantert levering.

### Tids-synkronisering (NTP)
Klienter beregner et tids-offset mot Host ved hjelp av en NTP-lignende algoritme:
- Klient sender `PING` med lokal tid.
- Host svarer med `PONG` inkludert sin tid.
- Klient beregner RTT (Round Trip Time) og oppdaterer sitt `timeOffset` med en **EMA (Exponential Moving Average)** for å dempe jitter.

## 3. Datakomprimering (BinaryPacker)
For å minimere båndbredde pakkes objekter fra JSON til binære `Uint8Array` buffere:

*   **Enemy Sync:** `[type(u8), timestamp(f64), count(u16), ...enemies]`
    *   Hver fiende: `[idLen(u8), id(string), x(i16), y(i16), hp(i16), animLen(u8), anim(string), flipX(u8)]`
*   **Player Sync:** Tilsvarende struktur, men med utvidet data for våpen og navn.

## 4. Synkroniseringsmekanismer

### Jitter Buffer & Interpolering
Klienten mottar pakker i rykk og napp. `JitterBuffer` løser dette:
1.  **Interpolering:** Klienten rendrer verden ca. 100ms i fortiden (`renderTime = serverTime - 100`). Dette gir bufferen tid til å ha minst to rammer å interpolere mellom for silkemyk bevegelse.
2.  **Ekstrapolering (Dead Reckoning):** Hvis pakker er forsinket, beregner klienten en fremtidig posisjon basert på forrige kjente hastighet for å unngå "hopping".

### Lag Compensation (Rollback)
Siden klienten rendrer fortiden, ville det vært umulig å treffe fiender uten kompensasjon.
1.  Host lagrer 1000ms med `positionHistory` for alle fiender.
2.  Når en klient sender en `hit_request`, inkluderer den sin visuelle tid (`timestamp`).
3.  Host spoler fienden tilbake til nøyaktig der den var på klientens skjerm for å validere treffet.

## 5. Client-Side Prediction
For å unngå følelsen av nettverksforsinkelse (input lag), utfører klienten lokale handlinger umiddelbart:
*   **Helse-prediksjon:** Når du treffer en fiende, kaller klienten `predictDamage()`. Fiendens helsebar minker visuelt med en gang.
*   **Døds-prediksjon:** Hvis klienten tror fienden døde, trigges `predictDeath()`. Fienden animeres bort umiddelbart, men objektet fjernes ikke permanent før Host sender `enemy_death` (validering).

## 6. Spill-Livssyklus (Handshake)
Sekvensen for å starte et nivå i multiplayer:
1.  **Map Ready:** `MainScene` genererer kartet lokalt og emitterer `map-ready`.
2.  **Player Loaded:** Klienten sender `player_loaded` til Host når alt er lastet.
3.  **Player Ready:** Når spilleren klikker "Ready" i UI, sendes `player_ready`.
4.  **Sync State:** Host kringkaster `sync_players_state` for å oppdatere alle om hvem som er klare.
5.  **Start Level:** Når alle er klare (`count === players.length`), sender Host `start_level`. Først nå starter `WaveManager`.

## 7. Tekniske Event-Protokoller 💎
Kritiske hendelser som må behandles av alle parter:
- `enemy_death`: Host bekrefter fiendes død. Klienten fjerner "predicted" fiende permanent.
- `hit_request`: Klient ber Host om å validere et treff (inkluderer timestamp for rollback).
- `damage_player`: Host informerer en klient om at de har tatt skade.
- `enemy_heal`: Host informerer klienter om at en Healer Wizard har helbredet en fiende.
- `spawn_enemy_projectile`: Host synkroniserer prosjektiler (piler, ildkuler) fra fiender.

---
*Dokumentasjonen reflekterer implementasjonen per 28. februar 2026.*

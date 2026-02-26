---
description: Den nådeløse revisjonen av Multiplayer-arkitekturen (WebRTC / PeerJS). Jakter på desyncs, ytelsesflaskehalser, og sikkerhetshull i Host-Client modellen.
---

# Multiplayer Audit Workflow v2.0 (The "Ultrathink" Engine)

Den forrige iterasjonen av denne arbeidsflyten var tilstrekkelig for et asynkront eller tregt spill, men manglet dybde for et kompetitivt actionspill med høye krav til presisjon. For å oppnå en "AAA"-opplevelse i en WebRTC-basert indietittel, må vi inkludere sanntidsklokkesynkronisering, jitter-buffere, lag-kompensasjon og bit-optimalisering.

## Steg for Dyp Revisjon

1. **Jitter Buffers & Frame Pacing (Smoothness Control)**
    - **Buffer-dybde**: Når klienten mottar posisjonsoppdateringer via den upålitelige kanalen (UDP/WebRTC), legges de rett i state, eller finnes det en *Jitter Buffer*? (Krev at innkommende pakker bufres i ~50-100ms for å jevne ut nettverksshikes før de interpoleres).
    - **Tick-Alignment**: Opererer spillets logic-ticks på en isolert loop (f.eks. 20Hz), separert fra renderingen (60Hz/144Hz)? LXR (Lerp) over render-frames basert på logic-ticks.

2. **Lagkompensasjon & Hit Registration (The Shooter Standard)**
    - **Host Rewind**: Hvem bestemmer "treff"? (The Shooter problem). Når en klient treffer en fiende, sender de en "treff"-hendelse? Hosten må kunne "spole tiden tilbake" (Rewind) til det tidspunktet klienten avfyrte slaget, basert på klientens latens (Ping) og synkroniserte klokke, for å sjekke om treffet var gyldig. Validering er kritisk for å hindre "Ghost hits" eller juks.

3. **Klokkesynkronisering (NTP over WebRTC)**
    - **Synchronized Time**: Deler alle Peers en felles referansetid? WebRTC overføringer krever at vi synkroniserer klokkene (Host Clock = Master). Dette krever round-trip-time (RTT) beregninger ved tilkobling og periodiske "heartbeats" for å holde synkroniseringen stabil (drift correction). Uten dette vil interpolering og lag-kompensasjon alltid være upresist.

4. **Nettverkspayload & Delta Compression (Bandwidth Starvation)**
    - **Delta Encoding**: Sender hosten *hele* game state for alle fiender hver tick, eller bare *endringer* (Deltas) siden sist bekreftede pakke? Krev overgang fra full-state overføringer til deltas for å maksimere båndbredde, spesielt for WebRTC.
    - **Prop-packing**: Brukes overdimensjonerte JSON-objekter med lange nøkler (f.eks. `{ id: 'orc1', positionX: 120, positionY: 50, health: 100 }`)? Bytt til Arrays eller binære strukturer (`['orc1',120,50,100]`) for å drastisk redusere serialization/deserialization CPU cost og båndbredde.

5. **Entity Authority & Desync Recovery (The State Manager)**
    - **Dead Reckoning overstyring**: Du har "Dead Reckoning" (som nettopp er implementert), men hva skjer når en entity kolliderer med en vegg hos klienten mens den fortsetter hos hosten? Krev strenge "Snap to state"-overstyringer hvis avviket mellom "Predicted State" og "Host State" blir kritisk stort.

6. **Karantene & Pre-Mortem (The Edge Case Tests)**
    - **Asymmetrisk Latency & Packet Loss**: Test med 300ms ping NED, men 20ms ping OPP, samt 5% packet loss tvingt gjennom Chrome DevTools.
    - **The Tab-Sleep Bug**: La klienten ligge i bakgrunnen i 30 sekunder. Utfør en desync-analyse av hva som skjer når fanen vekkes (kommer klienten à jour, eller krasjer nettverkskøen?).

## Rapport-konstruksjon (Code of Action)
Generer revisjonsrapporten med:
- **Arkitektoniske Mangler**: E.g. "Mangler Jitter Buffer, entities hopper ved packet loss".
- **Payload-kostnader**: Analyse av bytes per sekund.
- **Konkrete Refaktoreringer**: Linjer kode som må skrives om (f.eks. NetworkManager.ts pakke-struktur, main.ts interpolasjonssystem).

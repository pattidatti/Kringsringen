---
name: multiplayer-audit
description: Use when the user wants to review, debug, or improve multiplayer networking,
             desync bugs, packet loss, or WebRTC/PeerJS architecture. Triggers on:
             "multiplayer", "desync", "network", "nettverksproblemer", "PeerJS", "WebRTC",
             "ping", "lag compensation", "host", "client sync", "pakketap". Performs deep
             review of clock sync, jitter buffers, delta compression, and entity authority.
---

# Multiplayer Audit v2.0 (The "Ultrathink" Engine)

Deep revision of multiplayer architecture for a competitive action game. Goes beyond basic desync detection — covers real-time clock sync, jitter buffers, lag compensation, and bit-optimization for WebRTC.

## Steg 1: Jitter Buffers & Frame Pacing (Smoothness Control)

- **Buffer-dybde:** Når klienten mottar posisjonsoppdateringer via den upålitelige kanalen (UDP/WebRTC), legges de rett i state, eller finnes det en *Jitter Buffer*? Krev at innkommende pakker bufres i ~50-100ms for å jevne ut nettverksshikes før de interpoleres.
- **Tick-Alignment:** Opererer spillets logic-ticks på en isolert loop (f.eks. 20Hz), separert fra renderingen (60Hz/144Hz)? LXR (Lerp) over render-frames basert på logic-ticks.

## Steg 2: Lagkompensasjon & Hit Registration (The Shooter Standard)

- **Host Rewind:** Hvem bestemmer "treff"? Når en klient treffer en fiende, sender de en "treff"-hendelse? Hosten må kunne "spole tiden tilbake" (Rewind) til det tidspunktet klienten avfyrte, basert på klientens latens og synkroniserte klokke, for å sjekke om treffet var gyldig. Validering er kritisk for å hindre "Ghost hits" eller juks.

## Steg 3: Klokkesynkronisering (NTP over WebRTC)

- **Synchronized Time:** Deler alle Peers en felles referansetid? WebRTC-overføringer krever at vi synkroniserer klokkene (Host Clock = Master). Dette krever round-trip-time (RTT) beregninger ved tilkobling og periodiske "heartbeats" for drift correction. Uten dette vil interpolering og lag-kompensasjon alltid være upresist.

## Steg 4: Nettverkspayload & Delta Compression (Bandwidth)

- **Delta Encoding:** Sender hosten *hele* game state for alle fiender hver tick, eller bare *endringer* (Deltas) siden sist bekreftede pakke? Krev overgang fra full-state til deltas for å maksimere båndbredde.
- **Prop-packing:** Brukes overdimensjonerte JSON-objekter med lange nøkler? Bytt til Arrays eller binære strukturer (`['orc1',120,50,100]`) for å drastisk redusere serialization CPU cost og båndbredde.

## Steg 5: Entity Authority & Desync Recovery

- **Dead Reckoning overstyring:** Hva skjer når en entity kolliderer med en vegg hos klienten mens den fortsetter hos hosten? Krev strenge "Snap to state"-overstyringer hvis avviket mellom "Predicted State" og "Host State" blir kritisk stort.

## Steg 6: Karantene & Pre-Mortem (Edge Case Tests)

- **Asymmetrisk Latency & Packet Loss:** Test med 300ms ping NED, men 20ms ping OPP, samt 5% packet loss gjennom Chrome DevTools.
- **The Tab-Sleep Bug:** La klienten ligge i bakgrunnen i 30 sekunder. Utfør en desync-analyse av hva som skjer når fanen vekkes.

## Rapport-konstruksjon (Code of Action)

- **Arkitektoniske Mangler:** E.g. "Mangler Jitter Buffer, entities hopper ved packet loss"
- **Payload-kostnader:** Analyse av bytes per sekund
- **Konkrete Refaktoreringer:** Linjer kode som må skrives om

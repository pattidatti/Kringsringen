# PvP & Edge Case Testplan - Kringsringen

## Kontekst

Utviklingen har gatt fort - PvP (1v1 og 2v2) er implementert med full roundsystem, matchmaking, og shop mellom runder. Men mye er utestet. Singleplayer level 5+ er ikke testet pa lenge. Multiplayer co-op har kjente ufikste bugs. Denne planen kartlegger ALT som bor testes, prioritert etter risiko.

---

## KJENTE UFIKSTE BUGS (fra Todo.md)

Disse er allerede loggede og bor fikses forst:

### PvP-spesifikke (11. mars)
1. **Spells/piler gar gjennom motspiller** - physics sync issue i `CollisionManager.ts:setupPvpColliders()`
2. **Fireball impact-animasjon vises ikke pa motspiller** - manglende visuell feedback
3. **En spiller ser ikke damage-reaksjon** - trolig client HP sync lag i `NetworkPacketHandler.ts:handleDamagePlayer()`

### Singleplayer
4. **Restart-knapp etter dod fungerer ikke** - rod skjerm, fryst spiller
5. **Whirlwind treffer ikke Orkhovding** - hitbox-problem

### Multiplayer Co-op
6. **Spillere ser ikke damage-animasjon pa andre spillere** - `NetworkPacketHandler.ts`
7. **Ufullstendig MP-entry i Todo** (`- [ ] MP:`) - noe glemt?

### Bosser
8. **Orkeboss blir stuck for mye** - pathing
9. **Orkhovdings dash for kort, stuck etter dash**
10. **Alle bosser blir lett stuck** - FlowField Ejection ble implementert men merket ufikst
11. **Bosser dropper for lite gull**
12. **Trollmester Grak mangler knockback resist**
13. **Skjelettkongen (L10) angriper aldri, for enkel**

### Grafikk/Annet
14. **Lav grafikkinnstilling: spillerkarakter usynlig**
15. **Medium: HP-barer henger igjen i lufta**
16. **Regn dekker ikke hele skjermen**
17. **Kollisjonssjekk pa alle map-objekter**
18. **Opprydding av ubrukte assets/filer**
19. **Healing mangler lydeffekt**

---

## PVP EDGE CASES A TESTE

### A. Skade & Hitdeteksjon (KRITISK)
Filer: `CollisionManager.ts`, `NetworkPacketHandler.ts`, `PlayerCombatManager.ts`

- [ ] **Melee (sverd) treffer motspiller** - host-side OG client-side
- [ ] **Arrow treffer motspiller** - begge retninger
- [ ] **Fireball treffer + splash damage pa motspiller**
- [ ] **Frostbolt treffer + slow-effekt pa motspiller**
- [ ] **Lightning bolt treffer motspiller**
- [ ] **Singularity drar motspiller** - fungerer pull?
- [ ] **EclipseWake treffer motspiller**
- [ ] **Whirlwind (Krieger) treffer motspiller**
- [ ] **Krieger block mot PvP-skade** - 80% reduksjon
- [ ] **Wizard Mana Shield mot PvP-skade** - 30% absorb
- [ ] **Armor-reduksjon i PvP** - fungerer korrekt?
- [ ] **Knockback fra PvP-treff** - retning og styrke
- [ ] **Invincibility frames etter treff** - forhindrer spam-damage
- [ ] **Rate limiting (250ms mellom treff)** - virker det?

### B. Klasse-spesifikke Abilities i PvP
- [ ] **Krieger Whirlwind** - treffer motspiller, visuelt korrekt
- [ ] **Krieger Jernmur (block)** - blokkerer PvP-skade
- [ ] **Archer Pindown** - pinner motspiller? Bor det fungere?
- [ ] **Archer Explosive Arrow** - splash pa motspiller
- [ ] **Wizard Cascade** - treffer motspiller
- [ ] **Wizard alle spells** - fire/frost/lightning mot spiller
- [ ] **Skald Vers-system** - buffs i PvP, gir det fordeler?
- [ ] **Skald abilities** - treffer motspiller?
- [ ] **Dash gjennom motspiller** - tar man skade? Kolliderer man?

### C. Runde-logikk (PvpRoundManager.ts)
- [ ] **Countdown synkronisering** - starter begge samtidig (NTP)?
- [ ] **120s timer utlop** - HP-sammenligning fungerer?
- [ ] **Timeout uavgjort** - hva skjer ved eksakt lik HP%?
- [ ] **Dod melder riktig** - host oppdager client-dod via pakke
- [ ] **Client self-report death** - `pvp_death_report` pakke
- [ ] **Score oppdateres korrekt** - [2, 1] osv
- [ ] **Best-of-3/5/7/10** - match avslutter pa riktig tidspunkt
- [ ] **Gull-belonning** - 200 for vinner, 500 for taper (per runde)
- [ ] **Mellom runder: shop tilgjengelig** - kan kjope upgrades
- [ ] **Upgrades applied neste runde** - stats oppdatert
- [ ] **HP reset mellom runder** - full HP med nye stats
- [ ] **Posisjon reset** - tilbake til spawn points
- [ ] **Rematch** - coins/upgrades nullstilles, synkronisert
- [ ] **Kan man apne boken under kamp?** - bor vaere blokkert
- [ ] **Kan man angripe under countdown?** - InputManager blokkering

### D. 2v2-spesifikke Edge Cases (Pvp2v2RoundManager.ts)
- [ ] **Friendly fire IKKE mulig** - team-sjekk i CollisionManager
- [ ] **Host-side team-validering** - dobbeltsjekk pa server
- [ ] **Team-tildeling korrekt** - A1/A2 vs B1/B2
- [ ] **Spawn-posisjoner** - team A venstre, team B hoyre
- [ ] **En spiller dor pa et lag** - kampen fortsetter?
- [ ] **Begge pa et lag dor** - runden avsluttes?
- [ ] **Timeout HP-sum** - teamAHpSum vs teamBHpSum
- [ ] **Team damage tracking** - vises i summary?
- [ ] **3 spillere (1 DC)** - kan kampen fortsette 2v1?
- [ ] **Teammate HUD** - viser riktig HP/status

### E. Nettverks-edge Cases
- [ ] **Host disconnect** - 10s grace period, deretter auto-forfeit
- [ ] **Client disconnect** - host merker, grace period
- [ ] **Reconnect innen 10s** - kampen gjenopptas?
- [ ] **Lag spike under kamp** - hva skjer med hits?
- [ ] **Dobbel-hit ved lag** - rate limiting holder?
- [ ] **Desync mellom HP-verdier** - host vs client
- [ ] **Packet loss** - unreliable channel for posisjon, reliable for hits

### F. PvP + Upgrades Interaksjon
- [ ] **Asymmetriske upgrades** - en spiller har mange, andre ingen
- [ ] **Max cooldown-reduksjon** - kan man fa 0ms cooldown?
- [ ] **Armor + Skadeskalering i PvP** - dobbeldipping?
- [ ] **Blood Blade (Krieger)** - 3x damage ved <30% HP, OP i PvP?
- [ ] **Healing upgrades i PvP** - kan man uthele motstanderens skade?
- [ ] **Paragon abilities i PvP** - balansert?

### G. PvP Arena (pvp-arena.ts)
- [ ] **Kan spillere ga utenfor arena?** - trevegg holder?
- [ ] **Cover-steiner blokkerer prosjektiler?**
- [ ] **Symmetri** - ingen fordel for host/client spawn
- [ ] **Singularity + vegger** - drar gjennom vegger?

---

## SINGLEPLAYER LEVEL 5+ TESTING

### Per-level sjekkliste (L5-L10)
For hvert level, test:
- [ ] Wave spawning korrekt (antall, typer, ranged cap)
- [ ] Enemies ikke stuck i terrenget
- [ ] Level completion trigger riktig
- [ ] Boss spawn etter level (L2,4,6,8,10)
- [ ] Boss fase 2 aktiveres
- [ ] Boss abilities fungerer
- [ ] Musikk bytter
- [ ] Ambient partikler (L5+ har bare stubs)
- [ ] Shrines spawner (40% sjanse L5+)
- [ ] Shrine effekter fungerer

### Boss-spesifikke tester
| Boss | Level | Test |
|------|-------|------|
| Orkhovdingen | L2 | Hitbox, stuck, dash, knockback |
| Skjelettoverlorden | L4 | Phase 2 bone projectiles (5 vs 3) |
| Alfa-Varulven | L6 | Blood Frenzy speed scaling, phase 2 |
| Trollhersker Grak | L8 | Knockback resist, minion spawns |
| Skjelettkongen | L10 | ANGRIPER IKKE - kritisk bug, phase 2 darkness |

### Paragon-skalering (hoyere tiers)
- [ ] Enemy HP/damage/speed skalerer korrekt
- [ ] Boss HP ved Paragon 5+ (potensielt 1M+ HP)
- [ ] Coin-skalering kompenserer
- [ ] Spillet krasjer ikke ved ekstremt hoye tall

---

## MULTIPLAYER CO-OP TESTING

- [ ] 2-4 spillere kan joine og starte
- [ ] Enemy-count skalering (+25% per ekstra spiller)
- [ ] Ghost-modus ved dod (spectating, kan plukke gull)
- [ ] Gjenoppliving via bok fungerer
- [ ] Boss synlig for alle spillere
- [ ] HP-barer korrekte for alle
- [ ] Retry/restart etter party wipe
- [ ] Shrine-effekter synkronisert (KJENT MANGLENDE - shrines spawner kun pa host!)
- [ ] Save fungerer i multiplayer

---

## SYSTEMER SOM KAN KRASJE/BREAKE

| System | Risiko | Beskrivelse |
|--------|--------|-------------|
| Cooldown floor | HOY | Ingen nedre grense - kan bli 0ms ved mange upgrades |
| Level >10 | HOY | Bruker L10 config stille, kan feile |
| Shrine + MP | HOY | Shrine-mods synkroniseres IKKE til clients |
| Boss stuck | MEDIUM | FlowField Ejection implementert men utilstrekkelig |
| Armor dobbeldipping | MEDIUM | Oker skade OG reduserer innkommende |
| Save corruption | LAV | Rehabilitering implementert, men edge cases |

---

## ANBEFALT TESTREKKEFOLGE

### Fase 1: Kritiske PvP-bugs (forst)
1. Fiks spells/piler som gar gjennom motspiller
2. Fiks damage-reaksjon/animasjon synkronisering
3. Test alle vapentyper i PvP
4. Test runde-logikk end-to-end

### Fase 2: PvP Edge Cases
5. Test klasse-abilities i PvP
6. Test upgrade-interaksjoner i PvP
7. Test disconnect/reconnect
8. Test 2v2 grundig

### Fase 3: Singleplayer Regressions
9. Fiks restart-knapp etter dod
10. Test level 5-10 sekvensielt
11. Test alle bosser (spesielt Skjelettkongen)
12. Test Paragon-skalering

### Fase 4: Multiplayer Co-op
13. Test grunnleggende co-op flow
14. Test shrine-synkronisering (eller disable shrines i MP)
15. Test boss-kamper i co-op

### Fase 5: Polish
16. Grafikk-innstillinger (lav/medium)
17. Lydeffekter
18. Asset-opprydding

---

## VIKTIGE FILER

| Fil | Relevans |
|-----|----------|
| `src/game/CollisionManager.ts` | PvP hitdeteksjon |
| `src/game/PvpRoundManager.ts` | 1v1 rundelogikk |
| `src/game/Pvp2v2RoundManager.ts` | 2v2 rundelogikk |
| `src/network/NetworkPacketHandler.ts` | Nettverkshendelser |
| `src/game/PlayerCombatManager.ts` | Skadeberegning |
| `src/game/PlayerStatsManager.ts` | Stat-derivasjon |
| `src/game/BossEnemy.ts` | Boss AI og faser |
| `src/game/ShrineManager.ts` | Shrine-system |
| `src/game/WaveManager.ts` | Wave-spawning |
| `src/config/bosses.ts` | Boss-definisjoner |
| `src/config/levels.ts` | Level-config |

---

## VERIFISERING

Siden det ikke er test suite, ma alt verifiseres manuelt:
1. **PvP**: Start 1v1 match (to nettleserfaner), test alle vapen, runder, disconnect
2. **2v2**: Fire faner, test team-logikk, friendly fire
3. **Singleplayer**: Spill gjennom L1-L10 med ulike klasser
4. **Co-op**: To faner, spill gjennom noen levels
5. **Paragon**: Test med hoye paragon-levels
6. **Dev shortcuts**: Bruk registry-manipulering for a hoppe til hoye levels raskt

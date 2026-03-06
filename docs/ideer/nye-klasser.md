# Brainstorm: 2 Nye Klasser for Kringsringen

## Kontekst

Spillet har allerede tre klasser: **Krieger**, **Archer**, **Wizard** — alle med unike base-stats, class abilities (hotkey 2-4), egne shop-kategorier og 15-31 eksklusive oppgraderinger. Ny klasse følger samme arkitektur: `classes.ts` + `class-upgrades.ts` + manager-logikk.

---

## KLASSE 1: DYREMANER (Pet-fokus)

**Tagline:** "Flokk · Lojalitet · Overlevelse"
**Farge:** #e67e22 (oransje/amber)

### Base-stats

| Stat | Multiplier | Begrunnelse |
|------|-----------|-------------|
| HP | 0.85x | Sårbar alene |
| Damage (personlig) | 0.70x | Stole på pets |
| Speed | 1.10x | Trenger mobilitet |
| Pet Slots (start) | 2 | Kjernen av klassen |
| Attack Speed | 1.0x | Nøytral |

### Primærangrep (Hotkey 1)

| Alternativ | Navn | Mekanikk |
|-----------|------|----------|
| **A ★** | **Byttedyrmerke** | Kast en ånd-spyd som *merker* fienden i 5s. Alle pets fokuserer markert mål og dealer +40% skade mot det. |
| B | **Rovdyrhvil** | Kort-range "hyl" AOE rundt spiller. Alle pets innen radius ruser og angriper alt i cone. Cooldown-burst. |
| C | **Åndebit** | Sender ut en ånd-ulv-prosjektil som biter fienden + teleporterer nærmeste ekte pet til målet instant. |
| D | **Blodtørst-stav** | Melee-stav-slag med lifesteal (50%) + pets innen radius tar 1 gratis angrep. |
| E | **Besverger-boltring** | Runestein som spretter mellom 2-3 fiender (som lightning) og merker alle trufne — pets prioriterer markerte i 4s. |

**Anbefaling:** **Byttedyrmerke (A)** — tydelig gameplay-loop: merk mål → pets slakter det.

### Startpets

- **Ulv** — rask meleeangriper, jakter mål
- **Ravn** — ranged, flyr over hindringer, slipper bomber
- **Bjørn** — tank, lav hastighet, høy HP, beskytter spiller

### Class Abilities

| Hotkey | Navn | Effekt |
|--------|------|--------|
| 2 | **Kall til Kamp** | Alle pets ruser mot nærmeste fiende, +50% skade i 3s |
| 3 | **Beskytt Herre** | Pets danner ring rundt spiller, blokkerer prosjektiler i 4s |
| 4 | **Ofring** | Ofre én pet → heler spiller for 40% maks HP + gjenværende pets +30% skade i 8s |

### UI

Nytt `PetStatusBar`-komponent (ligner `DashCooldownBar.tsx`): viser pet-ikon + HP-bar per aktiv pet over Hotbar. Pet-typer kjøpes i shopet ("Kall Ulven" osv.) og spawner automatisk — ingen nye hotkeys.

---

### Oppgraderingskategorier

#### FLOKKEN (kjerne)

1. **Ekstra Pet Slot** — +1 pet per level, maks 4 nivåer → maks 6 pets totalt
2. **Rovdyr-skade** — +15% pet-skade/lvl, maks 10
3. **Dyrenes Livskraft** — +25% pet maks-HP/lvl, maks 8
4. **Ulvehastighet** — +15% pet hastighet/lvl, maks 5
5. **Blodssuge** — pets stjeler X HP per treff til spiller, maks 5
6. **Rask Gjenfødelse** — reduser respawn-tid (10s → 5s → 3s), maks 3
7. **Flokkinstinkt** — hver ekstra pet gir alle +5% skade, maks 3

#### ULVEPAKKEN

1. **Blodfrenzy** — ulv får +10% angrephastighet per kill (stacker 5s), maks 3
2. **Ulfhednar** — ulv dealer bonus skade lik 5% av tapte HP, maks 3
3. **Blodspor** — ulv påfører bleeding (X skade/s i 3s), maks 3
4. **Alfa-ulv** — én ulv promoteres: 2x størrelse, 2x HP, 1.5x skade, maks 1

#### RAVNEMAGI

1. **Bombedropp** — ravn slipper eksplosive bomber hvert Xs, maks 3
2. **Stormflokk** — ravn kaller 2 ekstra midlertidige ravner i 8s, maks 2
3. **Lyn-nebb** — ravnens angrep hopper til 1→2→3 naboffiender, maks 3

#### BJØRNENS KRAFT

1. **Bjørnekram** — bjørn stunner fiende i 1.5s hvert 8s, maks 3
2. **Livgivende Pels** — bjørn redirecter 15% av spillerens innkommende skade til seg selv, maks 3
3. **Vill Rase** — bjørn går berserk under 30% HP: +50% skade, -20% mottatt skade, maks 1

#### BESVERGERKUNST (class-ability upgrades)

1. **Blodsband** — når pet dør gir spilleren +20% skade i 5s, maks 3
2. **Sjelelink** — 25% av spillerens innkommende skade fordeles likt mellom pets, maks 2
3. **Nekromantisk Gnist** — drepte fiender har X% sjanse til å bli midlertidig pet (20s), maks 3
4. **Evig Lojalitet** — drepte pets gjenoppstår automatisk til 50% HP etter 8s, maks 1
5. **Rovdyr-instinkt** — pets dealer +25% bonus skade mot fiender under 30% HP, maks 3
6. **Herrekommando** — forbedrer "Kall til Kamp": alle pets fokuserer på ett mål + 2x skade i 5s, maks 3

#### LEGENDARISKE

1. **Drageånd** — bytt ut 2 pet-slots mot en minidrake (3x HP, 2x skade, kan fly), maks 1
2. **Udødelig Flokk** — pets kan ikke dø, men maks 40% av normal HP (prereq: Evig Lojalitet), maks 1
3. **Herre av Beist** — ha alle 3 pet-typer aktive → +30% pet-skade + spiller +10% alle stats, maks 1

---

## KLASSE 2: RUNESMEDEN

**Tagline:** "Imprints · Detonasjon · Kontroll"
**Farge:** #2980b9 (mørk blå/stål)

### Kjerneloop

Angrepene dine etterlater automatisk **rune-imprints** på bakken. Fiender som tråkker på dem utløser effekten. Du kiter i sirkel → imprints bygger seg opp bak deg → Runedetonasjon som nødknapp. Ingen aktiv plassering, ingen pre-wave setup.

### Base-stats

| Stat | Multiplier |
|------|-----------|
| HP | 0.90x |
| Rune-skade | 1.30x |
| Personlig skade | 0.80x |
| Speed | 0.95x |

### Hotbar

| Hotkey | Navn | Imprint |
|--------|------|---------|
| 1 | **Runehammer** (melee) | Ildrune-imprint der fienden ble truffet |
| 2 | **Isemne** (kast frost-sten) | Frostrune-imprint der den lander |
| 3 | **Lynlanse** (piercende bolt) | Lynrune-imprint langs hele banen |
| 4 | **Runedetonasjon** | Klasse-ability: detonier ALLE aktive imprints simultant |

### Imprint-mekanikk

- Imprints varer 4–6s, maks 5 aktive (eldre forsvinner)
- Aktiveres når fiende tråkker på dem
- **Combo:** Frostrune → Lynrune på frossen fiende = x2 skade ("Statisk Frost")

### UI

Liten imprint-teller ved Hotbar: "3/5 imprints aktive". Ingen nye hotkeys — identisk struktur som Wizard.

---

### Oppgraderingskategorier

#### RUNEPOTENS (kjerne)

1. **Ekstra Runeslot** — +1 aktiv imprint, maks 4 (→ 9 totalt)
2. **Runeskade** — +15% all rune-skade/lvl, maks 10
3. **Rask Inngravering** — -20% angrep-cooldown/lvl, maks 5
4. **Utholdenhet** — imprints aktive +50% lengre, maks 5
5. **Kjede-tenning** — imprints innen 200px aktiveres simultant, maks 1

#### ILDRUNE-MESTRING

1. **Brannstorm** — ildrune brenner i 8s istedet for 4s, maks 3
2. **Napalm** — ildrune etterlater brann-bakke i 5s etter utløsning, maks 2
3. **Eksplosiv Kraft** — ildrune AOE-radius +40px/lvl, maks 3
4. **Smeltende Rustning** — fiender i ildrune mister 2 armor/lvl, maks 3

#### FROSTRUNE-MESTRING

1. **Dypfrys** — frysvarighet +1s/lvl, maks 4
2. **Isknusing** — frosne fiender under 25% HP dør instant ved neste rune-treff, maks 1
3. **Kaskade-is** — frostrune spawner 2 mini-frostrings utover, maks 2

#### LYNRUNE-MESTRING

1. **Overladning** — lynrune hopper til +2 ekstra mål/lvl, maks 3
2. **EMP-støt** — lynrune disabler ranged-fienders prosjektiler i 3s, maks 1
3. **Tordenstav** — lynrune stunner trufne fiender i 1.5s, maks 2

#### RUNEKUNST (class-ability upgrades)

1. **Massiv Detonasjon** — Runedetonasjon +30% radius/lvl, maks 3
2. **Rune-resonans** — 2+ runer av samme type utløses innen 1s → +50% samlet skade, maks 3
3. **Dobbel Imprint** — hvert angrep etterlater 2 imprints, maks 1
4. **Runestempel** — Runehammer etterlater imprint på bakken (ikke bare på fienden), maks 1

#### LEGENDARISKE

1. **Megaglef** — Grand Rune (tar 2 slots) kombinerer Ild+Frost+Lyn i én, maks 1
2. **Runeskjold** — aktive imprints absorberer 1 prosjektil-treff til spilleren per rune, maks 1
3. **Runearkiv** — ha 3+ forskjellige rune-typer aktive → global +25% rune-skade, maks 1

---

## Hotkey-kompleksitet: sammenligning

| Klasse | Hotkeys | Ekstra UI |
|--------|---------|-----------|
| Krieger | 1 weapon + 3 abilities | — |
| Archer | 1 weapon + 3 abilities | — |
| Wizard | 3 weapons + 1 ability | — |
| **Dyremaner** | **1 attack + 3 abilities** | **PetStatusBar** |
| **Runesmeden** | **3 attacks + 1 ability** | **Imprint-teller** |

---

## Andre klasseideer (for fremtiden)

### SKALD
"Sang · Mot · Styrke" — Bygger Kvad-meter via kills, utløser sang-bursts. Buff-aura til lagkamerater i multiplayer.

### SKYGGELØPER
"Stealth · Presisjon · Utflukt" — Stealth-meter (10s aktiv). Første angrep fra stealth = 3x crit. Høy risiko/belønning.

# Brainstorm: Dype Systemer – Fiende, Klasse, Økonomi, Lyd & Endgame

*Kringsringen – Mars 2026*
*Komplement til `gameplay-juice-retention-brainstorm.md`*

---

## Kontekst

Spillet er et modent roguelike med 4 klasser, 13 fiende-typer, 5 bosser, 10 levels og 60+ upgrades. Forrige brainstorm dekket Gameplay, Juice og Retention. Denne runden ser på **fem nye fokusområder** som berører systemdybde, atmosfære og langtidsretensjon.

**Fokusområder:**
1. Fiende & Boss Design
2. Klasseidentitet & Build-stier
3. Økonomi, Risiko & Beslutning
4. Lyd & Narrativ Atmosfære
5. Endgame & Prestige-løkker

---

## 1. Fiende & Boss Design

### Enkle (timer – dager)

**1.1 Fiende-formasjoner**
Spesielle wave-komposisjoner der fiender spawner i geometrisk mønster: sirkelbeleiring (fiender spawner rundt spilleren i ring), kile-angrep (V-formasjon som konvergerer), eller bakbakhold (halvparten fra hver side simultant). Implementeres via `WaveManager` og `wave_compositions.ts` – legg til en valgfri `formation`-egenskap per wave.

**1.2 Elite-varianter med aura-effekt**
10 % sjanse for at en vanlig fiende spawner som "Elite" – visuelt markert med pulserende aura (tint + partikkel-emitter), 2× HP, 1.5× skade, og dropper garantert en coin. Auraen kommuniserer trusselnivå umiddelbart uten UI-tekst. Legges til i `Enemy.ts` med en `isElite`-flagg.

**1.3 Boss "tells" – animert advarsel**
Før hvert boss-angrep vises en tydelig "tell": rød aura-pulse, skjerm-flash, eller en animert pil som peker mot angrepsretning. Gir spilleren 0.5–1 sek å reagere. Gjør bossfights mer lesbare og mindre punishing. Implementeres i `BossEnemy.ts` med en `playTell(durationMs)`-metode kalt rett før skadelogikk.

**1.4 Unik dødslyd/-animasjon per fiende-type**
Skeleton: knoklene faller fra hverandre. Mage: imploderer med en liten magisk burst. Gjøres via `ObjectPoolManager` med én custom death-sprite-sekvens per fiende-type. Registreres i `enemies.ts`.

---

### Middels (1–2 uker)

**1.5 Fiende-synergier**
Visse fiende-kombinasjoner aktiverer spesial-atferd. Eksempel: hvis en Healer Wizard er i live, regenererer nærliggende Skeleton Archers 2 HP/sek. Eller: Bombetroll (se 1.6) løper 50 % raskere hvis en Drummer-trommis-fiende er nærme. Krever en `EnemyBehaviorSystem` som scaner aktive fiender hvert sekund og setter gruppe-flags.

**1.6 Ny fiende: Bombetroll**
Kamikaze-mekanikk: Bombetrollen har lavt HP, høy fart, og eksploderer når den er innen 1 tile av spilleren – eller ved død. Eksplosjonen gjør AoE-skade og knockback. Krever ny sprite, ny fiende-definisjon i `enemies.ts`, og en `onDeath` / `onProximity`-hook i `Enemy.ts`. Spillet trenger en klar visuell (gnist-partikler som sier "LØP").

**1.7 Boss fase-overgang med arena-endring**
Ved 50 % HP endrer boss-arenaen seg: ny bakgrunn-tint, nye obstacles spawner (trær faller ned, steiner velter opp), og boss-musikken bytter til fase 2-variant. Teknisk: `BossEnemy.ts` emitter en event `boss-phase-change` som `MainScene` lytter på og oppdaterer tilemap/musikk.

---

### Ambisiøse (måneder)

**1.8 Dynamisk boss-dialog**
Bossen sier noe kontekstuelt før og under kampen – basert på hvilken klasse du spiller, ditt HP-nivå, og om du har drept denne bossen før. Displayes som et flytende tekstbobleelement i React over canvas. Tekstlinjer defineres i en `boss_dialogue.ts`-konfig. Norsk tekst.

**1.9 Adaptive boss-AI basert på spillerens build**
Bossen "leser" din høyeste upgrade-kategori og justerer: mot en høy-DPS Archer bytter den til høyere mobilitet og skjold-faser. Mot en tanky Krieger bruker den mer AoE. Krever at `BossEnemy` henter `upgradeLevels` fra registeret og setter en `playerArchetype`-enum.

---

## 2. Klasseidentitet & Build-stier

### Enkle (timer – dager)

**2.1 Klasse-spesifikke passive milepæl-bonuser**
Når en klasse hever et bestemt upgrade til nivå 5+, låser det opp en passiv bonus som er tematisk knyttet til klassen. Eksempel: Krieger med "Sword Mastery" lvl 5 → +5 Armor permanent. Skald med "Battle Hymn" lvl 5 → aura-radius +20 %. Implementeres i `PlayerStatsManager` med en `checkMilestonePassives()`-funksjon.

**2.2 Visuell signatur-evne polish**
Skaldens aura pulserer og endrer farge basert på aktiv buff. Wizardstens elementaura (is/ild/lyn) reflekterer valgt weapon-element med matchende partikkelfarger. Rene visuelle endringer i eksisterende partikkel-emitters – ingen logikkendringer.

**2.3 Klasse-spesifikke oppstartsbonuser**
Hver klasse starter med en liten unik ressurs: Krieger: +1 armor, Archer: +1 pil i quiver (eller bonus projectile), Skald: starter med 50 % aura aktiv, Wizard: starter med én gratis elementbytte-rett. Legges til i `PlayerStatsManager.initializeClassStats()`.

---

### Middels (1–2 uker)

**2.4 Branching upgrade-tre**
I stedet for ett lineært upgrade-tre per klasse, tilbys et veikryss ved nivå 3 av nøkkel-upgrades: Krieger kan velge "Berserker"-sti (skade↑, armor↓) eller "Defender"-sti (armor↑, langsommere angrep). Valget er permanent per run og vises i `FantasyBook.tsx`. Krever redesign av `upgrades.ts` med `branches`-felt og ny logikk i `FantasyBook`.

**2.5 Cross-class Prestige Tag**
Etter Paragon 10 med en klasse kan spilleren låse opp én passiv fra en annen klasse som en "tag". Eksempel: Krieger med Archer-tag → +10 % dodge chance. Displayes som et lite ikon ved siden av klasse-ikonet. Krever Paragon-system (se seksjon 5) og en `prestigeTag`-egenskap i spillerdata.

**2.6 Klasse-spesifikke shop-items**
Butikken tilbyr noen klasse-eksklusive upgrades som aldri vises for andre klasser. Krieger-eksklusivt: "War Banner" (AoE-buff). Wizard-eksklusivt: "Mana Siphon" (regenererer mana fra fiende-død). Implementeres med et valgfritt `classRestriction`-felt i `upgrades.ts`.

---

### Ambisiøse (måneder)

**2.7 Class-spesifikke kart-varianter**
Krieger starter i slottsgård (steinete, trange ganger), Archer starter i skogsrydning (åpen, mange trær), Skald starter i landsby (NPC-bygninger i bakgrunnen), Wizard starter i ruiner (magiske portaler som obstacles). Krever fire nye kart-definisjoner i `StaticMapData.ts` og oppdatert `StaticMapLoader` som ser på valgt klasse.

**2.8 Klasse-narrative arc**
Hvert level vises én setning narrativ tekst spesifikk til klassen – som om klassen har sin egen reise gjennom verdenen. Wizard-tekst handler om uråld magi. Krieger-tekst handler om krig og tap. Norsk prosa. Lagres i `class_narrative.ts`.

---

## 3. Økonomi, Risiko & Beslutning

### Enkle (timer – dager)

**3.1 Gambling-shrine**
Et tilfeldig plassert objekt på kartet (sjeldent, én per run maks). Interagerer ved å betale 50 coins. Gir tilfeldig upgrade – kan være ekstremt bra eller komplett ubrukelig. "Huset vinner" i snitt, men risikoen er underholdende. Implementeres som en Phaser-staticGroup med en enkel overlay-prompt i React.

**3.2 Essens-valuta**
Sjeldne fiender dropper "Essens" – en sekundærvaluta som ikke brukes i vanlig shop, men i et separat "Svartemarked" (én gang per run). Svartemarkedet tilbyr 2–3 kraftige sene-game-items. Krever ny HUD-komponent for Essens-teller og en ny `BlackMarketOverlay`-komponent.

**3.3 Merchant Event**
En gang i løpet av hvert 3. level dukker en vandringskjøpmann opp midt i en wave (fiender pauser i 10 sek). Han tilbyr 1–2 sjeldne items til høy pris. Tidspresset og det midlertidige tilbudet skaper beslutningsstress. Trigges via `WaveManager` og displayes som en React-overlay.

---

### Middels (1–2 uker)

**3.4 Debt/Loan-system**
Du kan velge å "låne" en upgrade nå og betale tilbake dobbelt etter neste boss. Hvis du dør med gjeld, mister du Paragon-XP. Risikabelt, men kan snu tapet av en hard wave. Krever en `debt`-egenskap i spillerstate og en "Betal tilbake"-prompt etter boss-sekvens.

**3.5 Auction House Wave**
En spesiell non-combat wave (erstatter én wave i level 6+) der tre sjeldne items auksjoneres. Du "byr" med coins – AI-fiender byr mot deg (simulert). Høyeste bud vinner. Gir den riktige spilleren stor fordel, men kan bomme totalt. Krever en `AuctionWaveOverlay`-komponent og budsimulering.

**3.6 Risk/Reward-portaler**
To utganger fra hvert level: den ene er trygg og gir standard shop. Den andre er "farlig vei" – neste level starter med dobbelt antall fiender, men en garantert sjeldent item i starten. Valget vises visuelt som to portaler på kartet.

---

### Ambisiøse (måneder)

**3.7 Dynamisk shop-pricing**
Butikken analyserer dine eksisterende upgrades og priser synergistiske items høyere (de er mer verdifulle for deg). Eksempel: du har høy Attack Speed → Multishot koster 20 % mer fordi det er åpenbart bra for din build. Hindrer optimal-path farming og tvinger tøffere avveininger. Krever en `pricingEngine()` i `FantasyBook.tsx`.

**3.8 Forsikrings-system**
Betal 30 coins for å "forsikre" et item. Hvis du dør, beholder du det forsikrede itemet i neste run (ett item maks). Gir et psykologisk ankerpunkt og reduserer frustrasjonen av sudden death.

---

## 4. Lyd & Narrativ Atmosfære

### Enkle (timer – dager)

**4.1 Klasse-spesifikke hit-sounds**
Krieger: tungt metallisk "clang" ved treff. Archer: skarp "twang". Skald: en liten musikalsk akkord. Wizard: magisk "zap" med elementsvarende pitch. Fire nye lyd-filer, registrert i `AudioManifest.ts` med klasse-ID som nøkkel. `PlayerCombatManager` spiller riktig lyd basert på aktiv klasse.

**4.2 "Siste fiende"-leitmotif**
Når kun én fiende gjenstår i en wave, fades musikken ned til bare perkusjon eller en enkelt stryker-linje. Spenningen og stilheten gjør at spilleren "hjelper" på å finne fienden. Gjenopptas normalt når fienden dør. Implementeres i `AudioManager` med et `lastEnemyMode`-flagg.

**4.3 Ambient lydlag per level-tema**
Level 1–3 (skog): fugler, vind, kvist-knekking. Level 4–6 (myr): frosk, vann, lave suser. Level 7–10 (ruiner): ekko, fjerne skrik, stille. Legges til som en loop-ambient-kanal separat fra musikken i `AudioManager`.

**4.4 Boss intro-voiceover**
Når en boss spawner, spilles én norsk setning (syntetisk TTS eller pre-recorded): *"Du trodde du var trygg."* / *"Ingen overlever denne natten."* Displayes som subtittel i React i 3 sekunder. Lydfilene er én per boss.

---

### Middels (1–2 uker)

**4.5 Spatiale lyder med distance attenuation**
Fienders lyder dempes basert på avstand til spilleren. Langt unna: lavere volum + lett lavpass-filter (mufflet). Nær: full volum + høyfrekvent detalj. Phaser støtter `setVolume()` per sound, men ikke innebygd spatialisering – beregn avstand i `Enemy.update()` og call `setVolume()` dynamisk.

**4.6 Narrativ tekst mellom levels**
Mellom hvert level vises én norsk setning (2–3 sek, fade in/out) over level-loading-skjermen. Setningene er stemningsfulle og vage – ikke plot-drivende: *"Skogen husker."* / *"De kom fra øst."* / *"Én natt til."* Lagres i `narrative_lines.ts`, vises i `LoadingOverlay.tsx`.

**4.7 Musikk-intensitet basert på HP**
`AudioManager` monitorerer `playerHP/playerMaxHP`-ratio og justerer musikkens intensitet: over 60 % HP → normal musikk. 30–60 % → legg til et ekstra perkusjonskledd lag. Under 30 % → fullt intensivt arrangement. Krever stems-basert musikk (samme sang i 2–3 lag som mikses live).

---

### Ambisiøse (måneder)

**4.8 Fullt adaptivt musikk-system**
Musikken modulerer live basert på: HP, antall gjenværende fiender, aktiv wave-event, boss-tilstand, og om spilleren er stationary eller mobile. Bruker Phaser-lyd-API til å kryss-fade mellom pre-komponerte stems. Krever en `AdaptiveMusicController` som abonnerer på relevante registry-events.

**4.9 Environmental storytelling via kart-detaljer**
Hvert kart inneholder miljødetaljer som forteller en taus historie: en haug med skjeletter fra tidligere eventyrere, en halvødelagt hytte med stearinlys, runer risset inn i trær. Rene visuelle tillegg til tilemap-data – ingen mekanikk, bare atmosfære.

---

## 5. Endgame & Prestige-løkker

### Enkle (timer – dager)

**5.1 New Game+**
Etter å ha fullført level 10 tilbys "New Game+" direkte: start forfra, men fiender har 2× base HP og 1.5× skade. Spilleren beholder Paragon-nivå og klasse-milepæl-passives. Gir umiddelbar replay uten å gå via meny. Implementeres i `WaveManager`/`GameConfig` med en `ngPlusMultiplier`-egenskap.

**5.2 Daglige Prestige-mål**
Tre daglige utfordringer genereres fra et mål-bibliotek: *"Fullfør 10 waves uten å bruke dash"*, *"Drep 50 fiender med én type våpen"*, *"Overlev level 3 med under 30 % HP"*. Fullføring gir Paragon-XP-bonus. Nye mål genereres med `Date.now()` som seed. Vises i en ny fane i `FantasyBook`.

**5.3 Scoreboard per klasse**
Separat highscore-liste per klasse (ikke bare total). Spillere konkurrerer innen sin klasse-nisje. Enkel endring av `HighscoreManager.ts` – legg til klasse-ID i submitted data og filtrer i `HighscoresModal.tsx`.

---

### Middels (1–2 uker)

**5.4 Curse Runs**
Før run-start kan spilleren velge ett "forbannelse" fra en liste: *"Du tar 50 % mer skade"*, *"Fiender reger seg dobbelt"*, *"Ingen dash"*. Fullføring av run med aktiv curse gir +50 % Paragon-XP. Krever et `CurseSelectScreen`-komponent og at `GameConfig`/`PlayerCombatManager` sjekker aktive curses.

**5.5 Endless Mode**
Etter level 10 starter Endless Mode: waves fortsetter med dynamisk vanskelighetsgradering. Fiende-HP og antall øker hvert 5. wave. DPS-tracking justerer spawning – hvis spilleren dræper for fort, økes spawning-rate. Krever en `EndlessDifficultyController` i `WaveManager`.

**5.6 Paragon-tre**
Paragon-XP investeres i et globalt tre (persistent på tvers av runs): noder som gir små passive bonuser (+2 % HP per run, +5 % coin drop rate, etc.). Maks 20–30 noder. Krever ny `ParagonTree`-komponent i React og lagring i `SaveManager`.

---

### Ambisiøse (måneder)

**5.7 Ancestral Runs**
Spill som en svakere "forfader"-versjon av klassen din (lavere base-stats, andre upgrades, andre lyder). Fullføring gir unike kosmetiske belønninger (kappefarge, alternativt sprite-skin). Ancestral-data lagres som en alternativ klasse-konfig i `GameConfig.ts`.

**5.8 Seasonal Events**
Tidsbegrensede sesonger (2–4 uker) med unike kart-temaer (Halloween-skog, Julvinter), eksklusive enemies (Undead Santa), og spesiell seasonal highscore-tabell. Arkiveres etter sesongslutt. Krever event-basert konfig og dato-sjekk i `GameContainer`.

**5.9 Asymmetrisk Multiplayer-mode**
Én spiller spiller som "Dungeon Master" – plasserer fiender og velger wave-komposisjon fra et enkelt UI – mens den andre spiller normalt. Dungeon Master-en vinner hvis spilleren dør. Krever større nettverksarkitektur-utvidelse av `NetworkManager`.

---

## Quick-Win Tabell

Disse ideene gir høy impact med lav innsats (timer til maks 2–3 dager):

| # | Ide | Seksjon | Estimat | Impact |
|---|-----|---------|---------|--------|
| 1.3 | Boss "tells" – animert advarsel før angrep | Fiende & Boss | 1–2 dager | Stor – gjør bossfights dramatisk mer lesbare |
| 1.2 | Elite-varianter med aura-effekt | Fiende & Boss | 1 dag | Middels – adds visual threat variety umiddelbart |
| 2.1 | Klasse-spesifikke passive milepæl-bonuser | Klasseidentitet | 1–2 dager | Stor – gir klassene meningsfulle mål å nå |
| 2.3 | Klasse-spesifikke oppstartsbonuser | Klasseidentitet | <1 dag | Middels – forsterker class fantasy fra sekund 1 |
| 3.1 | Gambling-shrine | Økonomi | 1–2 dager | Stor – morsom risikomekanikk, spillerne vil elske det |
| 4.2 | "Siste fiende"-leitmotif | Lyd & Narrativ | <1 dag | Stor – billig lydtrick med enorm dramatisk effekt |
| 4.1 | Klasse-spesifikke hit-sounds | Lyd & Narrativ | 1 dag | Middels – polerer klasseidentitet via lydfeedback |
| 5.1 | New Game+ | Endgame & Prestige | 1 dag | Stor – gir umiddelbar loop-motivasjon post-level 10 |
| 4.6 | Narrativ tekst mellom levels | Lyd & Narrativ | 1 dag | Middels – billig atmosfære-boost |
| 5.2 | Daglige Prestige-mål | Endgame & Prestige | 2–3 dager | Stor – driver daglig retur |

---

*Dokument oppdatert: Mars 2026*

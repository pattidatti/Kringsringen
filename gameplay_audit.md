# Gameplay Audit — Kringsringen

**Dato:** 2026-03-06
**Scope:** Mekanikk-design, Game Feel, Flow State, Resiliens, Tilgjengelighet

---

## 1. Design Failures & Exploits

### 1.1 Fortification Cheese (KRITISK — Design Defekt)

**Problemet:** `Fortification`-oppgraderingen gir +20% armor per level ved å stå stille i 1 sekund. Kombinert med `Rustning` (flat damage reduction) og `Iron Will` (overlev dødelig treff), kan Krieger bygge en nesten udødelig "turret"-strategi:

- Stå stille i senter av kartet
- Whirlwind på cooldown (dekker 120px radius)
- Fortification + armor + blocking (80% reduksjon) + Iron Will

**Konsekvens:** Den *kjedeligste* strategien er den *mest optimale* — et klassisk "minmax"-designfeil. Spilleren trenger aldri bevege seg.

**Fix-forslag:** Fortification bør gi en annen bonus enn ren overlevelse — f.eks. damage bonus som krever at man *velger* mellom mobilitet og skade, ikke mobilitet og defensiv.

### 1.2 Enemy Spawn Radius = Statisk 700px (HØY)

**Problemet:** Alle fiender spawner på en fast sirkel (radius 700px) fra kartets senter. Spilleren vet alltid nøyaktig hvor fiender kommer fra. Etter noen minutter er spawn-mønsteret fullstendig forutsigbart.

**Konsekvens:** Fjerner spenning og overraskelse fra wave-systemet. Spilleren kan posisjonere seg optimalt uten risiko.

**Fix-forslag:** Varier spawn-radius (600–900px), eller spawn relativt til *spillerens posisjon* i stedet for kart-senter. Eventuelt noen fiender som spawner fra kartkantene.

### 1.3 Coin Economy — Lineær Inntekt, Eksponentiell Kostnad (MEDIUM)

**Problemet:** Coin drops er `5-15 + (level-1)*3` per fiende. Ved level 10 gir en fiende ~32–42 coins. Men oppgraderingskostnad = `basePrice * level^priceScale`. Health level 10 = `40 * 10^1.5` ≈ 1265 coins.

Med 28 fiender per wave × 3 waves = 84 fiender × ~37 coins = ~3108 coins per level. Men flere oppgraderinger koster 500–2000+ coins hver. Spilleren kan *aldri* holde alle oppgraderinger jevnt oppgradert.

**Konsekvens:** Ikke nødvendigvis en feil — men det er ingen feedback til spilleren om at de *bør* spesialisere. Prisene bare stiger uten forklaring. Nye spillere vil prøve å oppgradere alt likt og møte en vegg.

**Fix-forslag:** Vis en "prisøkning"-indikator som forklarer den eksponentielle kurven, eller legg til en rabatt-markering på oppgraderinger som er underprioriterte.

### 1.4 Date.now() for Cooldowns (MEDIUM — Exploit-vektor)

**Problemet:** Dash, abilities, og iron_will bruker `Date.now()` for cooldown-sjekker. Systemklokken kan manipuleres av spilleren (eller påvirkes av tab-out → tab-in).

**Konsekvens:** Lav risiko i singleplayer (spilleren jukser seg selv). I multiplayer er dette host-authoritative, men dash/ability cooldowns sjekkes lokalt.

**Fix-forslag:** Bruk `scene.time.now` (Phaser-intern tid) i stedet for `Date.now()` for alle gameplay-cooldowns. Phaser-tid pauser når scenen pauser.

---

## 2. Juice Deficits — Hvor Spillet Føles "Flatt"

### 2.1 Ingen Attack Buffering (HØY — Game Feel)

**Problemet:** Det finnes **ingen input-buffering** for angrep. Hvis spilleren trykker attack mens forrige angrep animeres, forkastes inputen stille. Spilleren må vente til animasjonen er ferdig og *deretter* trykke igjen.

**Konsekvens:** Spillet føles "uresponsivt" ved høy attack speed. Erfarne spillere som timing-buffer angrep (standard i alle action-RPG) vil oppleve at trykk "forsvinner".

**Fix-forslag:** 150ms input buffer — lagre siste attack-input og utfør den når cooldown utløper. Alle moderne action-spill har dette.

### 2.2 Ingen Coyote Time for Dash (MEDIUM)

**Problemet:** Dash krever nøyaktig timing — ingen "grace period" etter at spilleren slipper bevegelsestastene. Kombinert med at dash-retningen velger WASD *eller* mus (ikke begge), kan det føles uforutsigbart.

**Fix-forslag:** 100ms coyote window der sist registrerte WASD-retning holdes aktiv etter key-release.

### 2.3 Enemy Death Sound Mangler (MEDIUM)

**Problemet:** Fiender har visuell dødsekvens (white flash → dark dissolve → sparks → blood), men **ingen dedikert døds-SFX**. Det eneste lydsignalet er treff-lyden fra våpenet som drepte.

**Konsekvens:** Drap føles visuelt tilfredsstillende men auditivt flatt. Hjernens belønningssystem responderer sterkt på audio-feedback ved "kills".

**Fix-forslag:** Kort, distinkt "death crunch" SFX — et lavt, dampet *crackle* eller *thud*. Varieres med 3–4 varianter for å unngå repetisjon.

### 2.4 Coin Pickup — Svak Feedback (LAV)

**Problemet:** Coins gir en subtil SFX (`pop` varianter, 0.25 volum) men ingen visuell partikkel-feedback ved oppsamling. Coins bare forsvinner stille.

**Fix-forslag:** Liten gul sparkle-burst ved coin-pickup. Eventuelt en akkumulerende "combo"-teller som viser total gull samlet etter en kamp.

---

## 3. Flow State — Vanskelighetsgrad & Pacing

### 3.1 Level 1 → Level 2 Difficulty Spike (HØY)

**Problemet:** Level 1 er 2 waves × 6 fiender = 12 svake fiender (kun melee). Level 2 introduserer ranged fiender + boss etter level 2. Spilleren går fra "treningssimulator" til "ranged enemies + Orkehøvding (1600 HP, 50 dmg)" uten mellomsteg.

**Konsekvens:** Nye spillere vil oppleve level 1 som trivielt, deretter bli overveldet av den første bossen. Mangler en "sweet spot" der spilleren føler mestring før utfordringen øker.

**Fix-forslag:** Legg til en 4. wave i level 1 med noen litt tøffere melee-fiender, eller gjør boss 1 svakere (1200 HP). Alternativt: la level 2 ha en "ranged-only" introduksjonswave først.

### 3.2 Wave-Pause = 2000ms Fast (MEDIUM)

**Problemet:** Mellom waves er det kun 2 sekunder pause (`delayedCall(2000, ...)`). Spilleren har ingen tid til å orientere seg, samle coins, eller puste.

**Konsekvens:** Ved høyere levels med 20+ fiender per wave, er 2 sekunder ikke nok til å samle resterende coins. Pacing føles heseblesende uten pusteromsvariasjoner.

**Fix-forslag:** Dynamisk pause basert på fiende-count: `2000 + Math.min(enemiesKilled * 100, 3000)`. Gir 2–5 sekunder avhengig av wave-størrelse.

### 3.3 Ingen Mid-Wave Difficulty Ramp (LAV)

**Problemet:** Alle fiender i en wave spawner med identisk styrke. Det er ingen "early weak, late strong"-progressjon *innenfor* en wave.

**Fix-forslag:** Siste 20% av en wave's fiender kan ha +50% HP eller +1 elite, som en mini-climax før wave-klaring.

---

## 4. Cognitive Overload — UI Under Intensitet

### 4.1 BuffHUD Stacking (HØY)

**Problemet:** Under Krieger-gameplay med Whirlwind + Iron Bulwark + Battle Cry + Fortification + Blodust, kan 5+ buffs stable vertikalt i øvre venstre hjørne. Hver buff har progress-sirkel, tekst og ikon.

**Konsekvens:** Under intens kamp blokkerer BuffHUD-stacken synet til fiender som kommer fra venstre. UI-et *konkurrerer med gameplay* i stedet for å støtte det.

**Fix-forslag:** Kollaps buffs til kompakte ikoner (kun sirkel + ikon, uten tekst) når > 3 buffs aktive. Vis full info ved hover. Alternativt: flytt til topp-senter under TopHUD.

### 4.2 BossSplashScreen Blokkerer 3.2 Sekunder (MEDIUM)

**Problemet:** `BossSplashScreen` vises i 3200ms og blokkerer *all* visuell informasjon. Spilleren kan ikke se hvor bossen spawner eller forberede seg.

**Konsekvens:** "Cool" presentasjon, men frustrerende ved gjentatte forsøk. Etter 3. dødsfall mot en boss vil animasjonen føles som en straff.

**Fix-forslag:** Reduser til 2000ms, eller gjør den semi-transparent slik at spilleren kan se arenaen bak. "Skip"-mulighet ved gjentatte encounters.

### 4.3 Damage Number Overload (MEDIUM)

**Problemet:** Med 100 damage text-objekter i poolen og Whirlwind som treffer 10+ fiender × 15 ticks = potensielt 150 damage numbers på skjermen samtidig.

**Konsekvens:** Skjermen drukner i tall. Spilleren kan ikke se fiender, prosjektiler, eller farlige AoE-indikatorer.

**Fix-forslag:** Kumuler damage per fiende — vis én samlet tall som vokser, i stedet for mange individuelle. Eller reduser damage text-frekvens til maks 1 per fiende per 300ms.

---

## 5. Resiliens & Tab-Out

### 5.1 Delta Capping — Delvis Implementert (MEDIUM)

**Problemet:** `main.ts` capper delta til 100ms (`Math.min(delta, 100)`), men **Enemy.preUpdate()** bruker rå `delta` uten capping. Ved tab-out kan delta-spike sende fiender gjennom vegger via AI-pathing.

**Konsekvens:** Etter 30s tab-out returnerer spilleren til fiender som har beveget seg uforutsigbart. Fiender *teleporterer* ikke (Phaser arcade physics har noe intern capping), men AI-beslutninger basert på stor delta kan gi feil pathfinding.

**Fix-forslag:** Cap delta i `Enemy.preUpdate()`: `const dt = Math.min(delta, 100)`.

### 5.2 Phaser Timer Events Overlever Ikke Tab-Out (LAV)

**Problemet:** `scene.time.delayedCall()` brukes for wave-pauser, ability-durationer, og spawn-timere. Phaser-timere pauser når fanen er inaktiv (requestAnimationFrame stopper). Men `Date.now()`-baserte cooldowns *fortsetter å telle ned*.

**Konsekvens:** Etter tab-out kan spilleren ha full cooldown-reset på alle abilities (Date.now har "passert" cooldown-terskelen), mens wave-timere ikke har rykket. Gir en ufortjent fordel.

---

## 6. Tilgjengelighet (A11y)

### 6.1 Null `prefers-reduced-motion` Støtte (HØY)

**Problemet:** Eneste bruk er i `App.css` for Vite's default logo-spin. Ingen gameplay-animasjoner respekterer motion preference. Screen shake, pulserende effekter, BossSplashScreen-animasjoner — alt ignorerer brukerens systeminnstilling.

**Fix-forslag:** Legg til CSS `@media (prefers-reduced-motion: reduce)` som disabler `animate-pulse`, `animate-ping`, og alle spring-animasjoner. For Phaser: sjekk `window.matchMedia('(prefers-reduced-motion: reduce)').matches` og sett screen shake intensity til 0.

### 6.2 Fargeblindhet — Ingen Støtte (HØY)

**Problemet:** Skade-typer skilles *kun* med farge: hvit (normal), oransje (ild), cyan (frost), lilla (soul link), grønn (gift). HP-bar bruker rød/grønn terskel (< 40% = rød). Ingen mønstre, ikoner eller teksturer som supplement.

**Konsekvens:** ~8% av mannlige spillere (protanopi/deuteranopi) kan ikke skille ild fra gift, eller rød HP fra grønn HP.

**Fix-forslag:** Legg til symboler i damage text (ikon prefix), og bruk stripe/mønster-variant for HP-bar under terskel i stedet for kun fargeskifte.

---

## Prioritert Handlingsliste

| # | Funn | Kategori | Impact | Innsats |
|---|---|---|---|---|
| 1 | Attack buffering mangler | Game Feel | Stor | Liten |
| 2 | Fortification cheese | Exploit | Stor | Medium |
| 3 | Enemy death SFX mangler | Juice | Medium | Liten |
| 4 | Delta not capped i Enemy.preUpdate | Resiliens | Medium | Liten |
| 5 | L1→L2 difficulty spike | Flow | Medium | Liten |
| 6 | BuffHUD overload ved 5+ buffs | Cognitive | Medium | Medium |
| 7 | `prefers-reduced-motion` støtte | A11y | Stor | Medium |
| 8 | Fargeblindhet-støtte | A11y | Stor | Stor |
| 9 | Damage number spam under Whirlwind | Cognitive | Medium | Medium |
| 10 | Date.now() vs Phaser-tid for cooldowns | Resiliens | Lav | Medium |
| 11 | Spawn-radius variasjon | Design | Lav | Liten |
| 12 | Wave-pause for kort | Flow | Lav | Liten |

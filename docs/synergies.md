# Synergier & Klasseteknikker

Kringsringen bruker et klassespesifikt oppgraderingssystem der hver klasse (Krieger, Archer, Wizard) har tilgang til unike teknikker og synergier. Under er en oversikt over de viktigste systemene som er implementert.

## ⚔️ Krieger (Warrior)
Krieger fokuserer på nærkamp, overlevelsesevne og motangrep.

| Synergi/Teknikk | Krav | Effekt |
| :--- | :--- | :--- |
| **Skadeskalering** | Armor (Lvl 3) | Øker din totale skade basert på hvor mye rustning du har. |
| **Kontraangrep** | Armor (Lvl 2) | Sjanse for å reflektere en del av mottatt skade tilbake til angriperen. |
| **Blodust** | Armor (Lvl 3) | En mer offensiv thorns-effekt som sender skade direkte tilbake til kilden. |
| **Jernvilje** | Armor (Lvl 6) | Overlev ett dødelig slag med 1 HP (én gang per bølge). |
| **Eclipsestøt** | Sword Eclipse (Lvl 1) | Sverdsving etterlater et mørkt spor som gir kontinuerlig skade over tid. |
| **Virvelvind** | Drivkraft | Klasse-evne: Gjør massiv AoE-skade rundt spilleren mens du roterer. |

---

## 🏹 Archer (Speider)
Archer fokuserer på presisjon, mobilitet og avstandskontroll.

| Synergi/Teknikk | Krav | Effekt |
| :--- | :--- | :--- |
| **Explosive Shot** | Drivkraft | Klasse-evne: Neste pil eksploderer i en massiv radius. |
| **Singularitetspil** | Singularity | Piler kan skape gravitasjonsfelt som drar fiender inn mot sentrum. |
| **Rikosjett** | Ricochet (Lvl 1-3) | Piler spretter mellom flere fiender ved treff. |
| **Festepil** | Pierce (Lvl 1) | Sjanse for at piler nagler fiender til bakken (immobilisering). |
| **Skuddkaskade** | Multishot (Lvl 2) | Fiendedrap spawner automatisk ekstra piler mot nærmeste mål. |
| **Dragemanøver** | Dash Mastery | Fiendedrap reduserer cooldown på Dash umiddelbart. |
| **Ørneøye** | Arrow Speed (Lvl 3) | Øker pilenes hastighet og maksimale rekkevidde betydelig. |

---

## 🔮 Wizard (Trollmann)
Wizard har de mest komplekse synergiene, basert på hvordan ulike elementer (Ild, Frost, Lyn) reagerer med hverandre.

| Synergi/Teknikk | Krav | Effekt |
| :--- | :--- | :--- |
| **Thermal Shock** | Fireball + Frost | Fireball mot frossen fiende gir **3x skade** og dobbel eksplosjon. |
| **Frosset Torden** | Frost + Lyn | Frosne fiender som treffes av lyn tar **4x skade**. |
| **Kjede Reaksjon** | Cascade Chain | Fiender truffet av flere elementer tar opptil +100% skade under Cascade. |
| **Trolldomseko** | Spell Echo | Sjanse for å kaste en trolldom uten at cooldown aktiveres. |
| **Overbelastning** | Spell Echo (Lvl 2) | Å treffe 3+ fiender med ett kast gjør at neste kast er helt gratis. |
| **Arkan Innsikt** | Spell Mastery | Hvert fjerde kast reduserer cooldown på våpenet ditt drastisk. |
| **Manaskjold** | Armor (Lvl 2) | Sjanse for å absorbere skade fullstendig og redusere cooldowns. |
| **Manaring** | Cascade (Lvl 2) | Aktiv Cascade gir betydelig skade-reduksjon (Manabuffer). |

---

## ⭐ Drivkraft (Legendære Synergier)
Hver klasse har sin unike "Drivkraft"-kategori i butikken. Dette er synergiene som endrer spillestilen din totalt:

*   **Virvelvind (Krieger):** Gjør deg til en ustoppelig tornado av stål.
*   **Explosive Shot (Archer):** Forvandler hver pil til et massivt artilleri-nedslag.
*   **Elemental Cascade (Wizard):** Slipp løs alle elementene i en destruktiv kjede-reaksjon.

> Se [class-system-design.md](file:///home/irik/Kringsringen/docs/class-system-design.md) for en dypere gjennomgang av klasse-mekanikkene.

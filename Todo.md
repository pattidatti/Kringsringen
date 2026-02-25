# Ideer
- [x] Pil og bue, med egen hotkey
- [ ] Spells - med spelleffekts
- [ ] Ulike maps - Samme trær rundt og slikt, men erstatte noen gress tiles med litt annet snacks. 
- [ ] Ulike mobs med ranged og spells (finne sprite for mages)
- [x] Faser per map/lvl. 
- [ ] Quester/challenges 
- [ ] Powerups man kan finne på kartet. 
- [ ] Items, inventory, équipment. 
- [ ] Vanskelighetsgrader. 
- [x] Onboarding med forklaring av controls og slikt. Kan huke av at det ikke skal vises igjen, lagre i cash. 

# Dash
- [ ] Dash må implementeres, med en cooldown, 20 sec default. Hotkey Shift (må også ligges inn i onboarding. )

# Score 
- [x] Score ingame oppe ved siden av mynter

# Boss battles
- Sjekke at alle bosser fungerer riktig, har animations osv. 
-[x] Orkehøvding har noe feil med hitbox, får ikke til å skade den. Bare lighting med seeking greier å treffe, alt annen bommer totalt, går rett gjennom. 
-[x] Orkehøvding virker til å bli svært lett stuck, og kan ikke bevege seg; blir dermed ingen stor trussel. 

-[x] Multiplayer orkehøvding; spiller B får hitbaren over hodet, men den er gigalang, og  den er "tom" i HP baren på toppen. 

- En del enemies blinker mens de går, ligger antageligvis en frame for mange i sprite sheeten. 


# Spell
- Lighting ser fremdeles ikke helt bra ut. 
- Lighting er fremdeles for overpowered. 
- Ser ut som man kan caste fortere enn cooldownen tillater. 
- [ ] Lag når det er 3+ lyn samtidig, begynner det å lagge, må optimaliseres betraktelig! 
# musikk
- [x] Må bytte musikk hvert level. 


- [ ] 

# Bugs
- [ ] Orkeboss ikke synlig for andre enn host. 
- [ ] HP bar for alle andre enn host, er cracy stor, virker som å justere seg når de tar damage. 
- [ ] Man må kunne resse folk etter et level er over, via boken og det koster masse penger. Øker i kostnad for hver gang man gjør det. 
- [ ] Når spillere dør, skal de bli spøkelser, som kan plukke opp gull, men de kan ikke skade fiender. De er spectating. Monstere skal ikke angripe døde spillere. 
- [ ] Når man skriver navn på death screen, får man ikke bruke alle bokstaver; WASD er blokket. 
- [x] Generell dårlig pathing på fiender, de setter seg fast i alt mulig. 
- [] Det er ikke regn på hele skjermen, det mangler litt på høyre side.
- [?] Spillet crasher når man skyter bue og treffer noe med (ihvertfall med eksplosjon ulocked )
- [x] Virker som gull forsvinner etter en stund, det må bli liggende. 
- [x] Radius for å plukke opp gull må økes på default. 
- [Nei?] Movement lock på spellcasting og bue må reduseres litt. 
. [x] Spillet crasher på death
- [x] Bare sverd er visuelt tilgjengelig actionbar ved spillstart. Det går an å velge annet, men UI oppdaterer seg ikke. 
- [x] HP oppe til venstre oppdaterer seg ikke
- [x] Når spilleren dør, fryser og krasjer spillet. 
- [x] Hotbar i bunnen bruker assets på feil måte. De er strukket, og feilbrukt.Selector viser hele sprite, og er vertical.  
- [x] Nesten ingen av enemies har attack animation, selv om dette ligger tilgjengelig i assets, slimes angriper heller ikke, de bare dytter borti spilleren.
- [x] Det er rimelig lang loading når spiller laster inn, hva skyldes dette? 
- [x] Uklart hvordan man unlocker bue. 
- [x] Popup for neste level/fase forsvinner for fort. Man rekker knapt å se hva som skjedde. Det mangler også en level complete popup når boken åpnes etter et level. 
- [x] Mangler en ingame counter for gull. 


# Annet
- [x] bruke lyder fra /wav files/ mappen i stedet for å generere lyder med engine. Fjerne alt av lydgenerering. Undersøk hva som kan brukes i mappen nå, samt fremtidige lyder basert på @gamedesign_document.md . Implementere de nye lydene i spillet og plassere dem i riktige mapper. Lage dokumentasjon for lydene i .md fil. 
- [ ] Rydde opp i filer og mapper. Hva er assets vi ikke skal bruke? Hvilke ligger i mapper, men som ikke skal brukes enda? Har Er det noe annet som ikke brukes lengre og kan slettes? 


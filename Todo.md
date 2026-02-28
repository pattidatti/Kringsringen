# Ideer
- [x] Pil og bue, med egen hotkey
- [x] Spells - med spelleffekts
- [x] Ulike maps - Samme trær rundt og slikt, men erstatte noen gress tiles med litt annet snacks. 
- [x] Ulike mobs med ranged og spells (finne sprite for mages)
- [x] Faser per map/lvl. 
- [ ] Quester/challenges 
- [ ] Powerups man kan finne på kartet. 
- [ ] Items, inventory, équipment. 
- [ ] Vanskelighetsgrader. 
- [x] Onboarding med forklaring av controls og slikt. Kan huke av at det ikke skal vises igjen, lagre i cash. 

# Dash
- [x] Dash må implementeres, med en cooldown, 20 sec default. Hotkey Shift (må også ligges inn i onboarding. ) Spilleren forflytter seg et stykke i den retningen man peker, og kan ikke skade fiender mens man dasher, man tar heller ikke skade i dash. Vi må se om vi enkelt kan få til en liten dash animation, eller effekt som indikerer det for spiller, samt en liten swoosh-lyd (bruk placeholder, skal finne riktig senere). Vi må også se om det er mulig å få til en liten dash-cooldown bar, eller noe som indikerer hvor lenge til man kan dash igjen. Denne kan gjerne ligge rett over actionbar. Vi må ha upgrades til dash i boken, som reduserer cooldown, øker distanse, og kanskje gir en liten bonus på noe annet. 
-[x] Vindstøt upgrade, teksten gjenspeiler ikke hva nye dasj er. Default er 7 sec nå. -1 pr upgrade. 
-[ ] Dash upgrade (egen type) gjør skade og har pushback hvis man treffer en fiende eller går igjennom. 

# Score 
- [x] Score ingame oppe ved siden av mynter
- [x] Penger og score ser ikke ut til å oppdatere seg oppe til høyre. 
- [ ] Hvis en overlever hele spillet og dreper sisteboss, må en få highscore og kan skrive inn navnet sitt. 

# Boss battles
- [x] Orkehøvding er altfor lett å drepe. Trenger litt mer hp, bør være raskere, bruke dash? Kom med forslag. 
- Sjekke at alle bosser fungerer riktig, har animations osv. 
-[x] Orkehøvding har noe feil med hitbox, får ikke til å skade den. Bare lighting med seeking greier å treffe, alt annen bommer totalt, går rett gjennom. 
-[x] Orkehøvding virker til å bli svært lett stuck, og kan ikke bevege seg; blir dermed ingen stor trussel. 
-[x] Multiplayer orkehøvding; spiller B får hitbaren over hodet, men den er gigalang, og  den er "tom" i HP baren på toppen. 
- [ ] Orkeboss blir fremdeles litt for mye stuck. 
- [ ] Orkehøvdings dash er for kort, og han blir lett stuck etter dash. 
-[x] Usikker på om det er coindrops fra bosser, men de bør uansett automatisk plukkes opp, ettersom spillet pauser med en gang den dør, og en ikke får muligheten til å hente dem selv. 
- [ ] Alle bosser må droppe mye mer gull. 
- [ ] Trollmester Grak må ha en nockback resist, slik at han ikke blir stoppet av alt mulig. 
- [ ] Skjelettkongen på lvl 10 angriper/slår aldri spilleren. Den er altfor enkel, må gjøre betrakteliger vanskeligere. 
# grafikk
- [x] Implementert Grafikk-innstillinger i hovedmeny og in-game (Low, Medium, High).
- [x] Lav settings: Uten lys ser man omtrent ingenting. Løst ved resette shader pipeline.
- [ ] Lav setting: Ser ikke spillerkarakter, og samme problem med healthbars. 
- [ ] Medium settings: Ser greit ut, men når enemies slutter å ha hp bar over hode fordi de ikke er oppdatert, så henger de igjen i lufta. 

# Monsters
- [x] En del enemies blinker mens de går, ligger antageligvis en frame for mange i sprite sheeten. 
- [x] Ny wizard: Healer. Caster en healing spell på andre monstere, som gjør at de får en grønn glow mens de blir healed. Spelleffekt: @622.png i grønn (rad 3, 14 frames). Attack animation: public/assets/sprites/wizard.png rad 3, 8 frames. Trenger egen spelleffekt lyd (bruk placeholder for nå). Spelleffekt må ha glow/lys slik som de andre spelleffektene vi har. Den skal spawne oppå dem som blir healed, og forsvinne etter en stund. Vi må introdusere antall healere sakte i waves. Kan vi gi dem en grønn tint, på samme måte som vi har på block på spilleren? Dette er vel enkleste måte å få dem til å se annerledes ut. Mens healingen pågår, kan de ikke bevege seg, og er dermed sårbare, de lyser også opp svakt grønt. 

# Spell
- [x] Ser ut som man kan caste fortere enn cooldownen tillater. 
- [x] Finne en annen uppgrade enn å kunne caste flere lyn samtidig ut fra spilleren. 
- [x] Rebalansere upgrades og skade mellom alle spells og våpen. 
- [x] Lightingstaff jumper og treffer samme target, det skal alltid gå til nytt, ikke dobbel damage på ett.
- [x] Lightingstaff vil ikke skyte hvis du sikter i en retning det ikke er mobs.  
# musikk
- [x] Må bytte musikk hvert level. 
- [x] Er placeholder lyd på dash
- [ ] Healing trenger egen lyd
- [x] Når man kjøper en upgrade i boken, skal det være en lydeffekt public/assets/audio/sfx/coins_gather_quick.wav
- [x] Når man bytter side i boken skal det være en lydeffekt public/assets/audio/sfx/page_turn.wav
- [x] Forst ambiance spilles ikke av på landingpage - er det fordi den ikke er lastet inn enda?

# MP
- [x] Når hele party er døde, skal man kunne starte på nytt uten å lage en helt ny server osv. Bare en retry knapp som dukker opp med readystate x/y spillere.  
- [x] Klient kan ikke se HP bars til enemies, bare host kan se det. 
- [ ] Når man dør i MP får man "Falnet" skjermen, det skal man ikke, man skal leve videre som ghost slik vi har utviklet. 
- [x] Når man restarter i MP, så henger de gamle HP barene til enemies igjen på kartet, selv om man har startet på nytt. 
- [ ] MP: spillerne får ikke opp animation når andre spillere blir truffet/skadet.
- [ ] MP:  
- [ ] MP: Man må kunne se andres lys, slik at man kan se deres fog of war (bare ytterste lyset, ikke det innerste)
# Bugs
- [ ] Restart knappen på singleplayer fungerer ikke etter man er død, spillet starter faktisk ikke på nytt, man får rød skjerm lvl 1 fase 1, men spiller er fryst. 
- [x] MP: Når man trykker klar, så står det bare 0/2, selv om begge spillerne har trykket klar, lukkes ikke spillet og man gå kan videre.  
- [x] Boss battle kan bli hengede på spilleren (splash screen), selv om kampen er startet. 
- [x] Man kommer ikke lengre en lvl 5 
- [x] Level blir av og til completet selv om det er fiender igjen. 
- [x] Splash på fire staff trigger aldri. Er det fordi hitboxen til enemies ligger for langt utenfor kroppen og dermed er for langt unna andre, eller er er radius for liten for blast? eller annet?
- [x] Står på Thermal shock at Iskland makt kreves, men vi bruker/skal bruke permafrost her. 
- [x] Prøv igjen knappen på singleplayer fungerer ikke. Det må også være slik at hvis en har skrevet inn navnet sitt og trykker rett på prøv igjen, så skal det registreres. 
- [ ] Sjekke kolision på alle objekter i mappet. 
- [x] Orkehøvding ikke synlig for andre enn host. 
- [x] HP bar for alle andre enn host, er cracy stor, virker som å justere seg når de tar damage. 
- [x] Man må kunne gjenopplive folk etter et level er over, via boken og det koster masse gull . Øker i kostnad for hver gang man gjør det. 
- [x] Når spillere dør, skal de bli spøkelser, som kan plukke opp gull, men de kan ikke skade fiender. De er spectating (hvit glow og tint og mindre lysradius enn levende spillere). Monstere skal ikke angripe døde spillere. 
- [x] Når man skriver navn på death screen, får man ikke bruke alle bokstaver; WASD er blokket. 
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


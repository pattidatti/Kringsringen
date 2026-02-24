# Ideer
- [ ] Pil og bue, med egen hotkey
- [ ] Spells - med spelleffekts
- [ ] Ulike maps - Samme trær rundt og slikt, men erstatte noen gress tiles med litt annet snacks. 
- [ ] Ulike mobs
- [ ] Bosser
- [ ] Faser per map/lvl. 
- [ ] Quester/challenges 
- [ ] Powerups man kan finne på kartet. 
- [ ] Items, inventory, équipment. 
- [ ] Pengesystem 


# Spell
- Lightingspell, slot 5. Skyter ut fra spilleren mot et target (seeking). Når det treffer bouncer det videre. Oppgraderinger gjør bl.a. lynet splitter seg og går til enda flere. Mer damage. Spilleren kan skyte flere lyn samtidig.
@614.png øverste rad er prosjektilet som sendes fra spilleren (rad 6, 0+5). @615.png er impact (rad 6,0+5). Default sendes det bare ut 1 ekstra lyn etter første treff.  



- På actionbar må vi ha Cooldown som viser hvor lang tid det er mellom neste gang man kan gjøre angrepet. Enkel animasjon av et hjul (som i world of warcraft)



# Bugs
- [ ] Virker som gull forsvinner etter en stund, det må bli liggende. 
- [ ] Radius for å plukke opp gull må økes på default. 
- [ ] Movement lock på spellcasting og bue må reduseres litt. 
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


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


# visuelt 
Dynamisk lys via Phaser Lights2D
Phaser har et innebygd lys-system (scene.lights). Legge til et bevegelig lys rundt spilleren + oransje lys rundt flammekasteren. Krever normal maps på tilesets, eller man bruker det uten (gir ambient "pool of light"-effekt).

13. Vær-effekter (regn, tåke)
Phaser Particles + evt. en shader. Tåke er særlig effektivt for atmosfære i en mørkere skog-setting

14. Bloom/glow post-processing
Phaser støtter custom WebGL pipelines. Glow rundt ildkuler og lysstoffplanter er imponerende, men krever shader-kode.

# Bugs
- [x] HP oppe til venstre oppdaterer seg ikke
- [x] Når spilleren dør, fryser og krasjer spillet. 
- [x] Hotbar i bunnen bruker assets på feil måte. De er strukket, og feilbrukt.Selector viser hele sprite, og er vertical.  
- [x] Nesten ingen av enemies har attack animation, selv om dette ligger tilgjengelig i assets, slimes angriper heller ikke, de bare dytter borti spilleren.
- [ ] Det er rimelig lang loading når spiller laster inn, hva skyldes dette? 
- [x] Uklart hvordan man unlocker bue. 
- [x] Popup for neste level/fase forsvinner for fort. Man rekker knapt å se hva som skjedde. Det mangler også en level complete popup når boken åpnes etter et level. 
- [x] Mangler en ingame counter for gull. 


# Annet
- [x] bruke lyder fra /wav files/ mappen i stedet for å generere lyder med engine. Fjerne alt av lydgenerering. Undersøk hva som kan brukes i mappen nå, samt fremtidige lyder basert på @gamedesign_document.md . Implementere de nye lydene i spillet og plassere dem i riktige mapper. Lage dokumentasjon for lydene i .md fil. 
- [ ] Rydde opp i filer og mapper. Hva er assets vi ikke skal bruke? Hvilke ligger i mapper, men som ikke skal brukes enda? Har Er det noe annet som ikke brukes lengre og kan slettes? 


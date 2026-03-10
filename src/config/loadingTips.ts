export interface LoadingTip {
    text: string;
    category: 'combat' | 'strategy' | 'lore';
}

export const LOADING_TIPS: LoadingTip[] = [
    { text: 'Gullmynter forsvinner ved død — bruk dem i butikken mellom bølgene.', category: 'strategy' },
    { text: 'Dash gjennom fiender for å unnslippe omringning.', category: 'combat' },
    { text: 'Frost-trylleformler bremser fiender — perfekt for å kontrollere store mengder.', category: 'combat' },
    { text: 'Tårnoppgraderinger gjelder alle våpen av samme type.', category: 'strategy' },
    { text: 'Kringsringen har voktet skogen i over tusen år. Hva er du villig til å ofre?', category: 'lore' },
    { text: 'Lynet slår alle fiender innen rekkevidde. Bruk det i trengte situasjoner.', category: 'combat' },
    { text: 'Shrinene i skogen belønner den modige — men risikoen er reell.', category: 'lore' },
    { text: 'Høyere paragonrang gir sterkere startstatistikk neste runde.', category: 'strategy' },
    { text: 'Bossene husker deg. Hvert møte er hardere enn det forrige.', category: 'lore' },
    { text: 'Singularitet drar alle fiender inn i ett punkt. Kombiner med eksplosiver.', category: 'combat' },
    { text: 'Fjern de raskeste fiendene først — de omringer deg raskest.', category: 'combat' },
    { text: 'Værhendelser som torden og tåke kan snu kampen — for deg eller mot deg.', category: 'lore' },
    { text: 'Pil-oppgraderinger skalerer med kritisk treffrate. Stablings-effekter er kraftige.', category: 'strategy' },
    { text: 'I flerspillermodus er koordinasjon viktigere enn individuell kraft.', category: 'strategy' },
    { text: 'Mørket mellom trærne er ikke alltid tomt. Beveg deg forsiktig.', category: 'lore' },
    { text: 'Eclipse Wake etterlater skygger som skader alt de berører. Bruk terrenget.', category: 'combat' },
    { text: 'Jo lenger du overlever, desto mer guld belønner skogen deg med.', category: 'strategy' },
    { text: 'Bossenes faser endrer angrepsmønstre — studer dem nøye første gang.', category: 'combat' },
    { text: 'En smidig kriger unngår slag. Rustning hjelper, men distanse er bedre.', category: 'combat' },
    { text: 'Skogen husker de falne. De sterkeste legender er de som stod lengst.', category: 'lore' },
];

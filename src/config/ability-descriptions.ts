/**
 * Centralized ability metadata for tooltip system.
 * Maps ability/weapon slot ID → base ability description.
 * Actual stat values are computed dynamically from upgrades.
 */

export interface AbilityMetadata {
  name: string;
  description: string;
  color?: number; // Hex color for themed glow
}

export const ABILITY_DESCRIPTIONS: Record<string, AbilityMetadata> = {
  // ─── KRIEGER ───────────────────────────────────────────────────────────
  sword: {
    name: 'Sverd',
    description: 'Nærkampsangrep som gjør skade og dytte fiender bakover',
    color: 0xcccccc,
  },
  ability_whirlwind: {
    name: 'Virvelvind',
    description: 'Roterer raskt og gjør skade til alle fiender rundt deg over 3 sekunder',
    color: 0xffaa00,
  },
  ability_bulwark: {
    name: 'Jernbolverk',
    description: 'Aktiverer et skjold som blokkerer all inkommende skade',
    color: 0x00ccff,
  },
  ability_grapple: {
    name: 'Kjettingkrok',
    description: 'Kaster krøker som drar alle fiender i nærheten mot deg',
    color: 0xaaaaaa,
  },

  // ─── ARCHER ────────────────────────────────────────────────────────────
  bow: {
    name: 'Bue',
    description: 'Skyter en pil som gjør skade på avstand',
    color: 0xaa7744,
  },
  ability_explosive: {
    name: 'Fantombyge',
    description: 'Skyter en byge av piler raskt etter hverandre',
    color: 0xff6600,
  },
  ability_vault: {
    name: 'Hopp og Byge',
    description: 'Hopper bakover og skyter en vifte av piler',
    color: 0x88ccff,
  },
  ability_decoy: {
    name: 'Skyggemannekeng',
    description: 'Plasserer en lokkefugl som tiltrekker fiender mens du blir usynlig',
    color: 0x6644aa,
  },

  // ─── WIZARD ────────────────────────────────────────────────────────────
  fireball: {
    name: 'Ildkule',
    description: 'Skyter en ildkule som eksploderer ved treff',
    color: 0xff4400,
  },
  frost: {
    name: 'Frostbolt',
    description: 'Skyter en frostbolt som fryser fiender i et område',
    color: 0x00ccff,
  },
  lightning: {
    name: 'Lynbolt',
    description: 'Skyter en lynbolt som spretter mellom fiender',
    color: 0xffee00,
  },
  ability_cascade: {
    name: 'Arkan Kaskade',
    description: 'Skaper et tyngdefelt som drar inn og gjør skade til alle fiender i området',
    color: 0xcc88ff,
  },

  // ─── SKALD ─────────────────────────────────────────────────────────────
  harp_bolt: {
    name: 'Harpe',
    description: 'Grunnleggende lydangrep som bygger +1 Vers (max 5)',
    color: 0x88ccff,
  },
  ability_vers_bolt: {
    name: 'Violin',
    description: 'Skyter 1 + Vers bolter i vifte (forbruker alle Vers)',
    color: 0xffed4e,
  },
  ability_kvad_inspire: {
    name: 'Horn',
    description: 'Bruker 2 Vers for +25% skade/fart og healing',
    color: 0xffd700,
  },
  ability_kvad_seier: {
    name: 'Panfløyte',
    description: 'Lydshockwave — stunner alle fiender i 200r i 3 sek. Bosser: 1.5 sek. Koster 5 Vers.',
    color: 0xffd700,
  },
};

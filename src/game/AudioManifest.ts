export type SoundCategory = 'bgm' | 'sfx' | 'ui' | 'bgs';

/** Configuration for a single sound or a group of interchangeable variants. */
export interface SoundConfig {
    id: string;
    /** Single file path (for BGM or single-variant SFX). */
    path?: string;
    /** Multiple file paths — one is chosen randomly on each play. */
    variants?: string[];
    category: SoundCategory;
    volume?: number;
    loop?: boolean;
    /** Random pitch variation range (±). Applied only to SFX. */
    pitchVariance?: number;
    /** Apply a short convolver reverb tail on playback. */
    reverb?: boolean;
    /** Defer loading until explicitly requested (used for BGM tracks not needed at startup). */
    lazyLoad?: boolean;
}

export const AUDIO_MANIFEST: SoundConfig[] = [
    // — BGM —
    { id: 'meadow_theme', path: 'assets/audio/music/meadow_theme.mp3', category: 'bgm', volume: 0.5, loop: true, lazyLoad: true },
    { id: 'exploration_theme', path: 'assets/audio/music/exploration_theme.mp3', category: 'bgm', volume: 0.5, loop: true, lazyLoad: true },
    { id: 'dragons_fury', path: 'assets/audio/music/dragons_fury.mp3', category: 'bgm', volume: 0.6, loop: true, lazyLoad: true },
    { id: 'pixel_rush_overture', path: 'assets/audio/music/Pixel Rush Overture.mp3', category: 'bgm', volume: 0.5, loop: true, lazyLoad: true },
    { id: 'glitch_in_the_forest', path: 'assets/audio/music/Glitch in the forest.mp3', category: 'bgm', volume: 0.5, loop: true, lazyLoad: true },
    { id: 'glitch_in_the_dungeon', path: 'assets/audio/music/Glitch in the Dungeon.mp3', category: 'bgm', volume: 0.5, loop: true, lazyLoad: true },
    { id: 'glitch_in_the_catacombs', path: 'assets/audio/music/Glitch in the Catacombs.mp3', category: 'bgm', volume: 0.5, loop: true, lazyLoad: true },
    { id: 'glitch_in_the_heavens', path: 'assets/audio/music/Glitch in the heavens.mp3', category: 'bgm', volume: 0.5, loop: true, lazyLoad: true },
    { id: 'final_dungeon_loop', path: 'assets/audio/music/Final Dungeon Loop.mp3', category: 'bgm', volume: 0.6, loop: true, lazyLoad: true },
    { id: 'glitch_king', path: 'assets/audio/music/Glitch King.mp3', category: 'bgm', volume: 0.6, loop: true, lazyLoad: true },

    // — BGS (Background Soundscapes) —
    { id: 'forest_ambience', path: 'assets/audio/bgs/forest_day.ogg', category: 'bgs', volume: 0.5, loop: true },
    { id: 'rain', path: 'assets/audio/bgs/rain.ogg', category: 'bgs', volume: 0.6, loop: true },

    // — Combat SFX —
    {
        id: 'swing',
        variants: [
            'assets/audio/sfx/sword_attack_1.wav',
            'assets/audio/sfx/sword_attack_2.wav',
            'assets/audio/sfx/sword_attack_3.wav',
        ],
        category: 'sfx',
        volume: 0.4,
        pitchVariance: 0.1,
    },
    {
        id: 'hit',
        variants: [
            'assets/audio/sfx/sword_impact_1.wav',
            'assets/audio/sfx/sword_impact_2.wav',
            'assets/audio/sfx/sword_impact_3.wav',
        ],
        category: 'sfx',
        volume: 0.5,
    },
    {
        id: 'bow_attack',
        variants: [
            'assets/audio/sfx/bow_attack_1.wav',
            'assets/audio/sfx/bow_attack_2.wav',
        ],
        category: 'sfx',
        volume: 0.4,
        pitchVariance: 0.1,
    },
    {
        id: 'bow_impact',
        variants: [
            'assets/audio/sfx/bow_impact_1.wav',
            'assets/audio/sfx/bow_impact_2.wav',
            'assets/audio/sfx/bow_impact_3.wav',
        ],
        category: 'sfx',
        volume: 0.45,
    },

    // — Movement SFX —
    {
        id: 'footstep',
        variants: [
            'assets/audio/sfx/dirt_run_1.wav',
            'assets/audio/sfx/dirt_run_2.wav',
            'assets/audio/sfx/dirt_run_3.wav',
            'assets/audio/sfx/dirt_run_4.wav',
            'assets/audio/sfx/dirt_run_5.wav',
        ],
        category: 'sfx',
        volume: 0.25,
        pitchVariance: 0.15,
    },

    // — Economy SFX —
    {
        id: 'coin_collect',
        variants: [
            'assets/audio/sfx/pop_1.wav',
            'assets/audio/sfx/pop_2.wav',
            'assets/audio/sfx/pop_3.wav',
            'assets/audio/sfx/glass_ping_small.wav',
        ],
        category: 'sfx',
        volume: 0.25,
        pitchVariance: 0.08,
    },

    // — UI —
    {
        id: 'ui_click',
        path: 'assets/audio/sfx/ui_click.wav',
        category: 'ui',
        volume: 0.3,
    },
    {
        id: 'weapon_pick_up',
        path: 'assets/audio/sfx/weapon_pick_up.wav',
        category: 'ui',
        volume: 0.4,
    },
    {
        id: 'paper_open',
        path: 'assets/audio/sfx/paper_move.wav',
        category: 'ui',
        volume: 0.8,
    },
    {
        id: 'paper_close',
        path: 'assets/audio/sfx/paper_move_reverse.wav',
        category: 'ui',
        volume: 0.8,
    },

    // — Spell SFX —
    { id: 'fireball_cast', path: 'assets/audio/sfx/fireball_cast.wav', category: 'sfx', volume: 0.5 },
    { id: 'fireball_hit', path: 'assets/audio/sfx/fireball_hit.wav', category: 'sfx', volume: 0.5 },
    { id: 'ice_throw', path: 'assets/audio/sfx/ice_throw.wav', category: 'sfx', volume: 0.5 },
    { id: 'ice_freeze', path: 'assets/audio/sfx/ice_freeze.wav', category: 'sfx', volume: 0.55, reverb: true },
    { id: 'frost_impact', path: 'assets/audio/sfx/frost_impact.wav', category: 'sfx', volume: 0.55 },
    { id: 'dash', path: 'assets/audio/sfx/whoosh_1.wav', category: 'sfx', volume: 1.0, pitchVariance: 0.1 },
    { id: 'upgrade_buy', path: 'assets/audio/sfx/coins_gather_quick.wav', category: 'sfx', volume: 0.5 },
    { id: 'page_turn', path: 'assets/audio/sfx/page_turn.wav', category: 'sfx', volume: 0.5 },
];

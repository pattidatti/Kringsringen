export type SoundCategory = 'bgm' | 'sfx' | 'ui';

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
}

export const AUDIO_MANIFEST: SoundConfig[] = [
    // — BGM —
    { id: 'meadow_theme', path: 'assets/audio/music/meadow_theme.mp3', category: 'bgm', volume: 0.5, loop: true },
    { id: 'exploration_theme', path: 'assets/audio/music/exploration_theme.mp3', category: 'bgm', volume: 0.5, loop: true },
    { id: 'dragons_fury', path: 'assets/audio/music/dragons_fury.mp3', category: 'bgm', volume: 0.6, loop: true },

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

    // — Economy SFX —
    {
        id: 'coin_collect',
        variants: [
            'assets/audio/sfx/coin_collect_1.wav',
            'assets/audio/sfx/coin_collect_2.wav',
        ],
        category: 'sfx',
        volume: 0.35,
        pitchVariance: 0.05,
    },

    // — UI —
    {
        id: 'ui_click',
        path: 'assets/audio/sfx/ui_click.wav',
        category: 'ui',
        volume: 0.3,
    },
];

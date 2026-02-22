export type SoundCategory = 'bgm' | 'sfx' | 'ui';

export type ZzFXParams = (number | undefined)[];

export interface SoundConfig {
    id: string;
    path?: string;
    zzfx?: ZzFXParams;
    category: SoundCategory;
    volume?: number;
    loop?: boolean;
    pitchVariance?: number;
}

export const AUDIO_MANIFEST: SoundConfig[] = [
    // Music
    {
        id: 'meadow_theme',
        path: 'assets/audio/music/meadow_theme.mp3',
        category: 'bgm',
        volume: 0.5,
        loop: true
    },
    {
        id: 'exploration_theme',
        path: 'assets/audio/music/exploration_theme.mp3',
        category: 'bgm',
        volume: 0.5,
        loop: true
    },
    {
        id: 'dragons_fury',
        path: 'assets/audio/music/dragons_fury.mp3',
        category: 'bgm',
        volume: 0.6,
        loop: true
    },

    // SFX - Procedural ZzFX sounds
    {
        id: 'hit',
        zzfx: [, , 129, .01, .1, .22, 1, 1.14, 9.9, , , , , , , , .15],
        category: 'sfx',
        volume: 0.4,
        pitchVariance: 0.15
    },
    {
        id: 'swing',
        zzfx: [, , 538, .02, .02, .22, 1, 1.59, , -4, 668, .06, .01, , , , .09, .67, .04],
        category: 'sfx',
        volume: 0.3,
        pitchVariance: 0.1
    },
    {
        id: 'coin_collect',
        zzfx: [, , 356, .01, .05, .18, 1, 1.49, , , , , , .6, , .1, , .75, .03],
        category: 'sfx',
        volume: 0.4,
        pitchVariance: 0.05
    },
    {
        id: 'ui_click',
        zzfx: [, , 90, .01, .02, .12, , 1.3, , , , , , , , .1, , .5, .01],
        category: 'ui',
        volume: 0.3
    }
];

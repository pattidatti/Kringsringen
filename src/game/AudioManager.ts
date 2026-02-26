import Phaser from 'phaser';
import { AUDIO_MANIFEST } from './AudioManifest';
import { SaveManager } from './SaveManager';

export interface AudioSettings {
    masterVolume: number;
    bgmVolume: number;
    sfxVolume: number;
    uiVolume: number;
    bgsVolume: number;
    isMuted: boolean;
}

/**
 * Premium Audio Manager for Kringsringen.
 * Handles sound categories, volume scaling, and pitch randomization.
 */
export class AudioManager {
    private static _instance: AudioManager;
    private scene: Phaser.Scene | null = null;
    private currentBGM: Phaser.Sound.BaseSound | null = null;
    private currentBGMId: string | null = null;
    private currentBGS: Phaser.Sound.BaseSound | null = null;
    private currentBGSId: string | null = null;
    private reverbNode: ConvolverNode | null = null;

    private settings: AudioSettings = {
        masterVolume: 1.0,
        bgmVolume: 0.8,
        sfxVolume: 1.0,
        uiVolume: 1.0,
        bgsVolume: 0.8,
        isMuted: false
    };

    private lastContextResumeAttempt: number = 0;

    private constructor() {
        // Load initial settings
        const saved = SaveManager.load();
        if (saved.audioSettings) {
            this.settings = { ...this.settings, ...saved.audioSettings };
        }
    }

    public static get instance(): AudioManager {
        if (!AudioManager._instance) {
            AudioManager._instance = new AudioManager();
        }
        return AudioManager._instance;
    }

    public setScene(scene: Phaser.Scene) {
        this.scene = scene;
        this.applySettings();
    }

    public preload(scene: Phaser.Scene) {
        // Load all non-lazy assets upfront
        AUDIO_MANIFEST.forEach(config => {
            if (config.lazyLoad) return; // Skip lazy-loaded assets

            if (config.path) {
                scene.load.audio(config.id, config.path);
            }
            if (config.variants) {
                config.variants.forEach((variantPath, i) => {
                    scene.load.audio(`${config.id}_${i}`, variantPath);
                });
            }
        });

        // Load one random BGM upfront despite lazyLoad flag
        this.loadRandomBGMUpfront(scene);
    }

    /**
     * Selects and loads one random BGM track during preload.
     */
    private loadRandomBGMUpfront(scene: Phaser.Scene) {
        const bgmTracks = AUDIO_MANIFEST.filter(c => c.category === 'bgm');
        if (bgmTracks.length === 0) return;

        const selected = bgmTracks[Math.floor(Math.random() * bgmTracks.length)];
        if (selected.path) {
            scene.load.audio(selected.id, selected.path);
        }
    }

    /**
     * Lazy-loads a BGM track if not already loaded, then plays it.
     * Called when playBGM is invoked with a track that isn't loaded yet.
     */
    public loadAndPlayBGM(id: string, fadeDuration: number = 1000) {
        if (!this.scene) return;

        const config = AUDIO_MANIFEST.find(c => c.id === id);
        if (!config || config.category !== 'bgm' || !config.path) return;

        // If already loaded, just play it
        if (this.scene.cache.audio.exists(id)) {
            this.playBGM(id, fadeDuration);
            return;
        }

        // Otherwise, lazy-load then play
        this.scene.load.audio(id, config.path);
        this.scene.load.once('complete', () => {
            this.playBGM(id, fadeDuration);
        });
        this.scene.load.start();
    }

    /**
     * Lazy-loads a BGS track if not already loaded, then plays it.
     * Called when playBGS is invoked with a track that isn't loaded yet.
     */
    public loadAndPlayBGS(id: string, fadeDuration: number = 1500) {
        if (!this.scene) return;

        const config = AUDIO_MANIFEST.find(c => c.id === id);
        if (!config || config.category !== 'bgs' || !config.path) return;

        // If already loaded, just play it
        if (this.scene.cache.audio.exists(id)) {
            this.playBGS(id, fadeDuration);
            return;
        }

        // Otherwise, lazy-load then play
        this.scene.load.audio(id, config.path);
        this.scene.load.once('complete', () => {
            this.playBGS(id, fadeDuration);
        });
        this.scene.load.start();
    }

    /**
     * Builds a synthetic reverb impulse response (0.6s exponential white-noise decay).
     * Called lazily the first time a reverb sound is played.
     */
    private buildReverbNode(): ConvolverNode | null {
        const soundManager = this.scene?.sound as Phaser.Sound.WebAudioSoundManager | undefined;
        const ctx = soundManager?.context;
        if (!ctx) return null;

        const sampleRate = ctx.sampleRate;
        const duration = 0.6; // seconds
        const length = Math.floor(sampleRate * duration);
        const impulse = ctx.createBuffer(2, length, sampleRate);

        for (let ch = 0; ch < 2; ch++) {
            const data = impulse.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
            }
        }

        const convolver = ctx.createConvolver();
        convolver.buffer = impulse;
        return convolver;
    }

    /**
     * Plays a sound effect with optional pitch randomization and reverb.
     */
    public playSFX(id: string, options: { volume?: number, pitch?: number } = {}) {
        if (!this.scene || this.settings.isMuted) return;

        const config = AUDIO_MANIFEST.find(c => c.id === id);
        if (!config || config.category === 'bgm') return;

        // Resolve sound key: pick random variant or use base id
        let soundKey = id;
        if (config.variants && config.variants.length > 0) {
            const idx = Math.floor(Math.random() * config.variants.length);
            soundKey = `${id}_${idx}`;
        }

        if (!this.scene.cache.audio.exists(soundKey)) {
            console.warn(`[AudioManager] Sound not found: ${soundKey}`);
            return;
        }

        const baseVolume = (options.volume !== undefined ? options.volume : (config.volume || 1.0));
        const categoryVolume = config.category === 'ui' ? this.settings.uiVolume : this.settings.sfxVolume;
        const finalVolume = baseVolume * categoryVolume * this.settings.masterVolume;

        let pitch = options.pitch || 1.0;
        if (config.pitchVariance) {
            pitch += (Math.random() * 2 - 1) * config.pitchVariance;
        }

        if (config.reverb) {
            // Use Web Audio API directly for reverb effect
            const soundManager = this.scene.sound as Phaser.Sound.WebAudioSoundManager;
            const ctx = soundManager?.context;
            if (ctx) {
                if (!this.reverbNode) {
                    this.reverbNode = this.buildReverbNode();
                }
                if (this.reverbNode) {
                    const source = ctx.createBufferSource();
                    const audioBuffer = this.scene.cache.audio.get(soundKey) as AudioBuffer;
                    if (!audioBuffer) return;

                    source.buffer = audioBuffer;
                    source.detune.value = (pitch - 1) * 1200;

                    const gainDry = ctx.createGain();
                    gainDry.gain.value = finalVolume * 0.6;

                    const gainWet = ctx.createGain();
                    gainWet.gain.value = finalVolume * 0.45;

                    source.connect(gainDry);
                    gainDry.connect(ctx.destination);

                    source.connect(this.reverbNode);
                    this.reverbNode.connect(gainWet);
                    gainWet.connect(ctx.destination);

                    source.start(0);
                    return;
                }
            }
        }

        this.scene.sound.play(soundKey, {
            volume: finalVolume,
            detune: (pitch - 1) * 1200
        });
    }

    /**
     * Plays/Transistions background music with cross-fade.
     * If the track is lazy-loaded and not yet in cache, it will be loaded on demand.
     */
    public playBGM(id: string, fadeDuration: number = 1000) {
        if (!this.scene || this.currentBGMId === id) return;

        const config = AUDIO_MANIFEST.find(c => c.id === id);
        if (!config || config.category !== 'bgm') return;

        // If not loaded yet and marked as lazy, trigger lazy-load
        if (!this.scene.cache.audio.exists(id) && config.lazyLoad) {
            this.loadAndPlayBGM(id, fadeDuration);
            return;
        }

        if (!this.scene.cache.audio.exists(id)) {
            console.warn(`[AudioManager] Music not found in cache: ${id}`);
            return;
        }

        const finalVolume = (config.volume || 1.0) * this.settings.bgmVolume * this.settings.masterVolume;

        // Fade out current BGM
        if (this.currentBGM) {
            const oldBGM = this.currentBGM;
            this.scene.tweens.add({
                targets: oldBGM,
                volume: 0,
                duration: fadeDuration,
                onComplete: () => oldBGM.stop()
            });
        }

        // Start new BGM
        this.currentBGM = this.scene.sound.add(id, { loop: true, volume: 0 });
        this.currentBGMId = id;
        this.currentBGM.play();

        this.scene.tweens.add({
            targets: this.currentBGM,
            volume: finalVolume,
            duration: fadeDuration
        });
    }

    /**
     * Plays/Transitions a background soundscape (ambience) independently of BGM.
     * If the track is lazy-loaded and not yet in cache, it will be loaded on demand.
     */
    public playBGS(id: string, fadeDuration: number = 1500) {
        if (!this.scene || this.currentBGSId === id) return;

        const config = AUDIO_MANIFEST.find(c => c.id === id);
        if (!config || config.category !== 'bgs') return;

        // If not loaded yet and marked as lazy, trigger lazy-load
        if (!this.scene.cache.audio.exists(id) && config.lazyLoad) {
            this.loadAndPlayBGS(id, fadeDuration);
            return;
        }

        if (!this.scene.cache.audio.exists(id)) {
            console.warn(`[AudioManager] BGS not found in cache: ${id}`);
            return;
        }

        const finalVolume = (config.volume || 0.3) * this.settings.bgsVolume * this.settings.masterVolume;

        // Fade out current BGS
        if (this.currentBGS) {
            const oldBGS = this.currentBGS;
            this.scene.tweens.add({
                targets: oldBGS,
                volume: 0,
                duration: fadeDuration,
                onComplete: () => oldBGS.stop()
            });
        }

        // Start new BGS
        this.currentBGS = this.scene.sound.add(id, { loop: true, volume: 0 });
        this.currentBGSId = id;
        this.currentBGS.play();

        this.scene.tweens.add({
            targets: this.currentBGS,
            volume: finalVolume,
            duration: fadeDuration
        });
    }

    public setVolume(category: keyof AudioSettings, value: number) {
        if (typeof value !== 'number') return;

        (this.settings as any)[category] = Phaser.Math.Clamp(value, 0, 1);
        this.applySettings();
        this.saveSettings();
    }

    public toggleMute() {
        this.settings.isMuted = !this.settings.isMuted;
        this.applySettings();
        this.saveSettings();
    }

    private applySettings() {
        if (!this.scene) return;

        this.scene.sound.mute = this.settings.isMuted;
        this.scene.sound.volume = this.settings.masterVolume;

        // Update current BGM volume
        if (this.currentBGM && this.currentBGMId) {
            const config = AUDIO_MANIFEST.find(c => c.id === this.currentBGMId);
            const baseVol = config?.volume || 1.0;
            (this.currentBGM as any).volume = baseVol * this.settings.bgmVolume * this.settings.masterVolume;
        }

        // Update current BGS volume
        if (this.currentBGS && this.currentBGSId) {
            const config = AUDIO_MANIFEST.find(c => c.id === this.currentBGSId);
            const baseVol = config?.volume || 0.3;
            (this.currentBGS as any).volume = baseVol * this.settings.bgsVolume * this.settings.masterVolume;
        }
    }

    private saveSettings() {
        SaveManager.save({ audioSettings: this.settings });
    }

    /**
     * Utility to resume audio context on user interaction if needed
     */
    public async resumeContext() {
        if (!this.scene || !this.scene.sound) return;

        const now = Date.now();
        if (now - this.lastContextResumeAttempt < 1000) return;

        this.lastContextResumeAttempt = now;

        // Cast to WebAudioSoundManager to access context safely
        const soundManager = this.scene.sound as Phaser.Sound.WebAudioSoundManager;
        if (soundManager.context && soundManager.context.state === 'suspended') {
            await soundManager.context.resume();
        }
    }
}

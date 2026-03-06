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
    private _bgmFading: boolean = false;
    private _bgsFading: boolean = false;
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
    private volumeChangeListeners: Array<() => void> = [];

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

    public addVolumeChangeListener(cb: () => void): () => void {
        this.volumeChangeListeners.push(cb);
        return () => {
            this.volumeChangeListeners = this.volumeChangeListeners.filter(l => l !== cb);
        };
    }

    public getEffectiveBGSVolume(baseVolume: number): number {
        if (this.settings.isMuted) return 0;
        return baseVolume * this.settings.bgsVolume * this.settings.masterVolume;
    }

    public setScene(scene: Phaser.Scene) {
        this.scene = scene;
        this.applySettings();
    }

    public clearScene() {
        console.log('[AudioManager] Cleaning up scene context and clearing pending loader events.');
        if (this.scene) {
            this.scene.load.off('complete'); // Remove all pending 'complete' listeners from this manager's scope
        }
        this.scene = null;
        this.currentBGM = null;
        this.currentBGS = null;
        this.currentBGMId = null;
        this.currentBGSId = null;
        this.reverbNode = null;
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

        // Otherwise, lazy-load then play safely
        console.log(`[AudioManager] Lazy-loading BGM: ${id}`);
        this.scene.load.audio(id, config.path);

        // Use a one-time event that checks if the scene is still valid before firing
        const currentScene = this.scene;
        currentScene.load.once('complete', () => {
            if (this.scene === currentScene && this.scene.cache.audio.exists(id)) {
                this.playBGM(id, fadeDuration);
            }
        });

        // IMPORTANT: Only start the loader if it's not already loading, 
        // to avoid corrupting the queue during a scene transition.
        if (!currentScene.load.isLoading()) {
            currentScene.load.start();
        }
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

        // Otherwise, lazy-load then play safely
        console.log(`[AudioManager] Lazy-loading BGS: ${id}`);
        this.scene.load.audio(id, config.path);

        const currentScene = this.scene;
        currentScene.load.once('complete', () => {
            if (this.scene === currentScene && this.scene.cache.audio.exists(id)) {
                this.playBGS(id, fadeDuration);
            }
        });

        if (!currentScene.load.isLoading()) {
            currentScene.load.start();
        }
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
                // If we have a reverb node but it's from a different context, reset it
                if (this.reverbNode && (this.reverbNode as any).context !== ctx) {
                    console.warn('[AudioManager] Detected stale reverb node from previous context. Resetting.');
                    this.reverbNode = null;
                }

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
     * Scene-independent audio fader to ensure fades don't get stuck if the Phaser scene is paused.
     */
    private manualFade(sound: Phaser.Sound.BaseSound, targetVolume: number, duration: number, onComplete?: () => void) {
        const startVolume = (sound as any).volume || 0;
        const startTime = Date.now();

        // Ensure duration is positive to avoid divide by zero
        if (duration <= 0) {
            try { (sound as any).volume = targetVolume; } catch (e) { }
            if (onComplete) onComplete();
            return;
        }

        const interval = setInterval(() => {
            try {
                if (!sound || (sound as any).pendingRemove || (sound as any).isDestroyed) {
                    clearInterval(interval);
                    if (onComplete) onComplete();
                    return;
                }

                const elapsed = Date.now() - startTime;
                if (elapsed >= duration) {
                    (sound as any).volume = targetVolume;
                    clearInterval(interval);
                    if (onComplete) onComplete();
                    return;
                }

                const progress = elapsed / duration;
                (sound as any).volume = startVolume + (targetVolume - startVolume) * progress;
            } catch (e) {
                console.warn('[AudioManager] manualFade interrupted due to destroyed sound object.', e);
                clearInterval(interval);
                if (onComplete) onComplete();
            }
        }, 50); // 20hz update rate
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
            this.manualFade(oldBGM, 0, fadeDuration, () => {
                try { oldBGM.stop(); } catch (e) { }
            });
        }

        // Start new BGM
        this.currentBGM = this.scene.sound.add(id, { loop: true, volume: 0 });
        this.currentBGMId = id;
        this.currentBGM.play();

        this._bgmFading = true;
        this.manualFade(this.currentBGM, finalVolume, fadeDuration, () => {
            this._bgmFading = false;
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
            this.manualFade(oldBGS, 0, fadeDuration, () => {
                try { oldBGS.stop(); } catch (e) { }
            });
        }

        // Start new BGS
        this.currentBGS = this.scene.sound.add(id, { loop: true, volume: 0 });
        this.currentBGSId = id;
        this.currentBGS.play();

        this._bgsFading = true;
        this.manualFade(this.currentBGS, finalVolume, fadeDuration, () => {
            this._bgsFading = false;
        });
    }

    /**
     * Fades out and stops all currently playing BGM and BGS.
     * Returns a promise that resolves when the fade is complete, 
     * or after a timeout to ensure progression.
     */
    public fadeOutAndStopAll(duration: number = 1000): Promise<void> {
        return new Promise((resolve) => {
            if (!this.scene) {
                resolve();
                return;
            }

            let completedTweens = 0;
            let expectedTweens = 0;

            const onComplete = () => {
                completedTweens++;
                if (completedTweens >= expectedTweens) {
                    resolve();
                }
            };

            if (this.currentBGM) {
                expectedTweens++;
                const oldBGM = this.currentBGM;
                this.manualFade(oldBGM, 0, duration, () => {
                    try { oldBGM.stop(); } catch (e) { }
                    onComplete();
                });
                this.currentBGM = null;
                this.currentBGMId = null;
            }

            if (this.currentBGS) {
                expectedTweens++;
                const oldBGS = this.currentBGS;
                this.manualFade(oldBGS, 0, duration, () => {
                    try { oldBGS.stop(); } catch (e) { }
                    onComplete();
                });
                this.currentBGS = null;
                this.currentBGSId = null;
            }

            if (expectedTweens === 0) {
                resolve();
                return;
            }
        });
    }

    public setVolume(category: keyof AudioSettings, value: number) {
        if (typeof value !== 'number') return;

        (this.settings as any)[category] = Phaser.Math.Clamp(value, 0, 1);
        this.applySettings();
        this.saveSettings();
        this.volumeChangeListeners.forEach(l => l());
    }

    public toggleMute() {
        this.settings.isMuted = !this.settings.isMuted;
        this.applySettings();
        this.saveSettings();
        this.volumeChangeListeners.forEach(l => l());
    }

    private applySettings() {
        if (!this.scene) return;

        this.scene.sound.mute = this.settings.isMuted;
        this.scene.sound.volume = this.settings.masterVolume;

        // Update current BGM volume (skip if a fade-in is in progress to avoid clobbering it)
        if (this.currentBGM && this.currentBGMId && !this._bgmFading) {
            const config = AUDIO_MANIFEST.find(c => c.id === this.currentBGMId);
            const baseVol = config?.volume || 1.0;
            (this.currentBGM as any).volume = baseVol * this.settings.bgmVolume * this.settings.masterVolume;
        }

        // Update current BGS volume (skip if a fade-in is in progress to avoid clobbering it)
        if (this.currentBGS && this.currentBGSId && !this._bgsFading) {
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

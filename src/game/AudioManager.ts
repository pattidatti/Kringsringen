import Phaser from 'phaser';
import { AUDIO_MANIFEST } from './AudioManifest';
import { SaveManager } from './SaveManager';

export interface AudioSettings {
    masterVolume: number;
    bgmVolume: number;
    sfxVolume: number;
    uiVolume: number;
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

    private settings: AudioSettings = {
        masterVolume: 1.0,
        bgmVolume: 0.8,
        sfxVolume: 1.0,
        uiVolume: 1.0,
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
        this.renderAllProceduralSounds();
    }

    public preload(scene: Phaser.Scene) {
        AUDIO_MANIFEST.forEach(config => {
            if (config.path && config.path.endsWith('.mp3')) {
                scene.load.audio(config.id, config.path);
            }
        });
    }

    /**
     * Pre-renders all ZzFX params in the manifest into Phaser AudioBuffers
     */
    private renderAllProceduralSounds() {
        if (!this.scene) return;
        const soundManager = this.scene.sound as Phaser.Sound.WebAudioSoundManager;
        const context = soundManager.context;

        AUDIO_MANIFEST.forEach(config => {
            if (config.zzfx) {
                const buffer = this.createZzFXBuffer(context, config.zzfx);
                this.scene!.cache.audio.add(config.id, buffer);
            }
        });
    }

    private createZzFXBuffer(context: AudioContext, params: (number | undefined)[]): AudioBuffer {
        const [
            volume_ = 1, randomness = .05, frequency = 220, attack = 0, sustain = 0,
            release = .1, shape = 0, , ,
            , noise = 0, deltaSlide = 0,
            , , ,
            , , sustainVolume = 1,
            decay = 0
        ] = params;

        const sampleRate = 44100;
        const adsrAttack = attack * sampleRate;
        const adsrSustain = sustain * sampleRate;
        const adsrRelease = release * sampleRate;
        const adsrDecay = decay * sampleRate;
        const length = adsrAttack + adsrDecay + adsrSustain + adsrRelease;

        const buffer = context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        let s = 0, f = frequency, v = volume_, j = 0;
        for (let i = 0; i < length; i++) {
            if (j++ > randomness * sampleRate) {
                j = 0;
                s = (Math.random() * 2 - 1) * noise;
            }

            const env = i < adsrAttack ? i / adsrAttack :
                i < adsrAttack + adsrDecay ? 1 - ((i - adsrAttack) / adsrDecay) * (1 - sustainVolume) :
                    i < adsrAttack + adsrDecay + adsrSustain ? sustainVolume :
                        Math.max(0, sustainVolume * (1 - (i - adsrAttack - adsrDecay - adsrSustain) / adsrRelease));

            f += deltaSlide;
            const phase = 2 * Math.PI * f * i / sampleRate;
            let val = 0;

            if (shape === 0) val = Math.sin(phase);
            else if (shape === 1) val = Math.sin(phase) > 0 ? 1 : -1;
            else if (shape === 2) val = 1 - (phase % (2 * Math.PI)) / Math.PI;
            else val = Math.random() * 2 - 1;

            data[i] = (val + s) * env * v;
        }

        return buffer;
    }

    /**
     * Plays a sound effect with optional pitch randomization.
     */
    public playSFX(id: string, options: { volume?: number, pitch?: number } = {}) {
        if (!this.scene || this.settings.isMuted) return;

        const config = AUDIO_MANIFEST.find(c => c.id === id);
        if (!config || config.category === 'bgm') return;

        if (!this.scene.cache.audio.exists(id)) {
            console.warn(`[AudioManager] Sound not found in cache: ${id}`);
            return;
        }

        const baseVolume = (options.volume !== undefined ? options.volume : (config.volume || 1.0));
        const categoryVolume = config.category === 'ui' ? this.settings.uiVolume : this.settings.sfxVolume;
        const finalVolume = baseVolume * categoryVolume * this.settings.masterVolume;

        let pitch = options.pitch || 1.0;
        if (config.pitchVariance) {
            pitch += (Math.random() * 2 - 1) * config.pitchVariance;
        }

        this.scene.sound.play(id, {
            volume: finalVolume,
            detune: (pitch - 1) * 1200
        });
    }

    /**
     * Plays/Transistions background music with cross-fade.
     */
    public playBGM(id: string, fadeDuration: number = 1000) {
        if (!this.scene || this.currentBGMId === id) return;

        const config = AUDIO_MANIFEST.find(c => c.id === id);
        if (!config || config.category !== 'bgm') return;

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

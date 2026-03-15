import Phaser from 'phaser';

const fragShader = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform float uIntensity;

varying vec2 outTexCoord;

void main() {
    vec4 color = texture2D(uMainSampler, outTexCoord);

    // Aspect-corrected distance from screen center (player is always centered)
    vec2 diff = outTexCoord - vec2(0.5);
    if (uResolution.y > 0.0) {
        diff.x *= uResolution.x / uResolution.y;
    }
    float dist = length(diff);

    // Cubic falloff with division-by-zero guard
    float range = uOuterRadius - uInnerRadius;
    float t = range > 0.001 ? clamp((dist - uInnerRadius) / range, 0.0, 1.0) : 0.0;
    float darkness = t * t * uIntensity;

    gl_FragColor = vec4(color.rgb * (1.0 - darkness), color.a);
}
`;

export class DarknessPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    // Store values as properties — applied in onPreRender when shader is bound
    private _innerRadius = 0.06;
    private _outerRadius = 0.55;
    private _intensity = 0.95;

    constructor(game: Phaser.Game) {
        super({
            game,
            name: 'DarknessPostFX',
            fragShader,
        });
    }

    onPreRender(): void {
        // Set ALL uniforms here — this is the only safe place (shader is bound)
        this.set1f('uInnerRadius', this._innerRadius);
        this.set1f('uOuterRadius', this._outerRadius);
        this.set1f('uIntensity', this._intensity);

        // Get resolution from the active MainScene camera
        const cam = this.renderer?.game?.scene?.getScene('MainScene')?.cameras?.main;
        if (cam) {
            this.set2f('uResolution', cam.width, cam.height);
        } else {
            // Safe fallback — prevents NaN in aspect ratio calc
            this.set2f('uResolution', 1920, 1080);
        }
    }

    setDarkness(innerRadius: number, outerRadius: number, intensity: number): this {
        this._innerRadius = innerRadius;
        this._outerRadius = outerRadius;
        this._intensity = intensity;
        return this;
    }
}

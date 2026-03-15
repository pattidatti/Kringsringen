import Phaser from 'phaser';

const MAX_LIGHTS = 12;

const fragShader = `
precision mediump float;

#define MAX_LIGHTS 12

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform float uIntensity;

// Dynamic point lights (projectiles, enemy attacks, etc.)
uniform int uNumLights;
uniform vec2 uLightPositions[MAX_LIGHTS];   // screen UV (0-1)
uniform float uLightRadii[MAX_LIGHTS];      // in UV space
uniform float uLightIntensities[MAX_LIGHTS];

varying vec2 outTexCoord;

void main() {
    vec4 color = texture2D(uMainSampler, outTexCoord);

    // Aspect ratio
    float aspect = uResolution.y > 0.0 ? uResolution.x / uResolution.y : 1.0;

    // Aspect-corrected UV position of this pixel
    vec2 pixelAC = vec2((outTexCoord.x - 0.5) * aspect, outTexCoord.y - 0.5);

    // --- Player darkness (centered on screen) ---
    float dist = length(pixelAC);
    float range = uOuterRadius - uInnerRadius;
    float t = range > 0.001 ? clamp((dist - uInnerRadius) / range, 0.0, 1.0) : 0.0;
    float darkness = pow(t, 0.8) * uIntensity;

    // --- Point lights reduce darkness ---
    float lightContrib = 0.0;
    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= uNumLights) break;
        vec2 lightAC = vec2((uLightPositions[i].x - 0.5) * aspect, uLightPositions[i].y - 0.5);
        float lDist = length(pixelAC - lightAC);
        float lRadius = uLightRadii[i];
        if (lRadius > 0.001 && lDist < lRadius) {
            float falloff = 1.0 - (lDist / lRadius);
            lightContrib += falloff * falloff * uLightIntensities[i];
        }
    }
    lightContrib = clamp(lightContrib, 0.0, 1.0);
    darkness *= (1.0 - lightContrib);

    gl_FragColor = vec4(color.rgb * (1.0 - darkness), color.a);
}
`;

/** A tracked light in the shader array. */
export interface ShaderLight {
    _id: number;
    x: number;      // world X
    y: number;      // world Y
    radius: number;  // world pixels
    intensity: number;
    color: number;   // kept for API compat (not used in shader)
}

export class DarknessPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    // Player darkness parameters
    private _innerRadius = 0.0;
    private _outerRadius = 0.30;
    private _intensity = 0.95;

    // Dynamic point lights
    private _lights: Map<number, ShaderLight> = new Map();
    private _nextId = 1;

    constructor(game: Phaser.Game) {
        super({
            game,
            name: 'DarknessPostFX',
            fragShader,
        });
    }

    onPreRender(): void {
        // Player darkness uniforms
        this.set1f('uInnerRadius', this._innerRadius);
        this.set1f('uOuterRadius', this._outerRadius);
        this.set1f('uIntensity', this._intensity);

        // Resolution
        const cam = this.renderer?.game?.scene?.getScene('MainScene')?.cameras?.main;
        const w = cam?.width ?? 1920;
        const h = cam?.height ?? 1080;
        this.set2f('uResolution', w, h);

        // Convert world-space lights to screen UV and upload
        const numLights = Math.min(this._lights.size, MAX_LIGHTS);
        this.set1i('uNumLights', numLights);

        if (numLights > 0 && cam) {
            const zoom = cam.zoom;
            let i = 0;
            this._lights.forEach(light => {
                if (i >= MAX_LIGHTS) return;
                // World → screen UV (0-1)
                const screenU = (light.x - cam.scrollX) * zoom / w;
                const screenV = (light.y - cam.scrollY) * zoom / h;
                // Radius in UV space (use width as reference, aspect correction in shader)
                const uvRadius = (light.radius * zoom) / w;

                this.set2f(`uLightPositions[${i}]`, screenU, screenV);
                this.set1f(`uLightRadii[${i}]`, uvRadius);
                this.set1f(`uLightIntensities[${i}]`, Math.min(light.intensity, 1.0));
                i++;
            });
        }
    }

    // --- Player darkness API ---

    setDarkness(innerRadius: number, outerRadius: number, intensity: number): this {
        this._innerRadius = innerRadius;
        this._outerRadius = outerRadius;
        this._intensity = intensity;
        return this;
    }

    // --- Point light API ---

    addLight(x: number, y: number, radius: number, color: number, intensity: number): ShaderLight {
        const light: ShaderLight = { _id: this._nextId++, x, y, radius, intensity, color };
        this._lights.set(light._id, light);
        return light;
    }

    removeLight(light: ShaderLight): void {
        this._lights.delete(light._id);
    }

    get lightCount(): number {
        return this._lights.size;
    }

    get maxLights(): number {
        return MAX_LIGHTS;
    }
}

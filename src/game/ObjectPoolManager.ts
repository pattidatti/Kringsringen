
export class ObjectPoolManager {
    private scene: Phaser.Scene;
    private damageTextPool: Phaser.GameObjects.Text[] = [];
    private bloodPool: Phaser.GameObjects.Sprite[] = [];

    // Config
    private readonly MAX_TEXT_POOL = 50;
    private readonly MAX_BLOOD_POOL = 50;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public getDamageText(x: number, y: number, amount: number): Phaser.GameObjects.Text {
        let text: Phaser.GameObjects.Text;

        if (this.damageTextPool.length > 0) {
            text = this.damageTextPool.pop()!;
            text.setText(Math.round(amount).toString());
            text.setPosition(x, y);
            text.setActive(true);
            text.setVisible(true);
            text.setAlpha(1);
            text.setScale(1);
        } else {
            text = this.scene.add.text(x, y, Math.round(amount).toString(), {
                fontSize: '20px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            text.setDepth(2000); // Ensure high depth
        }

        // Animation
        this.scene.tweens.add({
            targets: text,
            y: y - 80,
            alpha: 0,
            duration: 600,
            ease: 'Cubic.out',
            onComplete: () => {
                this.returnDamageText(text);
            }
        });

        return text;
    }

    private returnDamageText(text: Phaser.GameObjects.Text) {
        if (this.damageTextPool.length < this.MAX_TEXT_POOL) {
            text.setActive(false);
            text.setVisible(false);
            this.damageTextPool.push(text);
        } else {
            text.destroy();
        }
    }

    public spawnBloodEffect(x: number, y: number) {
        let blood: Phaser.GameObjects.Sprite;
        const bloodKey = `blood_${Phaser.Math.Between(1, 5)}`;

        if (this.bloodPool.length > 0) {
            blood = this.bloodPool.pop()!;
            blood.setTexture(bloodKey);
            blood.setPosition(x, y);
            blood.setActive(true);
            blood.setVisible(true);
            blood.setAlpha(1);
            blood.setScale(1.5);
        } else {
            blood = this.scene.add.sprite(x, y, bloodKey);
            blood.setScale(1.5);
        }

        blood.play(bloodKey);
        blood.once('animationcomplete', () => {
            this.returnBlood(blood);
        });
    }

    private returnBlood(blood: Phaser.GameObjects.Sprite) {
        if (this.bloodPool.length < this.MAX_BLOOD_POOL) {
            blood.setActive(false);
            blood.setVisible(false);
            this.bloodPool.push(blood);
        } else {
            blood.destroy();
        }
    }
}

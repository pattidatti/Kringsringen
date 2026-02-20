const fs = require('fs');
const file = 'src/game/main.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `    private flushEconomy() {
        if (!this.scene.isActive()) return;

        // Flush Coins
        if (this.pendingEconomy.coins > 0) {
            let coins = this.registry.get('playerCoins') || 0;
            coins += this.pendingEconomy.coins;
            this.registry.set('playerCoins', coins);

            // Optional: Too frequent saves can stutter. We should use larger intervals.
            // Currently saving every logic tick where coins cross 10s... Let's just limit.
            if (coins % 10 === 0) {
                SaveManager.save({ coins });
            }

            this.pendingEconomy.coins = 0;
        }

        // Flush XP
        if (this.pendingEconomy.xp > 0) {
            let xp = this.registry.get('playerXP');
            let maxXp = this.registry.get('playerMaxXP');
            let level = this.registry.get('playerLevel');

            xp += this.pendingEconomy.xp;
            
            // Handle massive XP gains blowing past multiple levels
            while (xp >= maxXp) {
                xp -= maxXp;
                level++;
                maxXp = Math.floor(maxXp * 1.2);

                this.registry.set('playerLevel', level);
                this.registry.set('playerMaxXP', maxXp);
                this.events.emit('level-up');
            }

            this.registry.set('playerXP', xp);
            this.pendingEconomy.xp = 0;
        }
    }`;

const replacement = `    private flushEconomy() {
        if (!this.scene.isActive()) return;

        // Flush Coins
        if (this.pendingEconomy.coins > 0) {
            let coins = this.registry.get('playerCoins') || 0;
            coins += this.pendingEconomy.coins;
            this.registry.set('playerCoins', coins);

            // Save less frequently to avoid disk IO stutter
            if (coins % 10 === 0) {
                SaveManager.save({ coins });
            }

            this.pendingEconomy.coins = 0;
        }

        // Flush XP
        if (this.pendingEconomy.xp > 0) {
            let xp = this.registry.get('playerXP');
            let maxXp = this.registry.get('playerMaxXP');
            let level = this.registry.get('playerLevel');

            xp += this.pendingEconomy.xp;
            this.pendingEconomy.xp = 0; // Clear it early to allow putting excess back
            
            // "The Cascade Fix": Only process ONE level up per flush.
            // If the player gained enough XP to level up twice in 50ms, 
            // the excess is put back in pending to be processed AFTER the scene unpauses.
            if (xp >= maxXp) {
                const excess = xp - maxXp;
                level++;
                maxXp = Math.floor(maxXp * 1.2);

                this.registry.set('playerLevel', level);
                this.registry.set('playerMaxXP', maxXp);
                this.registry.set('playerXP', 0); // Visually reset to 0 while leveling up
                
                // Queue the rest for the next flush cycle
                this.pendingEconomy.xp += excess;
                this.events.emit('level-up');
            } else {
                this.registry.set('playerXP', xp);
            }
        }
    }`;

code = code.replace(target, replacement);
fs.writeFileSync(file, code);
console.log('Patched economy edge case successfully.');

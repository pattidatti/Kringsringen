# CLASS SYSTEM DESIGN DOCUMENT

## 1. VISION

Introduce a **class system** where players choose between **Melee (Krieger), Ranged (Archer), or Magic (Wizard)** at game start. Each class has:
- Unique upgrade shop (left page categories and available upgrades)
- Customized stat progression
- Distinct playstyle identity
- Access to exclusive high-level upgrades that promote class fantasy

---

## 2. CLASS DEFINITIONS

### CLASS 1: KRIEGER (Melee Warrior)
**Identity:** Close-range damage dealer, tanky, high knockback
**Starting Stats:**
- Base HP: +30% (heavily armored)
- Base Damage: +20% (strong melee)
- Base Speed: -10% (slower, heavy)
- Base Armor: +2 (natural protection)

**Starting Weapon:** Sword
**Class Ability:** Whirlwind Slash (chain cleave to nearby enemies)

**Shop Left Categories:**
1. **Ønsket** (Desired) - Class-exclusive high-level upgrades
2. **Karakterforbedring** (Character) - Base stats
3. **Sverdkraft** (Blade Mastery) - Melee weapon focus
4. **Raskultur** (Battle Techniques) - Special melee abilities
5. **Panser** (Armor/Defense) - Defensive synergies

**Sample Class-Exclusive Upgrades:**
- Utstøtbar Slag (Knockback chains enemies into each other)
- Blodust (Damage enemies who hit you)
- Skadeskalering (Bonus damage based on armor level)
- Livstaling (Heal when defeating enemies)

---

### CLASS 2: ARCHER (Ranged Specialist)
**Identity:** Precision damage, mobile, arrow control
**Starting Stats:**
- Base HP: -10% (fragile)
- Base Damage: +15% (skilled aim)
- Base Speed: +25% (agile, mobile)
- Base Attack Speed: +15% (quick shots)

**Starting Weapon:** Bow
**Class Ability:** Multishot Barrage (rapid fire burst)

**Shop Left Categories:**
1. **Ønsket** (Desired) - Class-exclusive high-level upgrades
2. **Karakterforbedring** (Character) - Base stats
3. **Buekunst** (Archery Mastery) - Arrow focus
4. **Pilteknikker** (Arrow Techniques) - Precision abilities
5. **Mobilitet** (Mobility) - Speed and dodge synergies

**Sample Class-Exclusive Upgrades:**
- Rikosjett (Arrows bounce off walls/enemies)
- Luftmobilitet (Extra dash charges)
- Fokusert skudd (Charge shots deal massive damage)
- Skuddkaskade (Defeating enemies spawns extra arrows)

---

### CLASS 3: WIZARD (Magic User)
**Identity:** Area control, elemental mastery, utility
**Starting Stats:**
- Base HP: -20% (fragile)
- Base Damage: +25% (powerful spells)
- Base Mana Regen: +50% (faster spell cooldown)
- Base Attack Speed: +10% (quicker casting)

**Starting Weapon:** Fireball
**Class Ability:** Elemental Cascade (trigger chain reactions between spell types)

**Shop Left Categories:**
1. **Ønsket** (Desired) - Class-exclusive high-level upgrades
2. **Karakterforbedring** (Character) - Base stats
3. **Trolldommekunst** (Elemental Magic) - All spells
4. **Magisk Synergi** (Magic Synergy) - Spell interactions
5. **Essoter** (Arcane Secrets) - Advanced techniques

**Sample Class-Exclusive Upgrades:**
- Elementær Overflod (Using one spell boosts damage of others)
- Magisk Nullifikasjon (Spells cancel enemy projectiles)
- Manaring (Mana shield, spells reduce incoming damage)
- Massiv Eksplosjon (Spells hit larger areas)

---

## 3. SHOP CUSTOMIZATION MODEL

### Current System
- **5 Categories (hardcoded):** Karakter, Sverd, Bue, Magi, Synergi
- **73 Upgrades (all available regardless of build)**
- **No filtering or organization by playstyle**

### New Approach: CLASS-FILTERED UPGRADE POOL

**Upgrade Pool Composition:**
```
SHARED UPGRADES (~15-20 upgrades)
├── Karakterforbedring category:
│   ├── Vitalitet, Lynrask, Trollblod, Jernhud
│   ├── Vindstøt, Lynskritt, Blodsug
│   └── [All 7 current base stat upgrades stay + maybe 1-2 new universal ones]
└── Available to ALL classes

CLASS-EXCLUSIVE UPGRADES (~20-30 per class = 60-90 total)
├── KRIEGER EXCLUSIVE (20-30):
│   ├── Sverdkraft category: Melee weapon upgrades
│   ├── Raskultur category: Battle technique synergies
│   ├── Panser category: Armor/Defense synergies
│   └── Ønsket category: Legendary Krieger upgrades + Whirlwind Slash ability levels
├── ARCHER EXCLUSIVE (20-30):
│   ├── Buekunst category: Archery weapon upgrades (modified from current)
│   ├── Pilteknikker category: Precision techniques
│   ├── Mobilitet category: Movement synergies
│   └── Ønsket category: Legendary Archer upgrades + Explosive Shot ability levels
└── WIZARD EXCLUSIVE (20-30):
    ├── Trolldommekunst category: Elemental magic upgrades (modified from current)
    ├── Magisk Synergi category: Cross-spell interactions
    ├── Essoter category: Arcane secrets
    └── Ønsket category: Legendary Wizard upgrades + Elemental Cascade ability levels

REMOVED/REDESIGNED
├── Old "Bue" upgrades (some moved to Archer, others removed)
├── Old "Sverd" upgrades (some moved to Krieger, others removed)
├── Old "Magi" upgrades (some moved to Wizard, others removed)
└── Overlapping synergies from "Synergi" (split into class-specific versions)
```

**Example Upgrade Distribution:**
```
TOTAL UPGRADES: ~90-110

Krieger Sees:
├── Shared (15): Karakterforbedring
├── Exclusive (25): Ønsket, Sverdkraft, Raskultur, Panser
└── Total: 40 available

Archer Sees:
├── Shared (15): Karakterforbedring
├── Exclusive (25): Ønsket, Buekunst, Pilteknikker, Mobilitet
└── Total: 40 available

Wizard Sees:
├── Shared (15): Karakterforbedring
├── Exclusive (25): Ønsket, Trolldommekunst, Magisk Synergi, Essoter
└── Total: 40 available
```

**Design Principle:** Each class sees ~40-50 upgrades total (more focused shop), but the system can support 90+ upgrades in the config with no bloat in any individual class's shop.

---

## 4. FANTASY BOOK UI CHANGES

### Left Page: Hybrid Category Model

**Shared Categories (all classes):**
- `Karakterforbedring` - Base stats (HP, Speed, Armor, Regen) - Same upgrades for all classes

**Class-Exclusive Categories:**
- `Ønsket` - Class-specific legendary upgrades (Krieger/Archer/Wizard only)
- Weapon/Style categories (e.g., `Sverdkraft` for Krieger, `Buekunst` for Archer, `Trolldommekunst` for Wizard)
- Synergy/Technique categories unique to each class (e.g., `Raskultur` for Krieger, `Pilteknikker` for Archer, `Magisk Synergi` for Wizard)

**Category Layout Per Class:**

**KRIEGER (Shared + Exclusive):**
```
[Ønsket] ⭐ ← Exclusive: Whirlwind Slash upgrades + unique Krieger legendaries
[Karakterforbedring] [SHARED] ← Health, Speed, Armor (same for all classes)
[Sverdkraft] ⭐ ← Exclusive: Melee weapon focus (damage, knockback, attack speed)
[Raskultur] ⭐ ← Exclusive: Battle technique synergies (Counter, Riposte, etc.)
[Panser] ⭐ ← Exclusive: Armor/Defense synergies (Thorns, Damage Reduction, etc.)
```

**ARCHER (Shared + Exclusive):**
```
[Ønsket] ⭐ ← Exclusive: Explosive Shot upgrades + unique Archer legendaries
[Karakterforbedring] [SHARED] ← Health, Speed, Armor (same for all classes)
[Buekunst] ⭐ ← Exclusive: Archery focus (arrow damage, pierce, multishot)
[Pilteknikker] ⭐ ← Exclusive: Precision techniques (Ricochet, Charge, etc.)
[Mobilitet] ⭐ ← Exclusive: Movement synergies (Dash extension, Aerial, etc.)
```

**WIZARD (Shared + Exclusive):**
```
[Ønsket] ⭐ ← Exclusive: Elemental Cascade upgrades + unique Wizard legendaries
[Karakterforbedring] [SHARED] ← Health, Speed, Armor (same for all classes)
[Trolldommekunst] ⭐ ← Exclusive: All spells (Fire, Frost, Lightning upgrades)
[Magisk Synergi] ⭐ ← Exclusive: Cross-spell interactions (Chain reactions, etc.)
[Essoter] ⭐ ← Exclusive: Arcane secrets (Mana shields, Nullification, etc.)
```

### Right Page: Filtered Upgrades
- Only upgrades matching the selected category AND available to the class appear
- Shared category shows identical content for all classes
- Class-exclusive categories show only that class's upgrades
- Visual indicator: Gold star ⭐ next to exclusive category names
- Exclusive upgrades have distinctive border/styling to show prestige
- Requirement system: Some upgrades may require prerequisites from shared or own class categories

---

## 5. GAME FLOW: CLASS SELECTION

### Recommended Flow: **Option A (Pre-Game Modal)**

```
App.tsx (landing page)
  ↓
User clicks "Start Spill"
  ↓
[NEW] ClassSelector Modal appears
  ├─ Icon/name of each class
  ├─ Description (playstyle summary)
  └─ "Choose" buttons
  ↓
Selection → Callback with selectedClass
  ↓
GameContainer mounts with selectedClass
  ↓
MainScene.create()
  ├─ Reads registry.get('playerClass')
  ├─ Applies class-specific stat modifiers
  ├─ Sets starting weapon
  └─ Initializes registry with class data
  ↓
Game starts with class customization active
```

### Save Integration
- **New runs:** Always show ClassSelector (unless skipped via checkbox)
- **Continue run:** Remember last class, use same class automatically
- **New save data:** Include `playerClass` field in SaveData

---

## 6. REGISTRY & STATE CHANGES

### New Registry Keys
```typescript
playerClass: 'krieger' | 'archer' | 'wizard'
classAbility: string  // e.g., 'whirlwind_slash'
```

### SaveManager Updates
**RunProgress:**
```
{
  gameLevel, currentWave, playerCoins,
  upgradeLevels, currentWeapon, unlockedWeapons,
  playerHP, playerMaxHP,
  playerClass,          // ← NEW
  playerAbilityLevel    // ← NEW (if class abilities level up)
}
```

**SaveData (persistent):**
```
{
  coins, upgradeLevels, highStage, unlockedWeapons,
  audioSettings, graphicsQuality, tutorialSeen,
  lastSelectedClass     // ← NEW (remember choice)
}
```

---

## 7. CONFIGURATION FILES

### New Files to Create

**1. `src/config/classes.ts`**
```typescript
interface ClassConfig {
  id: 'krieger' | 'archer' | 'wizard'
  name: string                           // Display name
  description: string                    // Playstyle summary
  baseSpriteFrame: string               // e.g., 'player-idle-warrior'
  baseStats: {
    hp: number                           // Multiplier: 1.3 = +30%
    damage: number                       // 1.2 = +20%
    speed: number                        // 0.9 = -10%
    armor: number                        // Additive: +2
    attackSpeed?: number
    manaCost?: number
  }
  startingWeapon: string                // 'sword' | 'bow' | 'fireball'
  classAbility: string                  // ID of unique class ability
  shopCategories: string[]              // Order of categories
  availableUpgrades: string[]           // IDs of upgrades in shop
  exclusiveUpgrades: string[]           // IDs only this class can buy
}
```

**2. `src/config/class-upgrades.ts`**
```typescript
// Define 20-30 new exclusive upgrades per class
// Use existing UpgradeConfig structure
// Add optional `classRestriction: 'krieger' | 'archer' | 'wizard'`
```

**3. Modified `src/config/upgrades.ts`**
```typescript
// Extend each UpgradeConfig:
interface UpgradeConfig {
  ...existing fields...
  classRestriction?: 'krieger' | 'archer' | 'wizard'  // If set, only that class sees it
  visibility: 'all' | 'krieger' | 'archer' | 'wizard'  // Filtering control
}
```

---

## 8. STAT MODIFICATION LOGIC

### In MainScene.create()
```
1. Get selectedClass from registry
2. Fetch ClassConfig for that class
3. Pass baseStats multipliers to PlayerStatsManager
4. PlayerStatsManager.recalculateStats() applies modifiers:

   baseDamage *= classConfig.baseStats.damage
   baseHP *= classConfig.baseStats.hp
   baseSpeed *= classConfig.baseStats.speed
   baseArmor += classConfig.baseStats.armor

5. All derived stats calculated normally
6. Registry updated with modified values
```

---

## 9. SHOP FILTERING LOGIC

### In FantasyBook.tsx

**Current Logic:**
```typescript
const filteredItems = UPGRADES.filter(u => u.category === selectedCategory)
```

**New Logic:**
```typescript
const playerClass = useGameRegistry('playerClass')
const classConfig = CLASS_CONFIGS[playerClass]

const filteredItems = UPGRADES.filter(u =>
  u.category === selectedCategory
  && classConfig.availableUpgrades.includes(u.id)
)
```

### Visual Treatment
- Exclusive upgrades: Gold border or special icon label
- Unavailable upgrades: Not shown (filtered out)
- Class symbol near shop title indicating active class

---

## 10. CLASS ABILITIES (Active & Leveling)

Each class has a **unique active ability** that can be triggered and leveled up through upgrades:

**KRIEGER - Whirlwind Slash:**
- **Hotkey:** [Z] (new hotkey slot)
- **Mechanics:** AoE slash in circle around player; hits nearby enemies; bounces knockback between them
- **Base Cooldown:** 8 seconds
- **Leveling via shop upgrades:**
  - "Skarpe Kniver" (Lv1-3): Increases damage per level
  - "Rotasjonsfart" (Lv1-3): Reduces cooldown
  - "Eksplosiv Sekvens" (Lv1-2): Each hit reduces next cooldown by X% (synergy)

**ARCHER - Explosive Shot:**
- **Hotkey:** [X] (new hotkey slot)
- **Mechanics:** Next arrow costs 2x cooldown but explodes on impact, 2x damage, AoE radius
- **Base Cooldown:** 6 seconds (doubled when triggered = 12s)
- **Leveling via shop upgrades:**
  - "Massiv Eksplosjon" (Lv1-3): Increases AoE radius
  - "Dødelig Nøyaktighet" (Lv1-3): Increases damage multiplier
  - "Kaskadefyring" (Lv1-2): Spawns extra arrows when explosive hits (synergy)

**WIZARD - Elemental Cascade:**
- **Hotkey:** [C] (new hotkey slot)
- **Mechanics:** Triggers 50% bonus damage on all active spells for 4 seconds; spells trigger each other
- **Base Cooldown:** 10 seconds
- **Leveling via shop upgrades:**
  - "Magisk Resonans" (Lv1-3): Extends duration
  - "Elementær Kraft" (Lv1-3): Increases damage bonus %
  - "Kjede Reaksjon" (Lv1-2): Enemies hit by multiple spell types take extra damage (synergy)

**Implementation:**
- New registry key: `classAbility` (ability ID), `classAbilityLevel` (1-3 typically)
- New hotkey slot in `weapons.ts`
- Separate cooldown tracker in `MainScene`
- Ability damage/effects scale with `classAbilityLevel` from shop
- Abilities integrate with existing upgrade economy (bought like other upgrades)

---

## 11. UI COMPONENTS TO CREATE/MODIFY

### New Components
1. **ClassSelector.tsx** - Modal showing 3 class cards with descriptions
   - Appears after "Start Spill" click
   - Returns `{ selectedClass, rememberChoice }`

2. **ClassDisplay.tsx** - Small indicator showing active class
   - Could appear in HUD or FantasyBook header

### Modified Components
1. **FantasyBook.tsx**
   - Filter upgrades by class
   - Update category buttons based on class
   - Add visual class indicator

2. **GameContainer.tsx**
   - Pass `selectedClass` to MainScene via createGame()
   - Store class in registry before MainScene.create()

3. **App.tsx**
   - Add ClassSelector modal between LandingPage and GameContainer
   - Manage `selectedClass` state

---

## 12. MIGRATION PLAN (Phased Rollout)

### Phase 1: Architecture Setup (No visible changes yet)
- Create `classes.ts`, `class-upgrades.ts` config files
- Extend UpgradeConfig interface with `classRestriction`
- Add `playerClass` to registry
- Modify SaveManager to persist `playerClass`
- Update MainScene to read class and apply stat modifiers

### Phase 2: Class Selection UI
- Create ClassSelector component
- Wire into LandingPage → ClassSelector → GameContainer flow
- Test class selection and persistence

### Phase 3: Shop Customization
- Modify FantasyBook to filter upgrades by class
- Update category names/order per class
- Add visual indicators

### Phase 4: Content Creation
- Design and balance 20-30 exclusive upgrades per class
- Create new upgrade category names (in Norwegian)
- Test build diversity and progression

### Phase 5: Polish & Balance
- Playtesting and balance adjustments
- Fine-tune stat multipliers
- Ensure no class is overpowered

---

## 13. DATA ARCHITECTURE SUMMARY

```
Phaser Registry (Runtime State)
├── playerClass: 'krieger' | 'archer' | 'wizard'
├── upgradeLevels: { [upgradeId]: level }
├── currentWeapon: string
└── [existing player stat keys]

SaveManager (Persistence)
├── RunProgress
│   └── playerClass
└── SaveData
    └── lastSelectedClass

Config System
├── classes.ts (class definitions & configs)
├── class-upgrades.ts (new exclusive upgrades)
└── upgrades.ts (extended with classRestriction)

UI State (React)
└── GameContainer
    ├── selectedClass (from ClassSelector)
    └── [existing UI state]
```

---

## 14. DESIGN PRINCIPLES

1. **No Breaking Changes:** Existing save data handled gracefully (default to Krieger if missing)
2. **Mod-Friendly:** Class system is purely configuration-driven; new classes can be added to `classes.ts`
3. **Upgrade-Agnostic:** Core upgrade system unchanged; filtering happens at UI layer
4. **Narrative:** Each class has identity through stats, abilities, and shop organization
5. **Balance:** Start with 3 classes; ensure viable paths to victory for all
6. **Replayability:** Class choice encourages multiple playthroughs

---

## 15. SUCCESS CRITERIA

✓ Player sees ClassSelector when starting new game
✓ Selected class persists across continues
✓ Shop shows class-customized categories
✓ Available upgrades filtered by class
✓ Class-exclusive upgrades are attractive and desirable
✓ Each class has distinct playstyle (stat distribution validates this)
✓ No major balance problems (one class not vastly superior)
✓ Existing save format can be migrated

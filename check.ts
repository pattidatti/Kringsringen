import { UPGRADES } from './src/config/upgrades';
import { CLASS_UPGRADES } from './src/config/class-upgrades';
import { CHAPTER_DEFINITIONS } from './src/config/upgrades';

console.log("UPGRADES loaded:", UPGRADES.length);
console.log("CLASS_UPGRADES loaded:", CLASS_UPGRADES.length);
console.log("CHAPTER_DEFINITIONS keys:", Object.keys(CHAPTER_DEFINITIONS));

try {
    const allUpgrades = [...UPGRADES, ...CLASS_UPGRADES];
    console.log("All upgrades spread successfully.");

    // Simulate FantasyBook logic
    const shopItems = allUpgrades.filter(u => {
        const catId = u.shopCategoryId ?? u.category.toLowerCase();
        return true;
    });

    const map = new Map();
    for (const item of shopItems) {
        const cid = item.chapterId ?? 'uncategorized';
        if (!map.has(cid)) map.set(cid, []);
        map.get(cid).push(item);
    }

    const groups = Array.from(map.entries()).map(([cid, groupItems]) => {
        const def = CHAPTER_DEFINITIONS[cid] ?? CHAPTER_DEFINITIONS['uncategorized'];
        return {
            chapterId: cid,
            label: def.label,
            loreText: def.loreText,
            order: def.order,
            items: groupItems,
        };
    });
    console.log("Grouping succeeded.", groups.map(g => g.chapterId));
} catch (e) {
    console.error("Crash during execution:", e);
}

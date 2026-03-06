/**
 * Type definitions for the ability tooltip system.
 * Tooltips display ability stats + upgrade bonuses on hover/focus.
 */

export interface TooltipStat {
  label: string;
  value: string | number;
  bonus?: string | number; // Bonus from upgrades (displayed in green)
  suffix?: string; // e.g., "px", "s", "%"
}

export interface AbilityTooltipData {
  name: string;
  description: string;
  cooldown?: TooltipStat;
  damage?: TooltipStat;
  radius?: TooltipStat;
  duration?: TooltipStat;
  count?: TooltipStat; // For abilities like Phantom Volley (arrow count)
  attackSpeed?: TooltipStat; // Attack speed modifier
  pierce?: TooltipStat; // Pierce count
  projectiles?: TooltipStat; // Number of projectiles
  special?: string[]; // Special effect descriptions (e.g., ["Pierces enemies", "Reduces cooldown on hit"])
  color?: number; // Hex color for glow effect (matches ability theme)
}

// Type alias for consistency (weapons and abilities share the same structure)
export type WeaponTooltipData = AbilityTooltipData;

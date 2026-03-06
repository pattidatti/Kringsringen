/**
 * AbilityTooltip Component
 * Displays detailed ability stats + upgrade bonuses on hover/focus.
 * Uses FantasyPanel for themed UI, Framer Motion for smooth animations.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyPanel } from './FantasyPanel';
import type { AbilityTooltipData, TooltipStat } from '../../types/tooltips';
import clsx from 'clsx';

interface AbilityTooltipProps {
  data: AbilityTooltipData;
  anchorEl: HTMLElement | null; // The hotbar slot element
  isVisible: boolean;
}

/**
 * Helper: Renders a single stat line with label, value, and optional bonus
 */
const StatLine: React.FC<{ stat: TooltipStat }> = ({ stat }) => (
  <div className="flex justify-between items-baseline gap-3 text-sm">
    <span className="text-stone-300 font-cinzel tracking-wide">{stat.label}:</span>
    <span className="font-mono text-amber-100 font-semibold">
      {stat.value}
      {stat.suffix || ''}
      {stat.bonus && (
        <span className="text-green-400 ml-1.5 text-xs">
          ({stat.bonus})
        </span>
      )}
    </span>
  </div>
);

export const AbilityTooltip: React.FC<AbilityTooltipProps> = ({ data, anchorEl, isVisible }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!anchorEl || !tooltipRef.current || !isVisible) {
      setPosition(null);
      return;
    }

    const anchorRect = anchorEl.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    // Default: position above the slot with 8px spacing
    let top = anchorRect.top - tooltipRect.height - 8;
    let left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;

    // Boundary detection: if tooltip clips top of screen, position below instead
    if (top < 8) {
      top = anchorRect.bottom + 8;
    }

    // Horizontal boundary: keep within viewport
    if (left < 8) {
      left = 8;
    } else if (left + tooltipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width - 8;
    }

    setPosition({ top, left });
  }, [anchorEl, isVisible, data]);

  if (!isVisible || !position) return null;

  // Extract stats for rendering
  const stats: TooltipStat[] = [
    data.cooldown,
    data.damage,
    data.radius,
    data.duration,
    data.count,
    data.attackSpeed,
    data.pierce,
    data.projectiles,
  ].filter((stat): stat is TooltipStat => stat !== undefined);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={tooltipRef}
          role="tooltip"
          aria-live="polite"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 9999,
            pointerEvents: 'none',
            maxWidth: '320px',
          }}
          className="select-none"
        >
          <FantasyPanel
            variant="wood"
            scale={0.9}
            contentPadding="px-4 py-3"
            style={{
              boxShadow: `0 4px 16px rgba(0,0,0,0.6), 0 0 12px ${data.color ? `rgba(${(data.color >> 16) & 0xff}, ${(data.color >> 8) & 0xff}, ${data.color & 0xff}, 0.3)` : 'rgba(0,0,0,0)'}`,
            }}
          >
            <div className="flex flex-col gap-2">
              {/* Header: Ability Name */}
              <div
                className="flex items-center gap-2 pb-2 border-b border-stone-600/50"
                style={{
                  textShadow: data.color
                    ? `0 0 8px rgba(${(data.color >> 16) & 0xff}, ${(data.color >> 8) & 0xff}, ${data.color & 0xff}, 0.6)`
                    : '0 2px 4px rgba(0,0,0,0.8)',
                }}
              >
                <span className="text-base font-cinzel font-bold text-amber-200 tracking-wider uppercase">
                  {data.name}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-stone-300 leading-relaxed italic">
                {data.description}
              </p>

              {/* Stats Section */}
              {stats.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-stone-600/50">
                  {stats.map((stat, idx) => (
                    <StatLine key={idx} stat={stat} />
                  ))}
                </div>
              )}

              {/* Special Effects */}
              {data.special && data.special.length > 0 && (
                <div className="flex flex-col gap-1 pt-2 border-t border-stone-600/50">
                  <span className="text-xs font-cinzel text-stone-400 uppercase tracking-wide">
                    Effekter:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {data.special.map((effect, idx) => (
                      <li
                        key={idx}
                        className={clsx(
                          'text-xs leading-relaxed',
                          effect.includes('lifesteal') || effect.includes('Heler')
                            ? 'text-green-400'
                            : effect.includes('Krever')
                              ? 'text-yellow-400'
                              : 'text-stone-300'
                        )}
                      >
                        {effect}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </FantasyPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

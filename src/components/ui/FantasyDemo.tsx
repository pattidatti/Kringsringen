import React, { useState } from 'react';
import { FantasyButton } from './FantasyButton';
import { FantasyPanel } from './FantasyPanel';
import { FantasyIcon } from './FantasyIcon';
import framesImg from '../../assets/ui/fantasy/UI_Frames.png';
import { FantasyBook } from './FantasyBook';
import { UI_ATLAS } from '../../config/ui-atlas';

const ITEM_ICONS_URL = '/assets/ui/fantasy/UI_Item_Icons.png';

// ─── Named icon list ──────────────────────────────────────────────────────────
// Shows every named item_ frame at 3× (48×48) with name + coords
const ItemIconNamedList: React.FC = () => {
    const itemFrames = Object.entries(UI_ATLAS.frames).filter(([key]) =>
        key.startsWith('item_')
    );

    return (
        <div className="flex flex-wrap gap-4">
            {itemFrames.map(([key, frame]) => (
                <div
                    key={key}
                    className="flex flex-col items-center gap-2 bg-slate-800 rounded-lg p-3 border border-slate-600 hover:border-amber-400 transition-colors min-w-[80px]"
                >
                    {/* Icon at 3× via wrapper+transform */}
                    <div style={{ width: 48, height: 48, overflow: 'hidden', imageRendering: 'pixelated' }}>
                        <div style={{
                            width: 16,
                            height: 16,
                            backgroundImage: `url(${ITEM_ICONS_URL})`,
                            backgroundPosition: `-${frame.x}px -${frame.y}px`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: 'auto',
                            imageRendering: 'pixelated',
                            transform: 'scale(3)',
                            transformOrigin: 'top left',
                        }} />
                    </div>
                    <span className="text-sm text-white font-mono text-center leading-tight">
                        {key.replace('item_', '')}
                    </span>
                    <span className="text-xs text-amber-400 font-mono">
                        x={frame.x} y={frame.y}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Full sprite grid ─────────────────────────────────────────────────────────
// Shows every 16×16 cell at 2× with sticky coord readout on hover
const GRID_COLS = 32;
const GRID_ROWS = 45;
const CELL = 16;
const DISPLAY = 32; // 2× zoom

const ItemIconDebugGrid: React.FC = () => {
    const [hovered, setHovered] = useState<{ col: number; row: number } | null>(null);

    return (
        <div className="flex flex-col gap-4">
            {/* Sticky coordinate readout */}
            <div
                className="sticky top-0 z-10 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3"
                style={{ fontFamily: 'monospace' }}
            >
                {hovered ? (
                    <div className="flex gap-8 items-center">
                        {/* Preview at 4× */}
                        <div style={{ width: 64, height: 64, overflow: 'hidden', imageRendering: 'pixelated', flexShrink: 0, background: '#1e293b', border: '1px solid #475569', borderRadius: 4 }}>
                            <div style={{
                                width: CELL,
                                height: CELL,
                                backgroundImage: `url(${ITEM_ICONS_URL})`,
                                backgroundPosition: `-${hovered.col * CELL}px -${hovered.row * CELL}px`,
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: 'auto',
                                imageRendering: 'pixelated',
                                transform: 'scale(4)',
                                transformOrigin: 'top left',
                            }} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-amber-300 text-lg font-bold">
                                col={hovered.col}  row={hovered.row}
                            </span>
                            <span className="text-white text-xl font-bold">
                                x={hovered.col * CELL}  y={hovered.row * CELL}
                            </span>
                            <span className="text-slate-400 text-sm">
                                Kopier til ui-atlas.ts: {'{ x: '}{hovered.col * CELL}{', y: '}{hovered.row * CELL}{', w: 16, h: 16 }'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <span className="text-slate-400 text-base">Hald musa over eit ikon for å sjå koordinatane…</span>
                )}
            </div>

            {/* Grid */}
            <div
                className="overflow-auto border border-slate-600 rounded-lg bg-slate-950"
                style={{ maxHeight: '70vh' }}
            >
                <div style={{ display: 'inline-block' }}>
                    {Array.from({ length: GRID_ROWS }, (_, row) => (
                        <div key={row} style={{ display: 'flex', alignItems: 'center' }}>
                            {/* Y-label */}
                            <div style={{
                                width: 36,
                                minWidth: 36,
                                fontSize: 11,
                                color: '#94a3b8',
                                textAlign: 'right',
                                paddingRight: 6,
                                lineHeight: `${DISPLAY}px`,
                                fontFamily: 'monospace',
                                userSelect: 'none',
                                flexShrink: 0,
                            }}>
                                {row * CELL}
                            </div>

                            {/* Icon cells */}
                            {Array.from({ length: GRID_COLS }, (_, col) => {
                                const isHov = hovered?.col === col && hovered?.row === row;
                                return (
                                    <div
                                        key={col}
                                        onMouseEnter={() => setHovered({ col, row })}
                                        onMouseLeave={() => setHovered(null)}
                                        style={{
                                            width: DISPLAY,
                                            height: DISPLAY,
                                            overflow: 'hidden',
                                            outline: isHov
                                                ? '2px solid #f59e0b'
                                                : '1px solid rgba(255,255,255,0.07)',
                                            cursor: 'crosshair',
                                            boxSizing: 'border-box',
                                            flexShrink: 0,
                                            background: isHov ? 'rgba(245,158,11,0.15)' : undefined,
                                        }}
                                    >
                                        <div style={{
                                            width: CELL,
                                            height: CELL,
                                            backgroundImage: `url(${ITEM_ICONS_URL})`,
                                            backgroundPosition: `-${col * CELL}px -${row * CELL}px`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundSize: 'auto',
                                            imageRendering: 'pixelated',
                                            transform: `scale(${DISPLAY / CELL})`,
                                            transformOrigin: 'top left',
                                        }} />
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Main demo ────────────────────────────────────────────────────────────────
const FantasyDemo: React.FC = () => {
    const [isBookOpen, setIsBookOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-900 text-white" style={{ fontFamily: 'sans-serif' }}>

            {/* ── Existing demo content ── */}
            <div className="p-8 flex flex-col items-center gap-8 max-w-5xl mx-auto">
                <h1 className="text-4xl text-amber-400 drop-shadow-lg font-fantasy">Cute Fantasy UI Demo</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                    <section className="flex flex-col gap-4">
                        <h2 className="text-2xl text-amber-200">Buttons</h2>
                        <div className="flex flex-wrap gap-4">
                            <FantasyButton label="Start Game" onClick={() => alert('Start!')} />
                            <FantasyButton variant="secondary" label="Settings" />
                            <FantasyButton disabled label="Load Game" />
                            <FantasyButton label="Open Journal" onClick={() => setIsBookOpen(true)} className="bg-amber-700 text-amber-100 border-amber-900" />
                        </div>
                    </section>

                    <FantasyBook
                        isOpen={isBookOpen}
                        mode="view"
                        onClose={() => setIsBookOpen(false)}
                        actions={{
                            onSelectPerk: (id) => console.log('Demo: Select Perk', id),
                            onBuyUpgrade: (id, cost) => console.log('Demo: Buy Upgrade', id, cost)
                        }}
                    />

                    <section className="flex flex-col gap-4">
                        <h2 className="text-2xl text-amber-200">Icons (UI_Icons)</h2>
                        <div className="flex gap-4 items-center">
                            <FantasyIcon icon="sword" size="lg" />
                            <FantasyIcon icon="shield" size="md" />
                            <FantasyIcon icon="heart" size="sm" />
                            <FantasyIcon icon="coin" size="md" />
                        </div>
                    </section>

                    <section className="flex flex-col gap-4">
                        <h2 className="text-2xl text-amber-200">Panels</h2>
                        <div className="flex gap-4">
                            <FantasyPanel variant="wood" className="flex-1 h-24 flex items-center justify-center">
                                <span className="text-amber-900 text-sm">Wood</span>
                            </FantasyPanel>
                            <FantasyPanel variant="paper" className="flex-1 h-24 flex items-center justify-center">
                                <span className="text-slate-800 text-sm">Paper</span>
                            </FantasyPanel>
                        </div>
                    </section>
                </div>
            </div>

            {/* ── Item Icons: named ── */}
            <div className="border-t border-slate-700 p-8">
                <div className="max-w-5xl mx-auto flex flex-col gap-4">
                    <div>
                        <h2 className="text-2xl text-amber-200 mb-1">Item Icons – namngjeve</h2>
                        <p className="text-base text-slate-400">
                            Vist 3× (48px). Raud tekst = koordinatar. Feil ikon? Finn riktig i rutenettet under.
                        </p>
                    </div>
                    <ItemIconNamedList />
                </div>
            </div>

            {/* ── Item Icons: full grid ── */}
            <div className="border-t border-slate-700 p-8">
                <div className="flex flex-col gap-4">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-2xl text-amber-200 mb-1">Item Icons – sprite-debug rutenett</h2>
                        <p className="text-base text-slate-400">
                            Kvar celle = 16×16px (vist 2×). Hald musa over → sjå forstørra ikon + koordinatar øvst.
                            Talet til venstre er <strong className="text-white">y-verdien</strong> (rad × 16).
                        </p>
                    </div>
                    <ItemIconDebugGrid />
                </div>
            </div>
        </div>
    );
};

export default FantasyDemo;

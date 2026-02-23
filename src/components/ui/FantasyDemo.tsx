import React, { useState, useCallback } from 'react';
import { FantasyButton } from './FantasyButton';
import { FantasyPanel } from './FantasyPanel';
import { FantasyIcon } from './FantasyIcon';
import framesImg from '../../assets/ui/fantasy/UI_Frames.png';
import { FantasyBook } from './FantasyBook';
import { UI_ATLAS } from '../../config/ui-atlas';

const ITEM_ICONS_URL = import.meta.env.BASE_URL + 'assets/ui/fantasy/UI_Item_Icons.png';

// Icons are 32×32px → 16 columns in a 512px-wide sheet
const CELL = 32;
const GRID_COLS = 16;
const GRID_ROWS = 28; // covers full sheet

// ─── Named icon list ──────────────────────────────────────────────────────────
const ItemIconNamedList: React.FC = () => {
    const itemFrames = Object.entries(UI_ATLAS.frames).filter(([key]) =>
        key.startsWith('item_')
    );

    return (
        <div className="flex flex-wrap gap-4">
            {itemFrames.map(([key, frame]) => (
                <div
                    key={key}
                    className="flex flex-col items-center gap-2 bg-slate-800 rounded-lg p-3 border border-slate-600 hover:border-amber-400 transition-colors min-w-[90px]"
                >
                    {/* Natural 32×32, scaled 2× to 64×64 for visibility */}
                    <div style={{ width: 64, height: 64, overflow: 'hidden', imageRendering: 'pixelated', flexShrink: 0 }}>
                        <div style={{
                            width: CELL,
                            height: CELL,
                            backgroundImage: `url(${ITEM_ICONS_URL})`,
                            backgroundPosition: `-${frame.x}px -${frame.y}px`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: 'auto',
                            imageRendering: 'pixelated',
                            transform: 'scale(2)',
                            transformOrigin: 'top left',
                        }} />
                    </div>
                    <span className="text-sm text-white font-mono text-center leading-tight">
                        {key.replace('item_', '')}
                    </span>
                    <span className="text-xs text-amber-400 font-mono">
                        x={frame.x} y={frame.y}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                        {frame.w}×{frame.h}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Debug grid with drag-select ──────────────────────────────────────────────
type CellPos = { col: number; row: number };

const ItemIconDebugGrid: React.FC = () => {
    const [zoom, setZoom] = useState(2); // display scale: 1×, 2×, 3×
    const display = CELL * zoom;

    const [dragStart, setDragStart] = useState<CellPos | null>(null);
    const [dragEnd, setDragEnd] = useState<CellPos | null>(null);
    const [isMouseDown, setIsMouseDown] = useState(false);

    const sel = dragStart && dragEnd ? {
        col: Math.min(dragStart.col, dragEnd.col),
        row: Math.min(dragStart.row, dragEnd.row),
        cols: Math.abs(dragEnd.col - dragStart.col) + 1,
        rows: Math.abs(dragEnd.row - dragStart.row) + 1,
    } : null;

    const selX = sel ? sel.col * CELL : null;
    const selY = sel ? sel.row * CELL : null;
    const selW = sel ? sel.cols * CELL : null;
    const selH = sel ? sel.rows * CELL : null;

    const handleMouseDown = useCallback((col: number, row: number) => {
        setIsMouseDown(true);
        setDragStart({ col, row });
        setDragEnd({ col, row });
    }, []);

    const handleMouseEnter = useCallback((col: number, row: number) => {
        if (isMouseDown) setDragEnd({ col, row });
    }, [isMouseDown]);

    const handleMouseUp = useCallback(() => setIsMouseDown(false), []);

    return (
        <div className="flex flex-col gap-4" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

            {/* Controls */}
            <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-3">
                    <span className="text-base text-slate-300">Zoom:</span>
                    {[1, 2, 3, 4].map(z => (
                        <button
                            key={z}
                            onClick={() => setZoom(z)}
                            className={`px-3 py-1 rounded font-mono text-base border transition-colors ${
                                zoom === z
                                    ? 'bg-amber-500 text-black border-amber-400 font-bold'
                                    : 'bg-slate-700 text-slate-200 border-slate-500 hover:border-amber-400'
                            }`}
                        >
                            {z}×
                        </button>
                    ))}
                </div>
                <span className="text-sm text-slate-500">
                    Cellestr: {display}×{display}px &nbsp;|&nbsp; Kvar ikon = 1 celle ({CELL}×{CELL}px)
                </span>
            </div>

            {/* Sticky readout */}
            <div
                className="sticky top-0 z-10 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 select-none"
                style={{ fontFamily: 'monospace' }}
            >
                {sel && selX !== null && selY !== null && selW !== null && selH !== null ? (
                    <div className="flex gap-6 items-center flex-wrap">
                        {/* 4× preview */}
                        <div style={{
                            width: Math.min(selW * 4, 128),
                            height: Math.min(selH * 4, 128),
                            overflow: 'hidden',
                            imageRendering: 'pixelated',
                            flexShrink: 0,
                            background: '#1e293b',
                            border: '1px solid #475569',
                            borderRadius: 4,
                        }}>
                            <div style={{
                                width: selW,
                                height: selH,
                                backgroundImage: `url(${ITEM_ICONS_URL})`,
                                backgroundPosition: `-${selX}px -${selY}px`,
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: 'auto',
                                imageRendering: 'pixelated',
                                transform: `scale(4)`,
                                transformOrigin: 'top left',
                            }} />
                        </div>
                        <div className="flex flex-col gap-1">
                            {sel.cols === 1 && sel.rows === 1 ? (
                                <>
                                    <span className="text-amber-300 text-lg font-bold">
                                        col={sel.col}  row={sel.row}
                                    </span>
                                    <span className="text-white text-2xl font-bold">
                                        x={selX}  y={selY}
                                    </span>
                                    <span className="text-green-300 text-base">
                                        {'{ x: '}{selX}{', y: '}{selY}{', w: 32, h: 32 }'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-amber-300 text-lg font-bold">
                                        {sel.cols}×{sel.rows} celler valgt
                                    </span>
                                    <span className="text-white text-2xl font-bold">
                                        x={selX}  y={selY}  w={selW}  h={selH}
                                    </span>
                                    <span className="text-green-300 text-base">
                                        {'{ x: '}{selX}{', y: '}{selY}{', w: '}{selW}{', h: '}{selH}{' }'}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <span className="text-slate-400 text-base">
                        Klikk eller dra over eit ikon for å sjå koordinatane…
                    </span>
                )}
            </div>

            {/* Grid */}
            <div
                className="overflow-auto border border-slate-600 rounded-lg bg-slate-950"
                style={{ maxHeight: '72vh', cursor: 'crosshair', userSelect: 'none' }}
            >
                <div style={{ display: 'inline-block' }}>
                    {Array.from({ length: GRID_ROWS }, (_, row) => (
                        <div key={row} style={{ display: 'flex', alignItems: 'center' }}>
                            {/* Y-label */}
                            <div style={{
                                width: 40,
                                minWidth: 40,
                                fontSize: 12,
                                color: '#94a3b8',
                                textAlign: 'right',
                                paddingRight: 6,
                                lineHeight: `${display}px`,
                                fontFamily: 'monospace',
                                userSelect: 'none',
                                flexShrink: 0,
                            }}>
                                {row * CELL}
                            </div>

                            {Array.from({ length: GRID_COLS }, (_, col) => {
                                const inSel = sel
                                    ? col >= sel.col && col < sel.col + sel.cols
                                      && row >= sel.row && row < sel.row + sel.rows
                                    : false;

                                return (
                                    <div
                                        key={col}
                                        onMouseDown={() => handleMouseDown(col, row)}
                                        onMouseEnter={() => handleMouseEnter(col, row)}
                                        style={{
                                            width: display,
                                            height: display,
                                            overflow: 'hidden',
                                            outline: inSel
                                                ? '2px solid #f59e0b'
                                                : '1px solid rgba(255,255,255,0.07)',
                                            background: inSel ? 'rgba(245,158,11,0.2)' : undefined,
                                            boxSizing: 'border-box',
                                            flexShrink: 0,
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
                                            transform: zoom !== 1 ? `scale(${zoom})` : undefined,
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
                            Vist 2× (64px). Koordinatar i gult. Feil ikon → finn riktig i rutenettet under.
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
                            Kvar celle = 32×32px (1 ikon). <strong className="text-white">Klikk</strong> for eitt ikon,
                            <strong className="text-white"> dra</strong> for å velje fleire.
                            Kopierbar koordinatstreng vises øvst.
                        </p>
                    </div>
                    <ItemIconDebugGrid />
                </div>
            </div>
        </div>
    );
};

export default FantasyDemo;

import React, { useState } from 'react';
import framesImg from '../../assets/ui/fantasy/UI_Frames.png';

/**
 * FantasyDebug Component
 * 
 * A tool to visualize and slice sprite sheets for the Cute_Fantasy_UI pack.
 * This component renders the raw sprite sheets and provides an interface to
 * test 9-slice borders and button states live.
 */
export const FantasyDebug = () => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [sliceConfig, setSliceConfig] = useState({
        x: 10,
        y: 10,
        width: 28,
        height: 31,
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
        scale: 4,
    });

    // Load images
    // Load images // Fallback / or verify if we need to pass the imported one.
    // actually, let's use the imported one, but I need to move the import statement UP first.
    // efficient way: remove this line here, and add it at the top.

    // const buttonsImg = '/assets/ui/fantasy/UI_Buttons.png'; // Not used yet
    // const iconsImg = '/assets/ui/fantasy/UI_Icons.png'; // Not used yet

    // Keyboard Nudge
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const step = e.shiftKey ? 10 : 1;
            switch (e.key) {
                case 'ArrowUp':
                    setSliceConfig(prev => ({ ...prev, y: prev.y - step }));
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    setSliceConfig(prev => ({ ...prev, y: prev.y + step }));
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    setSliceConfig(prev => ({ ...prev, x: prev.x - step }));
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    setSliceConfig(prev => ({ ...prev, x: prev.x + step }));
                    e.preventDefault();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.floor(e.clientX - rect.left);
        const y = Math.floor(e.clientY - rect.top);
        setMousePos({ x, y });
    };

    const handleClick = () => {
        setSliceConfig(prev => ({ ...prev, x: mousePos.x, y: mousePos.y }));
    };

    // Calculate background positions for the 9-slice grid
    // We need to carefully calculate negative offsets based on the sprite sheet coordinates
    const bgPos = (offsetX: number, offsetY: number) => `-${sliceConfig.x + offsetX}px -${sliceConfig.y + offsetY}px`;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8 font-mono overflow-auto">
            <h1 className="text-3xl mb-6 text-amber-500 font-bold">Cute_Fantasy_UI Debugger</h1>

            <div className="grid grid-cols-[1fr_400px] gap-8">
                {/* Sprite Sheet Viewer */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <h2 className="text-xl font-semibold">Sprite Sheet</h2>
                        <span className="text-xs text-slate-400">Use Arrows to Nudge, Shift+Arrow for 10px</span>
                    </div>
                    <div className="relative overflow-auto border border-slate-700 bg-slate-800 max-h-[800px] max-w-full">
                        <div
                            className="relative cursor-crosshair inline-block"
                            onMouseMove={handleMouseMove}
                            onClick={handleClick}
                        >
                            <img src={framesImg} alt="Frames" className="image-rendering-pixelated max-w-none" />
                            {/* Cursor Guide */}
                            <div
                                className="absolute pointer-events-none border border-red-500/50"
                                style={{
                                    left: mousePos.x,
                                    top: 0,
                                    height: '100%',
                                    width: '1px'
                                }}
                            />
                            <div
                                className="absolute pointer-events-none border border-red-500/50"
                                style={{
                                    left: 0,
                                    top: mousePos.y,
                                    width: '100%',
                                    height: '1px'
                                }}
                            />
                            {/* Selection Preview */}
                            <div
                                className="absolute border-2 border-green-400 bg-green-400/20 pointer-events-none"
                                style={{
                                    left: sliceConfig.x,
                                    top: sliceConfig.y,
                                    width: sliceConfig.width,
                                    height: sliceConfig.height
                                }}
                            />
                        </div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded flex justify-between">
                        <span>Cursor: <span className="text-green-400">{mousePos.x}, {mousePos.y}</span></span>
                        <span>Selection: <span className="text-amber-400">{sliceConfig.x}, {sliceConfig.y}</span></span>
                    </div>
                </div>

                {/* Configuration & Preview */}
                <div className="space-y-6">
                    <div className="bg-slate-800 p-6 rounded-lg space-y-4 sticky top-4">
                        <h3 className="text-lg font-bold border-b border-slate-700 pb-2">Slice Configuration</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs uppercase text-slate-400">X Position</label>
                                <input
                                    type="number"
                                    value={sliceConfig.x}
                                    onChange={(e) => setSliceConfig({ ...sliceConfig, x: Number(e.target.value) })}
                                    className="w-full bg-slate-900 p-2 rounded text-amber-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-slate-400">Y Position</label>
                                <input
                                    type="number"
                                    value={sliceConfig.y}
                                    onChange={(e) => setSliceConfig({ ...sliceConfig, y: Number(e.target.value) })}
                                    className="w-full bg-slate-900 p-2 rounded text-amber-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-slate-400">Width</label>
                                <input
                                    type="number"
                                    value={sliceConfig.width}
                                    onChange={(e) => setSliceConfig({ ...sliceConfig, width: Number(e.target.value) })}
                                    className="w-full bg-slate-900 p-2 rounded text-amber-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-slate-400">Height</label>
                                <input
                                    type="number"
                                    value={sliceConfig.height}
                                    onChange={(e) => setSliceConfig({ ...sliceConfig, height: Number(e.target.value) })}
                                    className="w-full bg-slate-900 p-2 rounded text-amber-400"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 pt-4">
                            <div>
                                <label className="block text-xs uppercase text-slate-400 text-center">Top</label>
                                <input
                                    type="number"
                                    value={sliceConfig.top}
                                    onChange={(e) => setSliceConfig({ ...sliceConfig, top: Number(e.target.value) })}
                                    className="w-full bg-slate-900 p-2 rounded text-center"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-slate-400 text-center">Right</label>
                                <input
                                    type="number"
                                    value={sliceConfig.right}
                                    onChange={(e) => setSliceConfig({ ...sliceConfig, right: Number(e.target.value) })}
                                    className="w-full bg-slate-900 p-2 rounded text-center"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-slate-400 text-center">Bottom</label>
                                <input
                                    type="number"
                                    value={sliceConfig.bottom}
                                    onChange={(e) => setSliceConfig({ ...sliceConfig, bottom: Number(e.target.value) })}
                                    className="w-full bg-slate-900 p-2 rounded text-center"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-slate-400 text-center">Left</label>
                                <input
                                    type="number"
                                    value={sliceConfig.left}
                                    onChange={(e) => setSliceConfig({ ...sliceConfig, left: Number(e.target.value) })}
                                    className="w-full bg-slate-900 p-2 rounded text-center"
                                />
                            </div>
                        </div>
                        <div className='pt-2'>
                            <label className="block text-xs uppercase text-slate-400">Scale Preview ({sliceConfig.scale}x)</label>
                            <input
                                type="range"
                                min="1"
                                max="8"
                                step="1"
                                value={sliceConfig.scale}
                                onChange={(e) => setSliceConfig({ ...sliceConfig, scale: Number(e.target.value) })}
                                className="w-full"
                            />
                        </div>

                        {/* Live Preview (Simulated 9-Slice using Divs) */}
                        <div className="pt-6 border-t border-slate-700">
                            <h3 className="text-lg font-bold mb-4">Live Result (Div Grid)</h3>

                            <div
                                className="grid"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: `${sliceConfig.left}px 1fr ${sliceConfig.right}px`,
                                    gridTemplateRows: `${sliceConfig.top}px 1fr ${sliceConfig.bottom}px`,
                                    width: '300px',
                                    height: '200px',
                                    transform: `scale(${sliceConfig.scale})`,
                                    transformOrigin: 'top left'
                                }}
                            >
                                {/* Top Left */}
                                <div style={{
                                    backgroundImage: `url(${framesImg})`,
                                    backgroundPosition: bgPos(0, 0),
                                    width: sliceConfig.left,
                                    height: sliceConfig.top,
                                    imageRendering: 'pixelated'
                                }} />

                                {/* Top Center */}
                                <div style={{
                                    backgroundImage: `url(${framesImg})`,
                                    backgroundPosition: bgPos(sliceConfig.left, 0),
                                    height: sliceConfig.top,
                                    imageRendering: 'pixelated',
                                    backgroundRepeat: 'repeat-x' // In real component this might need to be 'stretch' or handled differently
                                }} />

                                {/* Top Right */}
                                <div style={{
                                    backgroundImage: `url(${framesImg})`,
                                    backgroundPosition: bgPos(sliceConfig.width - sliceConfig.right, 0),
                                    width: sliceConfig.right,
                                    height: sliceConfig.top,
                                    imageRendering: 'pixelated'
                                }} />

                                {/* Middle Left */}
                                <div style={{
                                    backgroundImage: `url(${framesImg})`,
                                    backgroundPosition: bgPos(0, sliceConfig.top),
                                    width: sliceConfig.left,
                                    imageRendering: 'pixelated',
                                    backgroundRepeat: 'repeat-y'
                                }} />

                                {/* Center */}
                                <div style={{
                                    backgroundImage: `url(${framesImg})`,
                                    backgroundPosition: bgPos(sliceConfig.left, sliceConfig.top),
                                    imageRendering: 'pixelated',
                                    // backgroundRepeat: 'repeat' 
                                    backgroundColor: 'rgba(0,0,0,0.5)' // content bg
                                }} className="flex items-center justify-center text-white/50 text-[10px]">
                                    Content
                                </div>

                                {/* Middle Right */}
                                <div style={{
                                    backgroundImage: `url(${framesImg})`,
                                    backgroundPosition: bgPos(sliceConfig.width - sliceConfig.right, sliceConfig.top),
                                    width: sliceConfig.right,
                                    imageRendering: 'pixelated',
                                    backgroundRepeat: 'repeat-y'
                                }} />

                                {/* Bottom Left */}
                                <div style={{
                                    backgroundImage: `url(${framesImg})`,
                                    backgroundPosition: bgPos(0, sliceConfig.height - sliceConfig.bottom),
                                    width: sliceConfig.left,
                                    height: sliceConfig.bottom,
                                    imageRendering: 'pixelated'
                                }} />

                                {/* Bottom Center */}
                                <div style={{
                                    backgroundImage: `url(${framesImg})`,
                                    backgroundPosition: bgPos(sliceConfig.left, sliceConfig.height - sliceConfig.bottom),
                                    height: sliceConfig.bottom,
                                    imageRendering: 'pixelated',
                                    backgroundRepeat: 'repeat-x'
                                }} />

                                {/* Bottom Right */}
                                <div style={{
                                    backgroundImage: `url(${framesImg})`,
                                    backgroundPosition: bgPos(sliceConfig.width - sliceConfig.right, sliceConfig.height - sliceConfig.bottom),
                                    width: sliceConfig.right,
                                    height: sliceConfig.bottom,
                                    imageRendering: 'pixelated'
                                }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

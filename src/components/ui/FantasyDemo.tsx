
import React from 'react';
import { FantasyButton } from './FantasyButton';
import { FantasyPanel } from './FantasyPanel';
import { FantasyIcon } from './FantasyIcon';
import framesImg from '../../assets/ui/fantasy/UI_Frames.png';
import { FantasyBook } from './FantasyBook';
import { useState } from 'react';

const FantasyDemo: React.FC = () => {
    const [isBookOpen, setIsBookOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-900 p-8 flex flex-col items-center gap-8 font-fantasy text-white">
            <div className="flex flex-col gap-2 w-full max-w-4xl text-center">
                <h1 className="text-4xl text-amber-400 drop-shadow-lg">Cute Fantasy UI Demo</h1>
                {/* Debug: Check if image loads raw */}
                <div className="bg-white/10 p-2 rounded">
                    <p className="text-xs mb-1">Raw Image Check:</p>
                    <img
                        src={framesImg}
                        alt="Debug Check"
                        className="h-16 mx-auto border border-red-500"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML += '<span class="text-red-500 font-bold">❌ Image Failed to Load</span>';
                        }}
                    />
                </div>
                <FantasyButton
                    label="Open Sprite Debugger"
                    className="text-xs bg-slate-800 border border-slate-600"
                    onClick={() => {
                        window.location.hash = '#debug';
                        window.location.reload(); // Simple reload to pick up hash change in App.tsx logic
                    }}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {/* Buttons Section */}
                <section className="flex flex-col gap-4">
                    <h2 className="text-2xl text-amber-200">Buttons</h2>
                    <div className="flex flex-wrap gap-4">
                        <FantasyButton label="Start Game" onClick={() => alert('Start!')} />
                        <FantasyButton variant="secondary" label="Settings" />
                        <FantasyButton label="Start Game" onClick={() => alert('Start!')} />
                        <FantasyButton variant="secondary" label="Settings" />
                        <FantasyButton disabled label="Load Game" />
                        <FantasyButton label="Open Journal" onClick={() => setIsBookOpen(true)} className="bg-amber-700 text-amber-100 border-amber-900" />
                    </div>
                </section>

                <FantasyBook isOpen={isBookOpen} onClose={() => setIsBookOpen(false)} />

                {/* Icons Section */}
                <section className="flex flex-col gap-4">
                    <h2 className="text-2xl text-amber-200">Icons</h2>
                    <div className="flex gap-4 items-center">
                        <FantasyIcon icon="sword" size="lg" />
                        <FantasyIcon icon="shield" size="md" />
                        <FantasyIcon icon="heart" size="sm" />
                        <FantasyIcon icon="coin" size="md" />
                    </div>
                </section>

                {/* Panels Section */}
                <section className="col-span-1 md:col-span-2 flex flex-col gap-4">
                    <h2 className="text-2xl text-amber-200">Panels (9-Slice)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FantasyPanel variant="wood" className="h-64 flex flex-col items-center justify-center p-8">
                            <h3 className="text-xl text-amber-900 mb-4">Wood Panel</h3>
                            <p className="text-amber-800 text-center">
                                This panel uses 9-slice scaling using CSS border-image.
                                It should stretch perfectly without distorting the corners.
                            </p>
                            <div className="mt-4 flex gap-2">
                                <FantasyIcon icon="coin" size="sm" />
                                <span className="text-amber-900">100 Gold</span>
                            </div>
                        </FantasyPanel>

                        <FantasyPanel variant="paper" className="h-64 flex flex-col items-center justify-center p-8">
                            <h3 className="text-xl text-slate-900 mb-4">Paper Panel</h3>
                            <p className="text-slate-800 text-center">
                                A lighter variant for letters or quests.
                            </p>
                            <div className="mt-4">
                                <FantasyButton label="Accept Quest" className="text-sm" />
                            </div>
                        </FantasyPanel>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default FantasyDemo;

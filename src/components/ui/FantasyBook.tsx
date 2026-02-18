import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import bookOpen from '../../assets/ui/fantasy/panels/book_open.png';
import tabRed from '../../assets/ui/fantasy/panels/tab_red.png';
import tabBlue from '../../assets/ui/fantasy/panels/tab_blue.png';
import tabGreen from '../../assets/ui/fantasy/panels/tab_green.png';
import tabYellow from '../../assets/ui/fantasy/panels/tab_yellow.png';

interface FantasyBookProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
}

type BookPage = 'log' | 'bestiary' | 'recipes' | 'map';

const PAGES: Record<BookPage, { title: string; content: React.ReactNode; tab: string }> = {
    log: {
        title: "Quest Log",
        tab: tabRed,
        content: (
            <>
                <p className="mb-4">Current Objectives:</p>
                <ul className="list-disc pl-4 space-y-2 text-sm">
                    <li>Find the Lost Sword of Dalaran</li>
                    <li>Gather 5 Wolf Pelts</li>
                    <li className="line-through text-slate-500">Talk to the Innkeeper</li>
                </ul>
            </>
        )
    },
    bestiary: {
        title: "Beastiary",
        tab: tabBlue,
        content: (
            <>
                <p className="mb-4">Known Creatures:</p>
                <div className="space-y-4">
                    <div className="border border-amber-900/10 p-2 rounded bg-amber-50">
                        <h4 className="font-bold">Dire Wolf</h4>
                        <p className="text-xs italic">Fierce predator of the northern woods.</p>
                    </div>
                    <div className="border border-amber-900/10 p-2 rounded bg-amber-50">
                        <h4 className="font-bold">Goblin Scout</h4>
                        <p className="text-xs italic">Small, sneaky, and annoying.</p>
                    </div>
                </div>
            </>
        )
    },
    recipes: {
        title: "Crafting",
        tab: tabGreen,
        content: <p>Recipes will appear here.</p>
    },
    map: {
        title: "Map",
        tab: tabYellow,
        content: <p>Map of the world.</p>
    }
};

export const FantasyBook: React.FC<FantasyBookProps> = ({ isOpen, onClose }) => {
    const [activePage, setActivePage] = useState<BookPage>('log');

    const renderTab = (page: BookPage, topOffset: number) => {
        const isActive = activePage === page;
        const pageConfig = PAGES[page];

        return (
            <button
                onClick={() => setActivePage(page)}
                aria-label={pageConfig.title}
                title={pageConfig.title}
                className={`absolute right-[-28px] w-[34px] h-[18px] flex items-center justify-center transition-transform ${isActive ? 'translate-x-[-2px]' : 'hover:translate-x-[-1px]'}`}
                style={{
                    top: `${topOffset}%`,
                    backgroundImage: `url(${pageConfig.tab})`,
                    imageRendering: 'pixelated',
                    zIndex: isActive ? 10 : 0
                }}
            />
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        className="relative"
                        style={{
                            width: 'var(--book-width, 700px)',
                            aspectRatio: '227/134',
                        }}
                    >
                        {/* Book Background */}
                        <img
                            src={bookOpen}
                            alt="Open Book"
                            className="absolute inset-0 w-full h-full object-contain image-rendering-pixelated drop-shadow-2xl"
                        />

                        {/* Tabs */}
                        {renderTab('log', 15)}
                        {renderTab('bestiary', 25)}
                        {renderTab('recipes', 35)}
                        {renderTab('map', 45)}

                        {/* Content Layer */}
                        <div className="absolute inset-0 grid grid-cols-2 p-[6%] gap-[4%] pt-[8%] pb-[8%] font-serif text-slate-900 overflow-hidden">
                            {/* Left Page */}
                            <div className="px-4 py-2 overflow-y-auto custom-scrollbar">
                                <h2 className="text-2xl font-bold mb-4 font-medieval text-amber-900 border-b-2 border-amber-900/20 pb-2">
                                    {PAGES[activePage].title}
                                </h2>
                                {PAGES[activePage].content}
                            </div>

                            {/* Right Page (Static or dynamic?) */}
                            <div className="px-4 py-2 overflow-y-auto custom-scrollbar flex flex-col justify-between">
                                <div>
                                    <h3 className="text-lg font-bold mb-2 text-amber-800">Notes</h3>
                                    <div className="bg-amber-100/50 p-2 rounded text-sm italic border border-amber-900/10 min-h-[100px]">
                                        "The winds are changing..."
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <FantasyButton variant="danger" onClick={onClose} className="scale-75 origin-bottom-right">
                                        Close Book
                                    </FantasyButton>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

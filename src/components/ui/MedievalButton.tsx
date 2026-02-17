import React from 'react';

type MedievalButtonProps = {
    onClick?: () => void;
    label: string;
    variant?: 'primary' | 'secondary'; // primary = dark scroll, secondary = tan scroll
    className?: string;
    disabled?: boolean;
};

/**
 * A flexible button that stretches horizontally using 3-slice (Left, Middle, Right).
 * Includes "Avant-Garde" press animation (Y-offset).
 */
export const MedievalButton = ({ onClick, label, variant = 'primary', className = '', disabled }: MedievalButtonProps) => {

    // Coordinates based on guide
    // Dark Scroll: Left(5,6), Mid(6,6), Right(12,6)
    // Tan Scroll:  Left(5,5), Mid(6,5), Right(12,5)

    const yRow = variant === 'primary' ? 6 : 5;
    const spriteUrl = "url('/assets/sprites/ui/MediavelFree.png')";
    const size = 16;
    const bgPos = (x: number, y: number) => `-${x * size}px -${y * size}px`;

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                group relative flex items-center justify-center select-none outline-none
                active:translate-y-[1px] transition-transform duration-75
                ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}
                ${className}
            `}
            style={{ height: 16 }} // Sprite height is fixed at 16px (1 row)
        >
            {/* Left Cap */}
            <div className="w-4 h-4 shrink-0" style={{ background: `${spriteUrl} ${bgPos(5, yRow)}`, imageRendering: 'pixelated' }} />

            {/* Middle Body (Stretches) */}
            <div
                className="h-4 flex items-center justify-center px-2 min-w-[32px]"
                style={{ background: `${spriteUrl} ${bgPos(6, yRow)}`, imageRendering: 'pixelated' }}
            >
                <span className={`
                    font-sans text-[10px] uppercase font-bold tracking-widest translate-y-[1px]
                    ${variant === 'primary' ? 'text-amber-100 drop-shadow-md' : 'text-amber-900'}
                `}>
                    {label}
                </span>
            </div>

            {/* Right Cap */}
            <div className="w-4 h-4 shrink-0" style={{ background: `${spriteUrl} ${bgPos(12, yRow)}`, imageRendering: 'pixelated' }} />
        </button>
    );
};

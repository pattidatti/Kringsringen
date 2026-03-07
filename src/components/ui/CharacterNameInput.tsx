/**
 * CharacterNameInput – Modal for entering character name after class selection
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyPanel } from './FantasyPanel';
import { FantasyButton } from './FantasyButton';

// ─── Props ──────────────────────────────────────────────────────────────────

interface CharacterNameInputProps {
    /** Default name (e.g., class display name) */
    defaultName: string;
    /** Called when user confirms name */
    onConfirm: (name: string) => void;
    /** Called when user cancels */
    onCancel: () => void;
    /** Optional: show the modal */
    isOpen: boolean;
}

// ─── Validation ─────────────────────────────────────────────────────────────

const MAX_NAME_LENGTH = 20;
const NAME_REGEX = /^[a-zA-ZæøåÆØÅ\s]{1,20}$/;

function validateName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
        return { valid: false, error: 'Navnet kan ikke være tomt' };
    }
    if (name.length > MAX_NAME_LENGTH) {
        return { valid: false, error: `Maks ${MAX_NAME_LENGTH} tegn` };
    }
    if (!NAME_REGEX.test(name)) {
        return { valid: false, error: 'Kun bokstaver og mellomrom' };
    }
    return { valid: true };
}

// ─── Main Component ─────────────────────────────────────────────────────────

export const CharacterNameInput: React.FC<CharacterNameInputProps> = ({
    defaultName,
    onConfirm,
    onCancel,
    isOpen,
}) => {
    const [name, setName] = useState(defaultName);
    const [error, setError] = useState<string | null>(null);
    const [shake, setShake] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isOpen]);

    const handleConfirm = () => {
        const validation = validateName(name);
        if (!validation.valid) {
            setError(validation.error || 'Ugyldig navn');
            setShake(true);
            setTimeout(() => setShake(false), 500);
            return;
        }
        onConfirm(name.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        setError(null);

        // Live validation feedback
        if (newName.length > 0) {
            const validation = validateName(newName);
            if (!validation.valid) {
                setError(validation.error || null);
            }
        }
    };

    const remainingChars = MAX_NAME_LENGTH - name.length;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[600] flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onCancel}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative z-10 w-full max-w-md mx-6"
                    >
                        <FantasyPanel variant="paper" contentPadding="p-8">
                            {/* Header */}
                            <div className="text-center mb-6">
                                <h2 className="font-cinzel text-2xl font-bold tracking-[0.15em] uppercase text-amber-900 mb-2">
                                    Navngi Karakter
                                </h2>
                                <div className="h-0.5 w-32 bg-gradient-to-r from-transparent via-amber-900/50 to-transparent mx-auto mb-3" />
                                <p className="font-crimson text-amber-800/70 text-sm">
                                    Velg et navn for din helt
                                </p>
                            </div>

                            {/* Input field */}
                            <motion.div
                                animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                                transition={{ duration: 0.4 }}
                                className="mb-6"
                            >
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={name}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    maxLength={MAX_NAME_LENGTH}
                                    placeholder="Skriv navnet her..."
                                    className={`w-full px-4 py-3 rounded-lg border-2 bg-white text-amber-900 font-cinzel text-lg font-bold text-center focus:outline-none transition-colors
                                        ${error
                                            ? 'border-red-500 focus:border-red-600'
                                            : 'border-amber-300 focus:border-amber-500'
                                        }
                                    `}
                                    aria-label="Character name input"
                                />

                                {/* Character counter */}
                                <div className="flex items-center justify-between mt-2 px-2">
                                    <span
                                        className={`font-cinzel text-xs tracking-widest ${error ? 'text-red-600' : 'text-amber-700/60'
                                            }`}
                                    >
                                        {error || '\u00A0'}
                                    </span>
                                    <span
                                        className={`font-cinzel text-xs tracking-widest ${remainingChars < 5 ? 'text-amber-900' : 'text-amber-700/40'
                                            }`}
                                    >
                                        {remainingChars} igjen
                                    </span>
                                </div>
                            </motion.div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <FantasyButton
                                    label="Avbryt"
                                    variant="secondary"
                                    onClick={onCancel}
                                    className="flex-1 text-base !text-black [text-shadow:none]"
                                />
                                <FantasyButton
                                    label="Bekreft"
                                    variant="primary"
                                    onClick={handleConfirm}
                                    className="flex-1 text-base !text-black [text-shadow:none]"
                                    disabled={!name || name.trim().length === 0}
                                />
                            </div>
                        </FantasyPanel>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

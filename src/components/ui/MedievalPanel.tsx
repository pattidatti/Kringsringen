import React from 'react';

type MedievalPanelProps = {
    className?: string;
    children?: React.ReactNode;
    style?: React.CSSProperties;
};

/**
 * A robust 9-slice panel using a custom-reconstructed 48x48 master asset.
 * This ensures zero texture bleeding, zero chain artifacts, and seamless wood grain.
 */
export const MedievalPanel = ({ className = '', children, style }: MedievalPanelProps) => {
    return (
        <div
            className={`m-panel-9slice flex flex-col pointer-events-auto ${className}`}
            style={style}
        >
            <div className="m-panel-content relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

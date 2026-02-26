import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────
//  Extend Window so TypeScript knows about the AdSense global
// ─────────────────────────────────────────────────────────────
declare global {
    interface Window {
        adsbygoogle: Record<string, unknown>[];
    }
}

interface AdSenseAdProps {
    /** Your AdSense publisher ID – e.g. "ca-pub-1234567890123456" */
    adClient: string;
    /** The ad-unit slot ID from your AdSense dashboard */
    adSlot: string;
    /** Max pixel width for the container (default 300) */
    width?: number;
}

/**
 * Renders a single Google AdSense ad unit (auto format, responsive).
 *
 * The adsbygoogle.js script must already be present in index.html
 * (see the <script async> tag in <head>).
 */
export const AdSenseAd: React.FC<AdSenseAdProps> = ({
    adClient,
    adSlot,
    width = 300,
}) => {
    const pushed = useRef(false);

    useEffect(() => {
        // Guard against React StrictMode double-invocation
        if (pushed.current) return;
        pushed.current = true;

        try {
            (window.adsbygoogle = window.adsbygoogle ?? []).push({});
        } catch {
            // AdSense blocked / script not loaded – fail silently
        }
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2, ease: 'easeOut' }}
            style={{ width }}
            className="overflow-hidden rounded-sm"
            // Prevent the ad area from triggering game interactions
            onMouseDown={e => e.stopPropagation()}
        >
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={adClient}
                data-ad-slot={adSlot}
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </motion.div>
    );
};

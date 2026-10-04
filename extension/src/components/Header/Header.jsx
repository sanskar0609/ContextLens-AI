import React from 'react';
import './Header.css';

/**
 * Header — top bar of the Side Panel
 *
 * Props:
 *  - pageUrl {string}  — The URL of the currently active Chrome tab
 *  - onSettings {func} — Called when the settings icon is clicked
 */
function Header({ pageUrl, onSettings }) {
    // Derive a short domain from the full URL for the indicator
    const domain = React.useMemo(() => {
        if (!pageUrl) return null;
        try {
            return new URL(pageUrl).hostname.replace(/^www\./, '');
        } catch {
            return null;
        }
    }, [pageUrl]);

    return (
        <header className="header" role="banner">
            {/* ── Brand ── */}
            <div className="header__brand">
                <div className="header__logo" aria-hidden="true">
                    <LogoIcon />
                </div>
                <span className="header__name">ContextLens AI</span>
            </div>

            {/* ── Page Indicator ── */}
            {domain && (
                <div className="header__page-indicator" title={pageUrl}>
                    <span className="header__page-dot" aria-hidden="true" />
                    <span className="header__page-domain truncate">{domain}</span>
                </div>
            )}

            {/* ── Settings ── */}
            <button
                id="header-settings-btn"
                className="header__settings-btn"
                onClick={onSettings}
                aria-label="Open settings"
                title="Settings"
            >
                <SettingsIcon />
            </button>
        </header>
    );
}

/* ── Inline SVG icons ────────────────────────────────── */
function LogoIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
            />
            <path
                d="M8 12h8M12 8v8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

function SettingsIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default Header;

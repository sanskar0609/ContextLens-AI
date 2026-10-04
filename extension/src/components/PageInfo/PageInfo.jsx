import React from 'react';
import './PageInfo.css';

/**
 * PageInfo — displays info about the currently active webpage,
 * including live extraction status and content statistics.
 *
 * Props:
 *  - title           {string}   — Page document title
 *  - url             {string}   — Full page URL
 *  - extractionStatus {string}  — 'idle' | 'extracting' | 'ready' | 'error'
 *  - wordCount       {number}   — Words extracted from the page
 *  - charCount       {number}   — Characters extracted
 *  - truncated       {boolean}  — True if content was capped at 50k chars
 *  - errorMessage    {string}   — Error text when status === 'error'
 *  - onRefresh       {function} — Called when "Refresh" button is clicked
 */
function PageInfo({
    title,
    url,
    extractionStatus = 'idle',
    wordCount = 0,
    charCount = 0,
    truncated = false,
    errorMessage = '',
    onRefresh,
}) {
    const domain = React.useMemo(() => {
        if (!url) return null;
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return null;
        }
    }, [url]);

    const statusMeta = STATUS_MAP[extractionStatus] ?? STATUS_MAP.idle;
    const displayTitle = title || 'No page loaded';
    const isExtracting = extractionStatus === 'extracting' || extractionStatus === 'indexing';
    const hasContent = (extractionStatus === 'ready' || extractionStatus === 'indexed') && wordCount > 0;

    return (
        <section className="page-info" aria-label="Current page information">

            {/* ── Row 1: title + status pill ── */}
            <div className="page-info__row page-info__row--top">
                <div className="page-info__text">
                    <p className="page-info__title truncate" title={displayTitle}>
                        {displayTitle}
                    </p>
                    {domain && (
                        <p className="page-info__domain truncate" title={url}>
                            <GlobeIcon />
                            <span>{domain}</span>
                        </p>
                    )}
                </div>

                <div className="page-info__right">
                    {/* Status pill */}
                    <div
                        className={`page-info__status page-info__status--${extractionStatus}`}
                        role="status"
                        aria-live="polite"
                        aria-label={`Extraction status: ${statusMeta.label}`}
                    >
                        <span
                            className={`page-info__status-dot${isExtracting ? ' page-info__status-dot--pulse' : ''}`}
                            aria-hidden="true"
                        />
                        <span className="page-info__status-label">{statusMeta.label}</span>
                    </div>

                    {/* Refresh button */}
                    {onRefresh && (
                        <button
                            id="page-info-refresh-btn"
                            className={`page-info__refresh${isExtracting ? ' page-info__refresh--spinning' : ''}`}
                            onClick={onRefresh}
                            disabled={isExtracting}
                            title={isExtracting ? 'Extracting…' : 'Refresh page content'}
                            aria-label="Refresh page content"
                        >
                            <RefreshIcon />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Row 2: content stats (only when content is loaded) ── */}
            {hasContent && (
                <div className="page-info__row page-info__row--stats">
                    <div className="page-info__stats">
                        <StatChip
                            icon={<WordsIcon />}
                            label={`${formatNumber(wordCount)} words`}
                        />
                        <span className="page-info__stats-sep" aria-hidden="true">·</span>
                        <StatChip
                            icon={<CharsIcon />}
                            label={`${formatNumber(charCount)} chars`}
                        />
                        {truncated && (
                            <>
                                <span className="page-info__stats-sep" aria-hidden="true">·</span>
                                <span className="page-info__truncated-badge" title="Content was capped at 50 000 characters">
                                    truncated
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Row 3: error message ── */}
            {extractionStatus === 'error' && errorMessage && (
                <div className="page-info__row page-info__row--error" role="alert">
                    <ErrorIcon />
                    <span className="page-info__error-text">{errorMessage}</span>
                </div>
            )}
        </section>
    );
}

/* ── Stat chip (icon + label) ───────────────────────── */
function StatChip({ icon, label }) {
    return (
        <span className="page-info__stat-chip">
            <span className="page-info__stat-icon" aria-hidden="true">{icon}</span>
            <span>{label}</span>
        </span>
    );
}

/* ── Status map ─────────────────────────────────────── */
const STATUS_MAP = {
    idle: {
        label: 'No page loaded',
    },
    extracting: {
        label: 'Extracting DOM…',
    },
    ready: {
        label: 'Extraction complete',
    },
    indexing: {
        label: 'Analyzing page…',
    },
    indexed: {
        label: 'Page indexed successfully',
    },
    error: {
        label: 'Analysis failed',
    },
};

/* ── Helpers ─────────────────────────────────────────── */
function formatNumber(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
}

/* ── Inline SVG icons ────────────────────────────────── */
function GlobeIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}

function RefreshIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1 20v-6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function WordsIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

function CharsIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ErrorIcon() {
    return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

export default PageInfo;

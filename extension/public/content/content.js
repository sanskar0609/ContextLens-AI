/**
 * content.js — ContextLens AI Content Script (Message Handler)
 *
 * Loaded AFTER extractor.js (see manifest content_scripts order).
 * extractor.js defines extractPageContent() in our shared scope —
 * this file wires it to the Chrome message-passing system.
 *
 * Message Protocol
 * ─────────────────
 *   Incoming (from Background SW):
 *     { type: 'PING' }
 *       → Reply: { type: 'PONG', url }
 *
 *     { type: 'EXTRACT_CONTENT' }
 *       → Reply: ExtractionResult (see extractor.js)
 *
 * Important: sendResponse must be called synchronously here because
 * extractPageContent() is a synchronous function.
 * We return `false` from the listener to signal that.
 */

(function () {
    'use strict';

    console.log('[ContextLens] Content script loaded on:', window.location.href);

    /* ────────────────────────────────────────────────────────────────────────
       Verify extractor.js was loaded before us
    ──────────────────────────────────────────────────────────────────────── */
    if (typeof extractPageContent !== 'function') {
        console.error('[ContextLens] extractor.js was not loaded before content.js!');
    }

    /* ────────────────────────────────────────────────────────────────────────
       Message listener
    ──────────────────────────────────────────────────────────────────────── */
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        console.log('[ContextLens] Content script received:', message.type);

        /* ── PING — liveness check from the background SW ── */
        if (message.type === 'PING') {
            sendResponse({ type: 'PONG', url: window.location.href });
            return false; // synchronous response
        }

        /* ── EXTRACT_CONTENT — run the extractor and reply ── */
        if (message.type === 'EXTRACT_CONTENT') {
            if (typeof extractPageContent !== 'function') {
                sendResponse({
                    success: false,
                    error: 'Extractor function not available. Check script load order.',
                    title: document.title || '',
                    url: window.location.href,
                    hostname: window.location.hostname,
                    text: '',
                    headings: [],
                    paragraphs: [],
                    wordCount: 0,
                    charCount: 0,
                    extractedAt: new Date().toISOString(),
                    truncated: false,
                });
                return false;
            }

            try {
                /* extractPageContent is synchronous — safe to sendResponse immediately */
                var result = extractPageContent();
                sendResponse(result);
            } catch (err) {
                console.error('[ContextLens] Extraction threw:', err);
                sendResponse({
                    success: false,
                    error: err.message || 'Unexpected extraction error',
                    title: document.title || '',
                    url: window.location.href,
                    hostname: window.location.hostname,
                    text: '',
                    headings: [],
                    paragraphs: [],
                    wordCount: 0,
                    charCount: 0,
                    extractedAt: new Date().toISOString(),
                    truncated: false,
                });
            }

            return false; // synchronous — no need to keep the channel open
        }

        /* ── Unknown message type — ignore gracefully ── */
        return false;
    });

})();

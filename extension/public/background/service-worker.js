/**
 * service-worker.js — ContextLens AI Background Service Worker
 *
 * Lives at: public/background/service-worker.js  (Vite copies → dist/background/)
 * Manifest:  "background": { "service_worker": "background/service-worker.js", "type": "module" }
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Message Routing (the full relay chain)
 * ══════════════════════════════════════════════════════════════════════════
 *
 *   Side Panel  ──EXTRACT_CONTENT──►  Service Worker
 *                                          │
 *                                          │  chrome.tabs.sendMessage
 *                                          ▼
 *                                     Content Script
 *                                     (runs extractor)
 *                                          │
 *                                          │  sendResponse (sync)
 *                                          ▼
 *   Side Panel  ◄──ExtractionResult──  Service Worker
 *
 *   Side Panel  ──GET_TAB_INFO──►  Service Worker
 *   Side Panel  ◄──{title, url}──  Service Worker
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Why the relay?
 *   The Side Panel page runs at chrome-extension://<id>/index.html and
 *   CANNOT call chrome.tabs.sendMessage() directly — only scripts with
 *   the "tabs" permission running in the background context can do that.
 *   The service worker acts as the trusted intermediary.
 * ══════════════════════════════════════════════════════════════════════════
 */

'use strict';

/* ── 1. Open Side Panel when the action icon is clicked ─────────────────── */
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(function (err) {
        console.error('[ContextLens SW] setPanelBehavior error:', err);
    });

/* ── 2. Central message router ──────────────────────────────────────────── */
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    var type = message && message.type;
    console.log('[ContextLens SW] Message received:', type, '| from:', sender.tab ? ('tab ' + sender.tab.id) : 'extension');

    switch (type) {

        case 'EXTRACT_CONTENT':
            /* Async: must return true to keep the channel open */
            _handleExtractContent(sendResponse);
            return true;

        case 'GET_TAB_INFO':
            _handleGetTabInfo(sendResponse);
            return true;

        default:
            /* Unknown message — echo back for debugging */
            sendResponse({ status: 'unknown_message', type: type });
            return false;
    }
});

/* ── 3. Handlers ────────────────────────────────────────────────────────── */

/**
 * EXTRACT_CONTENT handler
 *
 * Steps:
 *  1. Find the active tab
 *  2. Guard against chrome:// / extension pages (content scripts don't run there)
 *  3. Send EXTRACT_CONTENT to the tab's content script
 *  4. If the content script isn't loaded yet, fall back to chrome.scripting.executeScript
 *  5. Relay the result back to the side panel via sendResponse
 */
async function _handleExtractContent(sendResponse) {
    var tab;

    try {
        var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        tab = tabs && tabs[0];

        if (!tab) {
            sendResponse(_errorResult('No active tab found.'));
            return;
        }

        /* ── Guard: browser-internal pages ── */
        var url = tab.url || '';
        if (
            url.startsWith('chrome://') ||
            url.startsWith('chrome-extension://') ||
            url.startsWith('edge://') ||
            url.startsWith('about:') ||
            url.startsWith('data:') ||
            url === ''
        ) {
            sendResponse({
                success: false,
                error: 'Content cannot be extracted from browser-internal pages.',
                title: tab.title || '',
                url: url,
                hostname: '',
                text: '',
                headings: [],
                paragraphs: [],
                wordCount: 0,
                charCount: 0,
                extractedAt: new Date().toISOString(),
                truncated: false,
            });
            return;
        }

        /* ── Primary path: content script is already injected ── */
        try {
            var result = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CONTENT' });
            sendResponse(result);
            return;
        } catch (msgErr) {
            /* Content script not yet injected on this tab (e.g. pre-loaded tab).
               Fall back to programmatic injection via chrome.scripting. */
            console.warn('[ContextLens SW] tabs.sendMessage failed, trying scripting fallback:', msgErr.message);
        }

        /* ── Fallback: inject scripts programmatically ── */
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id, allFrames: false },
                files: ['content/extractor.js'],
            });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id, allFrames: false },
                files: ['content/content.js'],
            });

            /* Brief pause so the listener registration settles */
            await _sleep(80);

            var fallbackResult = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CONTENT' });
            sendResponse(fallbackResult);

        } catch (injectErr) {
            console.error('[ContextLens SW] Scripting injection failed:', injectErr.message);
            sendResponse(_errorResult(
                'Could not inject content script: ' + (injectErr.message || 'permission denied')
            ));
        }

    } catch (outerErr) {
        console.error('[ContextLens SW] Outer extraction error:', outerErr);
        sendResponse(_errorResult(outerErr.message || 'Unexpected service worker error'));
    }
}

/**
 * GET_TAB_INFO handler
 * Returns basic tab metadata without running extraction.
 */
async function _handleGetTabInfo(sendResponse) {
    try {
        var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        var tab = tabs && tabs[0];

        if (tab) {
            sendResponse({
                success: true,
                title: tab.title || '',
                url: tab.url || '',
                tabId: tab.id,
                favIconUrl: tab.favIconUrl || '',
            });
        } else {
            sendResponse({ success: false, error: 'No active tab.' });
        }
    } catch (err) {
        sendResponse({ success: false, error: err.message });
    }
}

/* ── Utilities ──────────────────────────────────────────────────────────── */

function _errorResult(errorMsg) {
    return {
        success: false,
        error: errorMsg,
        title: '',
        url: '',
        hostname: '',
        text: '',
        headings: [],
        paragraphs: [],
        wordCount: 0,
        charCount: 0,
        extractedAt: new Date().toISOString(),
        truncated: false,
    };
}

function _sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

console.log('[ContextLens SW] Service worker started.');

// ── Context Menu: handle text selection ──────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "ask_contextlens",
        title: "Ask ContextLens AI",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "ask_contextlens" && info.selectionText) {
        // 1. Open the side panel for the current window if not already open
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(err => {
            console.log('[ContextLens] Could not open side panel natively:', err);
        });

        // 2. Send the selected text to the React application in the side panel
        // Add a slight delay to ensure the side panel has time to initialize if it was closed
        setTimeout(() => {
            chrome.runtime.sendMessage({
                type: 'SELECTED_TEXT',
                text: info.selectionText
            }).catch(err => {
                console.log('[ContextLens] Side panel possibly not ready yet:', err);
            });
        }, 300);
    }
});

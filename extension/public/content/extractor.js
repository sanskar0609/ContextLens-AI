/**
 * extractor.js — ContextLens AI DOM Content Extractor
 *
 * Loaded as the FIRST content script (before content.js) so its functions
 * are available in the shared content-script scope.
 *
 * Because content scripts CANNOT use ES module imports at runtime, this file
 * uses plain global function declarations. It never touches window directly;
 * the Chrome content-script sandbox provides isolation from the page.
 *
 * Strategy (in priority order):
 *  1. Find a semantic content container (article, main, role="main", …)
 *  2. Clone the container; remove noise (nav, scripts, ads, hidden nodes)
 *  3. Walk text nodes to build clean, de-duplicated text
 *  4. Separately extract headings and paragraph snippets for structure
 *  5. Enforce a 50 000-character cap so downstream models aren't overwhelmed
 *
 * Exported surface (accessible from content.js):
 *   extractPageContent()  →  ExtractionResult
 */

/* ── Selectors to strip entirely ─────────────────────────────────────────── */
var NOISE_SELECTORS = [
    /* scripts & styles */
    'script', 'style', 'noscript', 'template',
    /* embedded content */
    'iframe', 'object', 'embed', 'video', 'audio', 'canvas', 'svg',
    /* navigation chrome */
    'nav', 'header', 'footer', 'aside',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '[role="complementary"]', '[role="search"]',
    /* common class-based noise */
    '.nav', '.navbar', '.navigation', '.menu', '.sidebar',
    '.header', '.footer', '.breadcrumb', '.breadcrumbs',
    '.cookie', '.cookie-banner', '.cookie-notice',
    '.popup', '.modal', '.overlay', '.dialog',
    '.ad', '.ads', '.advertisement', '.advert',
    '.social', '.social-share', '.share-buttons',
    '.related', '.related-posts', '.recommended',
    '.comment', '.comments', '.comment-section',
    /* id-based noise */
    '#nav', '#navbar', '#navigation', '#menu',
    '#header', '#footer', '#sidebar', '#aside',
    '#cookie', '#cookies', '#ad', '#ads',
    /* attribute-based */
    '[aria-hidden="true"]',
    '[data-nosnippet]',
];

/* ── Priority content containers (first match wins) ──────────────────────── */
var CONTENT_SELECTORS = [
    'article',
    '[role="main"]',
    'main',
    /* CMS / blog */
    '.post-content', '.post-body', '.post__content',
    '.article-content', '.article-body',
    '.entry-content', '.entry-body',
    '.content-body', '.content-area', '.page-content',
    '.main-content', '#main-content', '#content-main',
    '#content', '#main',
    /* Documentation */
    '.documentation', '.doc-content', '.docs-content',
    '.markdown-body',   /* GitHub */
    '.rst-content',     /* Sphinx */
    /* Wikipedia */
    '.mw-parser-output',
    /* Substack / Medium */
    '.available-content', '.post__body',
    /* fallback: body */
    'body',
];

/* ── Max characters to keep ──────────────────────────────────────────────── */
var MAX_CHARS = 50000;

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Core helper functions                                                     */
/* ══════════════════════════════════════════════════════════════════════════ */

/**
 * Returns a deep clone of the body with noisy elements removed.
 * We work on a clone to never mutate the live DOM.
 */
function _getCleanedClone() {
    var clone = document.body.cloneNode(true);

    NOISE_SELECTORS.forEach(function (sel) {
        try {
            clone.querySelectorAll(sel).forEach(function (el) {
                el.parentNode && el.parentNode.removeChild(el);
            });
        } catch (_) { /* invalid selector on some pages — skip */ }
    });

    /* Remove elements that are hidden via inline styles or HTML attributes.
       We can't use getComputedStyle on a detached clone, so we check inline. */
    clone.querySelectorAll('*').forEach(function (el) {
        if (
            el.getAttribute('aria-hidden') === 'true' ||
            el.getAttribute('hidden') !== null ||
            el.style.display === 'none' ||
            el.style.visibility === 'hidden' ||
            el.style.opacity === '0'
        ) {
            el.parentNode && el.parentNode.removeChild(el);
        }
    });

    return clone;
}

/**
 * Finds the best content container inside a cleaned clone.
 * Requires at least 120 chars of text to be considered meaningful.
 */
function _findContentContainer(clone) {
    for (var i = 0; i < CONTENT_SELECTORS.length; i++) {
        var sel = CONTENT_SELECTORS[i];
        try {
            var el = clone.querySelector(sel);
            if (el && el.textContent.trim().length > 120) {
                return el;
            }
        } catch (_) { /* skip invalid selectors */ }
    }
    return clone; /* absolute fallback */
}

/**
 * Extracts all headings from a container as structured objects.
 * @returns {Array<{level: number, text: string}>}
 */
function _extractHeadings(container) {
    var els = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    var seen = {};
    var headings = [];

    els.forEach(function (h) {
        var text = h.textContent.trim().replace(/\s+/g, ' ');
        var level = parseInt(h.tagName.charAt(1), 10);
        if (text && text.length > 1 && text.length < 400 && !seen[text]) {
            seen[text] = true;
            headings.push({ level: level, text: text });
        }
    });

    return headings;
}

/**
 * Extracts clean, de-duplicated paragraph text snippets.
 * Useful for future RAG chunking.
 * @returns {string[]}
 */
function _extractParagraphs(container) {
    var els = container.querySelectorAll('p, li, blockquote, figcaption, td, dd');
    var seen = {};
    var paras = [];

    els.forEach(function (p) {
        var text = p.textContent.trim().replace(/\s+/g, ' ');
        if (text && text.length > 25 && !seen[text]) {
            seen[text] = true;
            paras.push(text);
        }
    });

    return paras;
}

/**
 * Walks all text nodes in a container, de-duplicates lines, and
 * joins them into a single readable string.
 */
function _extractTextFromNodes(container) {
    var lines = [];
    var seen = {};

    /* TreeWalker visits every text node in document order */
    var walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
    );

    var node;
    while ((node = walker.nextNode())) {
        var raw = node.textContent;
        if (!raw) continue;

        /* Split on newlines; trim each piece */
        var pieces = raw.split(/\n/);
        pieces.forEach(function (piece) {
            var text = piece.trim().replace(/\s+/g, ' ');
            /* Skip very short tokens and duplicates */
            if (text && text.length > 4 && !seen[text]) {
                seen[text] = true;
                lines.push(text);
            }
        });
    }

    return lines.join('\n');
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Main exported function                                                    */
/* ══════════════════════════════════════════════════════════════════════════ */

/**
 * Extracts meaningful textual content from the current page.
 *
 * @returns {ExtractionResult}
 *
 *   ExtractionResult {
 *     success       : boolean
 *     title         : string
 *     url           : string
 *     hostname      : string
 *     text          : string   — full cleaned text, max 50 000 chars
 *     headings      : Array<{level, text}>
 *     paragraphs    : string[] — top 60 paragraphs
 *     wordCount     : number
 *     charCount     : number
 *     extractedAt   : string   — ISO timestamp
 *     truncated     : boolean
 *     error         : string | null
 *   }
 */
function extractPageContent() {
    try {
        var title = (document.title || '').trim();
        var url = window.location.href;
        var hostname = window.location.hostname.replace(/^www\./, '');

        /* ── Handle empty / shell pages ── */
        if (!document.body || document.body.textContent.trim().length < 10) {
            return {
                success: false,
                title: title, url: url, hostname: hostname,
                text: '', headings: [], paragraphs: [],
                wordCount: 0, charCount: 0,
                extractedAt: new Date().toISOString(),
                truncated: false,
                error: 'Page has no readable content.',
            };
        }

        /* ── Clone & clean ── */
        var clone = _getCleanedClone();
        var container = _findContentContainer(clone);

        /* ── Structured extractions ── */
        var headings = _extractHeadings(container);
        var paragraphs = _extractParagraphs(container);
        var rawText = _extractTextFromNodes(container);

        /* ── Assemble the canonical text block ── */
        var headingBlock = headings
            .map(function (h) { return Array(h.level + 1).join('#') + ' ' + h.text; })
            .join('\n');

        var fullText = [
            'Title: ' + title,
            '',
            headingBlock,
            '',
            rawText,
        ].filter(function (s) { return s !== undefined && s !== null; })
            .join('\n')
            .trim();

        /* ── Enforce size cap ── */
        var truncated = fullText.length > MAX_CHARS;
        var text = truncated
            ? fullText.slice(0, MAX_CHARS) + '\n\n[Content truncated — page is very long]'
            : fullText;

        /* ── Counts ── */
        var words = text.trim().split(/\s+/).filter(function (w) { return w.length > 0; });

        return {
            success: true,
            title: title,
            url: url,
            hostname: hostname,
            text: text,
            headings: headings,
            paragraphs: paragraphs.slice(0, 60),
            wordCount: words.length,
            charCount: text.length,
            extractedAt: new Date().toISOString(),
            truncated: truncated,
            error: null,
        };

    } catch (err) {
        return {
            success: false,
            title: (document.title || '').trim(),
            url: window.location.href,
            hostname: window.location.hostname,
            text: '',
            headings: [],
            paragraphs: [],
            wordCount: 0,
            charCount: 0,
            extractedAt: new Date().toISOString(),
            truncated: false,
            error: err.message || 'Unknown extraction error',
        };
    }
}

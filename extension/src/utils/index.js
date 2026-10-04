/**
 * utils/index.js — Shared utility functions for the extension
 *
 * This file will grow as features are added. For now it just
 * exports a helper that other modules can import during development.
 */

/**
 * Creates a structured message object for chrome.runtime.sendMessage calls.
 * @param {string} type   - Message type identifier (e.g. 'EXTRACT_CONTENT')
 * @param {object} payload - Any data to send with the message
 * @returns {{ type: string, payload: object }}
 */
export function createMessage(type, payload = {}) {
    return { type, payload, timestamp: Date.now() };
}

/**
 * Logs to the console only in development mode.
 * @param  {...any} args
 */
export function devLog(...args) {
    if (import.meta.env.MODE === 'development') {
        console.log('[ContextLens]', ...args);
    }
}

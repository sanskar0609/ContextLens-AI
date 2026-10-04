const API_BASE_URL = 'http://localhost:8000/api/v1';

/**
 * Sends extracted webpage text to the backend for analysis (indexing).
 *
 * @param {Object} data
 * @param {string} data.title
 * @param {string} data.url
 * @param {string} data.hostname
 * @param {string} data.text
 * @returns {Promise<{success: boolean, page_id: string, message: string}>}
 */
export async function analyzePage(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/page/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: data.title || 'Untitled Page',
                url: data.url,
                hostname: data.hostname,
                text: data.text,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server returned ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error('[ContextLens] analyzePage API error:', err);
        throw err;
    }
}

/**
 * Stream a question to the backend and receive an SSE response.
 * @param {string} pageId - The ID of the currently indexed page.
 * @param {string} question - The user's prompt.
 * @param {Object} callbacks - Object with onChunk, onDone, onError.
 * @param {AbortSignal} signal - Abort signal to cancel the request.
 */
export async function streamChatMessage(pageId, question, conversationId, selectedText, callbacks, signal) {
    if (!pageId) throw new Error("Missing pageId for chat request.");
    if (!conversationId) throw new Error("Missing conversationId for chat request.");

    const { onChunk, onDone, onError } = callbacks;

    try {
        const payload = {
            page_id: pageId,
            question: question,
            conversation_id: conversationId,
        };
        if (selectedText) {
            payload.selected_text = selectedText;
        }

        const response = await fetch(`${API_BASE_URL}/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Chat error: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop(); // keep the last incomplete part

            for (const part of parts) {
                if (part.startsWith('data: ')) {
                    const dataStr = part.slice(6);
                    let data;
                    try {
                        data = JSON.parse(dataStr);
                    } catch (e) {
                        console.error('[ContextLens] Parse error on stream part:', e);
                        continue;
                    }

                    if (data.type === 'chunk') {
                        if (onChunk) onChunk(data.content);
                    } else if (data.type === 'done') {
                        if (onDone) onDone(data.sources);
                    } else if (data.type === 'error') {
                        throw new Error(data.content || "An error occurred during generation.");
                    }
                }
            }
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log("Chat stream aborted by user.");
            // Not invoking onError here so we don't accidentally display a real error
        } else {
            console.error('[ContextLens] Stream error:', err);
            if (onError) onError(err);
        }
    }
}

import React, { useRef, useEffect, useCallback } from 'react';
import './ChatInput.css';

/**
 * ChatInput — multiline text area with a send button or stop button.
 *
 * Props:
 *  - value       {string}   — Controlled input value
 *  - onChange    {function} — Called with new value string
 *  - onSend      {function} — Called with the trimmed message to send
 *  - onStop      {function} — Called when user clicks "Stop Generating"
 *  - isDisabled  {boolean}  — Disable while AI is responding (ignoring streaming)
 *  - isStreaming {boolean}  — Show stop button instead of send button
 */
function ChatInput({ value, onChange, onSend, onStop, isDisabled, isStreaming }) {
    const textareaRef = useRef(null);

    /* ── Auto-resize the textarea as the user types ── */
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
    }, [value]);

    /* ── Focus textarea on mount ── */
    useEffect(() => {
        if (!isDisabled && !isStreaming) {
            textareaRef.current?.focus();
        }
    }, [isDisabled, isStreaming]);

    /* ── Handle Enter / Shift+Enter ── */
    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isStreaming) {
                    handleSend();
                }
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value, isDisabled, isStreaming]
    );

    const handleSend = useCallback(() => {
        const trimmed = value.trim();
        if (!trimmed || isDisabled || isStreaming) return;
        onSend(trimmed);
    }, [value, isDisabled, isStreaming, onSend]);

    const canSend = value.trim().length > 0 && !isDisabled;

    return (
        <div
            className={`chat-input${isDisabled ? ' chat-input--disabled' : ''}`}
            role="form"
            aria-label="Message input"
        >
            {/* ── Textarea ── */}
            <textarea
                id="chat-textarea"
                ref={textareaRef}
                className="chat-input__textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about this page…"
                rows={1}
                disabled={isDisabled || isStreaming}
                aria-label="Type your message"
                aria-multiline="true"
            />

            {/* ── Actions row ── */}
            <div className="chat-input__actions">
                <span className="chat-input__hint">
                    {isStreaming ? 'Streaming response…' : isDisabled ? 'AI is responding…' : (
                        <>
                            <kbd>Enter</kbd> to send &middot; <kbd>Shift+Enter</kbd> for new line
                        </>
                    )}
                </span>

                {isStreaming ? (
                    <button
                        type="button"
                        className="chat-input__stop"
                        onClick={onStop}
                        aria-label="Stop generating"
                        title="Stop"
                    >
                        <StopIcon />
                    </button>
                ) : (
                    <button
                        id="chat-send-btn"
                        className={`chat-input__send${canSend ? ' chat-input__send--active' : ''}`}
                        onClick={handleSend}
                        disabled={!canSend}
                        aria-label="Send message"
                        title="Send"
                    >
                        <SendIcon />
                    </button>
                )}
            </div>
        </div>
    );
}

/* ── Send icon ───────────────────────────────────────── */
function SendIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/* ── Stop icon ───────────────────────────────────────── */
function StopIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
    );
}

export default ChatInput;

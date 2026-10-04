import React, { useRef, useEffect } from 'react';
import './Chat.css';
import Message from '../Message/Message.jsx';

/**
 * Chat — the scrollable message list area.
 *
 * Props:
 *  - messages   {Array}   — Array of { id, role, content, timestamp }
 *  - isLoading  {boolean} — Show the AI typing indicator
 */
function Chat({ messages, isLoading }) {
    const bottomRef = useRef(null);

    // Auto-scroll to bottom whenever a new message arrives or loading changes
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const isEmpty = messages.length === 0 && !isLoading;

    return (
        <section
            className="chat"
            role="log"
            aria-label="Conversation"
            aria-live="polite"
        >
            {/* ── Empty state ── */}
            {isEmpty && <EmptyState />}

            {/* ── Messages ── */}
            {!isEmpty && (
                <div className="chat__messages">
                    {messages.map((msg) => (
                        <Message
                            key={msg.id}
                            role={msg.role}
                            content={msg.content}
                            sources={msg.sources}
                            timestamp={msg.timestamp}
                        />
                    ))}

                    {/* ── Loading / typing indicator ── */}
                    {isLoading && <TypingIndicator />}

                    {/* Scroll anchor */}
                    <div ref={bottomRef} aria-hidden="true" />
                </div>
            )}
        </section>
    );
}

/* ── Empty State ─────────────────────────────────────── */
function EmptyState() {
    return (
        <div className="chat__empty" aria-label="No messages yet">
            <div className="chat__empty-icon" aria-hidden="true">
                <EmptyIcon />
            </div>
            <p className="chat__empty-title">Ask anything about this page</p>
            <p className="chat__empty-subtitle">
                Use the suggested prompts below or type your own question.
            </p>
        </div>
    );
}

/* ── Typing indicator (three bouncing dots) ──────────── */
function TypingIndicator() {
    return (
        <div className="chat__typing" role="status" aria-label="AI is thinking">
            <div className="chat__typing-avatar" aria-hidden="true">
                <TypingAIIcon />
            </div>
            <div className="chat__typing-bubble">
                <span className="chat__typing-dot" style={{ animationDelay: '0ms' }} />
                <span className="chat__typing-dot" style={{ animationDelay: '160ms' }} />
                <span className="chat__typing-dot" style={{ animationDelay: '320ms' }} />
            </div>
        </div>
    );
}

function EmptyIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function TypingAIIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
                stroke="currentColor"
                strokeWidth="1.5"
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

export default Chat;

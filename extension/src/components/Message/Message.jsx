import React from 'react';
import './Message.css';

/**
 * Message — renders a single chat message bubble.
 *
 * Props:
 *  - role      {'user' | 'assistant'}  — Who sent the message
 *  - content   {string}                — Raw text (may contain basic markdown)
 *  - timestamp {Date}                  — When the message was sent
 */
function Message({ role, content, timestamp, sources }) {
    const isUser = role === 'user';
    const timeLabel = timestamp
        ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <article
            className={`message message--${role}`}
            aria-label={`${isUser ? 'You' : 'AI'}: ${content}`}
        >
            {/* ── Avatar ── */}
            {!isUser && (
                <div className="message__avatar" aria-hidden="true">
                    <AIAvatarIcon />
                </div>
            )}

            {/* ── Bubble ── */}
            <div className="message__body">
                <div className="message__bubble">
                    <FormattedContent content={content} />

                    {sources && sources.length > 0 && (
                        <div className="message__sources">
                            <div className="message__sources-title">Sources:</div>
                            <ul className="message__sources-list">
                                {sources.map((src, i) => (
                                    <li key={i}>Section/chunk {src.chunk_index}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* ── Timestamp ── */}
                {timeLabel && (
                    <time className="message__time" dateTime={timestamp?.toISOString()}>
                        {timeLabel}
                    </time>
                )}
            </div>

            {/* ── User Avatar ── */}
            {isUser && (
                <div className="message__avatar message__avatar--user" aria-hidden="true">
                    <UserAvatarIcon />
                </div>
            )}
        </article>
    );
}

/**
 * FormattedContent — converts a small subset of Markdown into React elements.
 *
 * Supported:
 *  - **bold**
 *  - Bullet list lines (lines starting with - or •)
 *  - Numbered list lines
 *  - Blank lines → paragraph breaks
 */
function FormattedContent({ content }) {
    if (!content) return null;

    const paragraphs = content.split(/\n\n+/);

    return (
        <>
            {paragraphs.map((para, pIdx) => {
                const lines = para.split('\n');

                // Detect if all lines are bullets / numbered
                const isBulletList = lines.every((l) => /^[-•*]\s/.test(l.trim()));
                const isNumberedList = lines.every((l) => /^\d+\.\s/.test(l.trim()));

                if (isBulletList) {
                    return (
                        <ul key={pIdx} className="message__list">
                            {lines.map((line, i) => (
                                <li key={i}>
                                    <InlineMarkdown text={line.replace(/^[-•*]\s/, '')} />
                                </li>
                            ))}
                        </ul>
                    );
                }

                if (isNumberedList) {
                    return (
                        <ol key={pIdx} className="message__list message__list--ordered">
                            {lines.map((line, i) => (
                                <li key={i}>
                                    <InlineMarkdown text={line.replace(/^\d+\.\s/, '')} />
                                </li>
                            ))}
                        </ol>
                    );
                }

                // Plain paragraph (with possible inline bold)
                return (
                    <p key={pIdx} className="message__paragraph">
                        {lines.map((line, i) => (
                            <React.Fragment key={i}>
                                <InlineMarkdown text={line} />
                                {i < lines.length - 1 && <br />}
                            </React.Fragment>
                        ))}
                    </p>
                );
            })}
        </>
    );
}

/** Renders **bold** inline markdown as <strong> elements */
function InlineMarkdown({ text }) {
    if (!text) return null;

    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </>
    );
}

/* ── Inline SVG Avatars ─────────────────────────────── */
function AIAvatarIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

function UserAvatarIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default Message;

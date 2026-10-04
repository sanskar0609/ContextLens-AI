import React from 'react';
import './SuggestedQuestions.css';

/**
 * SuggestedQuestions — a row of quick-action prompt chips.
 *
 * Displayed when the conversation is empty. Clicking a chip pre-fills and
 * immediately sends the prompt (like clicking Send after typing it).
 *
 * Props:
 *  - onSelect   {function(question: string)} — Called with the chosen prompt
 *  - isDisabled {boolean}                    — Disable while AI is responding
 */

const SUGGESTED_QUESTIONS = [
    {
        id: 'summarize',
        label: 'Summarize this page',
        icon: '◈',
    },
    {
        id: 'about',
        label: 'What is this page about?',
        icon: '◉',
    },
    {
        id: 'main-points',
        label: 'Explain the main points',
        icon: '◎',
    },
    {
        id: 'findings',
        label: 'What are the key findings?',
        icon: '◆',
    },
];

function SuggestedQuestions({ onSelect, isDisabled }) {
    return (
        <section
            className="suggested"
            aria-label="Suggested prompts"
        >
            <p className="suggested__label">Suggested prompts</p>
            <div className="suggested__grid" role="list">
                {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                        key={q.id}
                        id={`suggested-${q.id}`}
                        className="suggested__chip"
                        onClick={() => !isDisabled && onSelect(q.label)}
                        disabled={isDisabled}
                        role="listitem"
                        aria-label={`Ask: ${q.label}`}
                    >
                        <span className="suggested__chip-icon" aria-hidden="true">
                            {q.icon}
                        </span>
                        <span className="suggested__chip-text">{q.label}</span>
                    </button>
                ))}
            </div>
        </section>
    );
}

export default SuggestedQuestions;

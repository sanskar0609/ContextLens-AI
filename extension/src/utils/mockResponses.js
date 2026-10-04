/**
 * utils/mockResponses.js
 *
 * Simulates AI responses locally so the full chat UI can be developed
 * and tested independently of the backend / Gemini API.
 *
 * Rules:
 *  - Each rule has a set of keyword matchers.
 *  - The first matching rule wins.
 *  - A fallback response is returned if no rule matches.
 *  - getMockResponse() returns a Promise that resolves after a simulated delay,
 *    so the loading indicator is properly exercised.
 */

const MOCK_DELAY_MIN_MS = 800;
const MOCK_DELAY_MAX_MS = 1800;

/** Returns a random integer between min and max (inclusive) */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Simulated think time */
const delay = () =>
    new Promise((resolve) =>
        setTimeout(resolve, rand(MOCK_DELAY_MIN_MS, MOCK_DELAY_MAX_MS))
    );

/* ── Response rules ────────────────────────────────────────────────────────── */
const RULES = [
    {
        keywords: ['summarize', 'summary', 'tldr', 'tl;dr', 'overview'],
        response: `**Summary**\n\nThis page appears to cover a detailed topic with multiple sections. Here's a concise overview:\n\n- The page introduces the subject and provides background context\n- Key concepts are explained with supporting examples\n- Several data points or arguments are presented to support the main thesis\n- The content concludes with recommendations or next steps\n\n*Note: This is a mock response. Connect the backend to get a real AI-generated summary.*`,
    },
    {
        keywords: ['about', 'what is', "what's", 'topic', 'subject'],
        response: `**About This Page**\n\nBased on the content structure, this page is about a specific topic that includes:\n\n1. An introduction to the core subject matter\n2. Detailed explanations with structured sections\n3. Supporting evidence or examples\n4. A conclusion or call to action\n\n*Note: This is a mock response. Real analysis requires the backend to be running.*`,
    },
    {
        keywords: ['main points', 'key points', 'explain', 'highlights'],
        response: `**Main Points**\n\nHere are the key takeaways from this page:\n\n• **Point 1** — The primary argument or topic is introduced clearly at the beginning\n• **Point 2** — Supporting details are provided throughout the main body\n• **Point 3** — The content uses examples or data to reinforce its message\n• **Point 4** — A clear conclusion or summary wraps up the content\n\n*Note: This is a mock response. Connect the backend for real extraction.*`,
    },
    {
        keywords: ['findings', 'results', 'data', 'statistics', 'numbers'],
        response: `**Key Findings**\n\nThe page contains several notable findings or data points:\n\n- Finding A: Contextual information relevant to the domain\n- Finding B: Supporting statistics or evidence\n- Finding C: Comparative data or benchmarks\n- Finding D: Conclusions drawn from the evidence\n\nThese findings collectively support the main thesis of the page.\n\n*Note: This is a mock response. Real data extraction requires the full RAG pipeline.*`,
    },
    {
        keywords: ['who', 'author', 'written by', 'created by'],
        response: `**Author / Source Information**\n\nThe author or creator information on this page would typically be found in the byline, footer, or about section. I'll extract and summarize this once the full backend is connected.\n\n*Note: This is a mock response.*`,
    },
    {
        keywords: ['how', 'steps', 'instructions', 'guide', 'tutorial'],
        response: `**How-To Breakdown**\n\nThis page appears to contain instructional content. The general steps described are:\n\n1. Preparation — understanding the prerequisites\n2. Setup — configuring the environment or context\n3. Execution — carrying out the main procedure\n4. Verification — confirming the outcome\n\n*Note: This is a mock response. Real step extraction requires the backend.*`,
    },
];

const FALLBACK_RESPONSE = `I can see you're asking about the current page. Once the backend is connected and the page content is extracted, I'll be able to give you a detailed, accurate answer.\n\nFor now, try one of the suggested prompts like **"Summarize this page"** or **"What are the key findings?"** to see how the UI responds.\n\n*Note: This is a mock response.*`;

/* ── Public API ────────────────────────────────────────────────────────────── */

/**
 * Returns a mock AI response for the given user message.
 * Simulates network latency with an artificial delay.
 *
 * @param {string} userMessage - The raw text the user typed
 * @returns {Promise<string>}  - Markdown-formatted response string
 */
export async function getMockResponse(userMessage) {
    await delay();

    const lower = userMessage.toLowerCase();
    const matched = RULES.find((rule) =>
        rule.keywords.some((kw) => lower.includes(kw))
    );

    return matched ? matched.response : FALLBACK_RESPONSE;
}

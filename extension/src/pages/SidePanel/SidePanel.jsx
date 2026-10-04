import React, { useState, useCallback, useEffect, useRef } from 'react';
import './SidePanel.css';

import Header from '../../components/Header/Header.jsx';
import PageInfo from '../../components/PageInfo/PageInfo.jsx';
import Chat from '../../components/Chat/Chat.jsx';
import ChatInput from '../../components/ChatInput/ChatInput.jsx';
import SuggestedQuestions from '../../components/SuggestedQuestions/SuggestedQuestions.jsx';
import { analyzePage, streamChatMessage } from '../../utils/api.js';

/**
 * SidePanel — root page component mounted by App.jsx.
 *
 * Owns all application state and wires up the backend message passing
 * for content extraction.
 */
function SidePanel() {
    /* ── State ── */
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    /* ── Extraction State ── */
    const [pageInfo, setPageInfo] = useState({ title: '', url: '' });
    const [extractionStatus, setExtractionStatus] = useState('idle'); // 'idle' | 'extracting' | 'indexing' | 'indexed' | 'error'
    const [extractionData, setExtractionData] = useState(null);
    const [pageId, setPageId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    // Keep a ref of the current URL string to avoid redundant extractions
    const lastExtractedUrl = useRef('');

    /* ── Run Content Extraction ── */
    const handleExtract = useCallback((force = false) => {
        // Development mode fallback
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
            setPageInfo({ title: 'ContextLens Dev Mode', url: 'http://localhost:5173' });
            setExtractionStatus('ready');
            setExtractionData({ wordCount: 450, charCount: 3200, truncated: false });
            return;
        }

        setExtractionStatus('extracting');
        setErrorMessage('');

        // Ask the Background Service Worker to trigger the extraction on the active tab
        chrome.runtime.sendMessage({ type: 'EXTRACT_CONTENT' }, async (response) => {
            // Handle closed channels or SW errors
            if (chrome.runtime.lastError) {
                setExtractionStatus('error');
                setErrorMessage(chrome.runtime.lastError.message || 'Extension connection lost.');
                return;
            }

            if (!response) {
                setExtractionStatus('error');
                setErrorMessage('No response received from the content extractor.');
                return;
            }

            // Safe update of URL and Title from the response payload
            setPageInfo({ title: response.title || '', url: response.url || '' });
            lastExtractedUrl.current = response.url || '';

            if (response.success) {
                setExtractionData(response);
                setExtractionStatus('indexing');

                try {
                    // Send to FastAPI Backend
                    const analyzeResponse = await analyzePage(response);
                    setPageId(analyzeResponse.page_id);
                    setExtractionStatus('indexed');
                } catch (backendErr) {
                    setExtractionStatus('error');
                    setPageId(null);
                    setErrorMessage(backendErr.message || 'Failed to analyze page via backend.');
                }
            } else {
                setExtractionStatus('error');
                setPageId(null);
                setErrorMessage(response.error || 'Failed to extract content.');
                console.warn('[ContextLens] Extraction error:', response.error);
            }
        });
    }, []);

    /* ── Listen for Tab Context Changes ── */
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            // Initial extraction when side panel opens
            handleExtract();

            // Fire extraction when user switches to a different tab
            const handleTabActivated = () => {
                // We use a small delay to allow the tab context to become fully active
                setTimeout(() => handleExtract(), 100);
            };

            // Fire extraction when the active tab finishes reloading/navigating
            const handleTabUpdated = (tabId, changeInfo, tab) => {
                if (changeInfo.status === 'complete' && tab.active) {
                    // If we navigate, we should extract
                    if (tab.url !== lastExtractedUrl.current) {
                        handleExtract();
                    }
                }
            };

            chrome.tabs.onActivated.addListener(handleTabActivated);
            chrome.tabs.onUpdated.addListener(handleTabUpdated);

            return () => {
                chrome.tabs.onActivated.removeListener(handleTabActivated);
                chrome.tabs.onUpdated.removeListener(handleTabUpdated);
            };
        } else {
            // Dev mode initial fire
            handleExtract();
        }
    }, [handleExtract]);

    const [isStreaming, setIsStreaming] = useState(false);
    const abortControllerRef = useRef(null);

    const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
    const [selectedTextContext, setSelectedTextContext] = useState(null);

    /* ── Reset conversation on page switch ── */
    useEffect(() => {
        if (pageId) {
            setMessages([]);
            setConversationId(crypto.randomUUID());
            setSelectedTextContext(null); // Clear context on page switch
        }
    }, [pageId]);

    /* ── Listen for Context Menu Selection ── */
    useEffect(() => {
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) return;

        const handleMessage = (message, sender, sendResponse) => {
            if (message.type === 'SELECTED_TEXT' && message.text) {
                setSelectedTextContext(message.text);
                // Optionally auto-focus input
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);
        return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }, []);

    const handleClearChat = useCallback(() => {
        setMessages([]);
        setConversationId(crypto.randomUUID());
        setSelectedTextContext(null);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsStreaming(false);
            setIsLoading(false);
        }
    }, []);

    /* ── Send a message ── */
    const handleSend = useCallback(
        async (text) => {
            if (!text.trim() || isLoading || isStreaming) return;

            const userMessage = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: text.trim(),
                timestamp: new Date(),
            };

            const aiMessageId = `ai-${Date.now()}`;
            const initialAiMessage = {
                id: aiMessageId,
                role: 'assistant',
                content: '',
                sources: [],
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMessage, initialAiMessage]);
            setInputValue('');
            setIsLoading(true);
            setIsStreaming(true);

            try {
                let effectivePageId = pageId;
                if (!effectivePageId) {
                    if (selectedTextContext) {
                        effectivePageId = "selected-text-only";
                    } else if (extractionStatus === 'error') {
                        throw new Error(`Unable to analyze this page: ${errorMessage || "Internal page or unsupported URL."}`);
                    } else {
                        throw new Error("Page context is not indexed yet. Please wait or refresh the page.");
                    }
                }

                // Prepare AbortController
                const abortController = new AbortController();
                abortControllerRef.current = abortController;

                // Send to Gemini via Backend Streaming API
                await streamChatMessage(
                    effectivePageId,
                    text,
                    conversationId,
                    selectedTextContext,
                    {
                        onChunk: (contentChunk) => {
                            setIsLoading(false); // First token arrived, stop full loading state
                            setMessages((prev) => prev.map(msg =>
                                msg.id === aiMessageId
                                    ? { ...msg, content: msg.content + contentChunk }
                                    : msg
                            ));
                        },
                        onDone: (sources) => {
                            setMessages((prev) => prev.map(msg =>
                                msg.id === aiMessageId
                                    ? { ...msg, sources }
                                    : msg
                            ));
                            setIsStreaming(false);
                            abortControllerRef.current = null;
                        },
                        onError: (err) => {
                            throw err; // cascade to outer catch
                        }
                    },
                    abortController.signal
                );
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setMessages((prev) => prev.map(msg =>
                        msg.id === aiMessageId
                            ? { ...msg, content: msg.content || err.message || 'Something went wrong. Please try again.' }
                            : msg
                    ));

                    // Don't clutter the console with expected validation errors
                    if (err.message?.includes('not indexed yet') || err.message?.includes('Unable to analyze')) {
                        console.info('[ContextLens]', err.message);
                    } else {
                        console.error('[ContextLens] Chat error:', err);
                    }
                }
            } finally {
                setIsLoading(false);
                setIsStreaming(false);
            }
        },
        [isLoading, isStreaming, pageId, conversationId, selectedTextContext]
    );

    const handleStop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsStreaming(false);
            setIsLoading(false);
        }
    }, []);

    const handleSuggestedSelect = useCallback((question) => handleSend(question), [handleSend]);
    const handleSettings = useCallback(() => console.log('Settings clicked'), []);

    const showSuggested = messages.length === 0 && !isLoading;

    return (
        <div className="sidepanel" role="main">
            <Header
                pageUrl={pageInfo.url}
                onSettings={handleSettings}
            />

            <PageInfo
                title={pageInfo.title}
                url={pageInfo.url}
                extractionStatus={extractionStatus}
                wordCount={extractionData?.wordCount || 0}
                charCount={extractionData?.charCount || 0}
                truncated={extractionData?.truncated || false}
                errorMessage={errorMessage}
                onRefresh={() => handleExtract(true)}
            />

            {messages.length > 0 && (
                <div className="chat-actions">
                    <button className="chat-actions-btn" onClick={handleClearChat} aria-label="Start a new chat">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        New Chat
                    </button>
                    <button className="chat-actions-btn" onClick={handleClearChat} aria-label="Clear chat history">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6L17.3 20.4a2 2 0 0 1-2 1.6H8.7a2 2 0 0 1-2-1.6L5 6m3-3h8"></path>
                        </svg>
                        Clear Chat
                    </button>
                </div>
            )}

            <Chat messages={messages} isLoading={isLoading} />

            {showSuggested && (
                <SuggestedQuestions
                    onSelect={handleSuggestedSelect}
                    isDisabled={isLoading || (!pageId && !selectedTextContext)}
                />
            )}

            {selectedTextContext && (
                <div className="selected-text-indicator">
                    <div className="selected-text-indicator-header">
                        <span className="selected-text-indicator-title">📄 Using selected text</span>
                        <button className="selected-text-indicator-close" onClick={() => setSelectedTextContext(null)} aria-label="Remove selection context">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div className="selected-text-indicator-body">
                        {selectedTextContext.length > 100 ? selectedTextContext.slice(0, 100) + "..." : selectedTextContext}
                    </div>
                </div>
            )}

            <ChatInput
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSend}
                onStop={handleStop}
                isDisabled={isLoading || (!pageId && !selectedTextContext)}
                isStreaming={isStreaming}
            />
        </div>
    );
}

export default SidePanel;

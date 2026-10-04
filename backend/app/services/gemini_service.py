import os
import logging
from typing import List, AsyncGenerator
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.documents import Document
from langchain_core.chat_history import InMemoryChatMessageHistory

from app.rag.prompts import rag_prompt, CONDENSE_QUESTION_PROMPT

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        # We store histories in memory bound to conversation_id.
        self.histories = {} 
        self._llm = None
        
    def _get_llm(self):
        if not self._llm:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key or api_key == "your_key_here":
                logger.warning("GEMINI_API_KEY is not set correctly! Using dummy.")
                api_key = "dummy_key_to_allow_app_startup"
                
            self._llm = ChatGoogleGenerativeAI(
                model="gemini-3.1-flash-lite",
                temperature=0.2, # Low temperature for grounding
                google_api_key=api_key
            )
        return self._llm
        
    def get_history(self, conversation_id: str) -> InMemoryChatMessageHistory:
        if conversation_id not in self.histories:
            self.histories[conversation_id] = InMemoryChatMessageHistory()
        return self.histories[conversation_id]
        
    async def condense_question(self, question: str, conversation_id: str) -> str:
        """
        Rephrases the follow-up question into a standalone question using the chat history.
        """
        history = self.get_history(conversation_id)
        messages = history.messages
        if not messages:
            return question
            
        chat_history = messages[-6:] # Keep the last 3 turns
        chain = CONDENSE_QUESTION_PROMPT | self._get_llm()
        
        try:
            response = await chain.ainvoke({
                "chat_history": chat_history,
                "question": question
            })
            return response.content.strip()
        except Exception as e:
            logger.error(f"Error condensing question: {e}")
            return question # gracefully fallback to raw question

    async def stream_answer(self, question: str, docs: List[Document], conversation_id: str) -> AsyncGenerator[str, None]:
        """
        Generates an answer from Gemini, streaming chunks as they are generated,
        incorporating context and memory.
        """
        logger.info(f"Streaming Gemini response using {len(docs)} context documents.")
        
        history = self.get_history(conversation_id)
        chat_history = history.messages[-6:]
        
        # Format documents into a single contextual string with metadata indicators
        formatted_context = "\n\n".join(
            [f"--- Chunk {d.metadata.get('chunk_index', '?')} ---\n{d.page_content}" for d in docs]
        )
        
        try:
            chain = rag_prompt | self._get_llm()
            
            full_response = ""
            async for chunk in chain.astream({
                "chat_history": chat_history,
                "context": formatted_context,
                "question": question
            }):
                text_chunk = ""
                if isinstance(chunk.content, str):
                    text_chunk = chunk.content
                elif isinstance(chunk.content, list):
                    text_chunk = ''.join(c.get('text', '') for c in chunk.content if isinstance(c, dict))
                
                full_response += text_chunk
                yield text_chunk
                
            # Upon successful completion, commit to memory history 
            history.add_user_message(question)
            history.add_ai_message(full_response)
                
        except Exception as e:
            logger.error(f"Error streaming from Gemini mapping via LangChain: {e}")
            raise Exception(f"Failed to generate an answer from the AI model: {e}")

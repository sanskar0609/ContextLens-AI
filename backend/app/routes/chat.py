import json
import asyncio
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.documents import Document

from app.schemas.chat import ChatRequest, ChatResponse, ChatSource
from app.rag.retriever import ContextRetriever
from app.services.gemini_service import GeminiService

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize the Gemini service (singleton-like instance for the router)
gemini_service = GeminiService()

@router.post(
    "/stream",
    summary="Chat with Webpage Context (Stream)",
    description="Ask questions relying on the extracted webpage context, returning an SSE stream."
)
async def chat_with_page_stream(request: ChatRequest):
    relevant_docs = []
    sources: list[ChatSource] = []

    if request.selected_text:
        # User is explicitly asking about highlighted text -> bypass generic RAG
        from langchain_core.documents import Document
        # Mock a document containing only the selected text
        mock_doc = Document(
            page_content=f"[USER SELECTED TEXT]\n{request.selected_text}\n[/USER SELECTED TEXT]", 
            metadata={"chunk_index": "Selection"}
        )
        relevant_docs.append(mock_doc)
        sources.append(ChatSource(
            chunk_index=-1,
            text=request.selected_text[:200] + "...", 
            relevance_score=1.0
        ))
    else:
        # Before retrieving, we rewrite the question to be standalone using history
        search_query = await gemini_service.condense_question(
            question=request.question, 
            conversation_id=request.conversation_id
        )

        # Retrieve context from our RAG module using the standalone question
        retrieved_data = ContextRetriever.retrieve(
            page_id=request.page_id,
            query=search_query
        )
        
        if not retrieved_data:
            raise HTTPException(
                status_code=404, 
                detail=f"Page context for ID '{request.page_id}' not found. Please refresh the page content."
            )
        
        for doc, score in retrieved_data:
            relevant_docs.append(doc)
            sources.append(ChatSource(
                chunk_index=doc.metadata.get("chunk_index", -1),
                text=doc.page_content[:200] + "...", # UI snippet
                relevance_score=round(score, 2)
            ))
    
    async def event_generator():
        try:
            # Stream chunks from Gemini
            async for content_chunk in gemini_service.stream_answer(
                question=request.question,
                docs=relevant_docs,
                conversation_id=request.conversation_id
            ):
                if content_chunk:
                    # properly escape and serialize JSON payload for SSE
                    payload = json.dumps({"type": "chunk", "content": content_chunk})
                    yield f"data: {payload}\n\n"
                    
            # Send final completion event with the source citations
            done_payload = json.dumps({
                "type": "done", 
                "sources": [s.model_dump() for s in sources]
            })
            yield f"data: {done_payload}\n\n"
            
        except asyncio.CancelledError:
            logger.info("Client disconnected from streaming chat.")
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            error_payload = json.dumps({"type": "error", "content": "An error occurred during generation."})
            yield f"data: {error_payload}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

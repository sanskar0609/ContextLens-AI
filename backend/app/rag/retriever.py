import logging
from typing import List
from langchain_core.documents import Document
from app.vectorstore.operations import index_page, search_page, delete_page

logger = logging.getLogger(__name__)

class ContextRetriever:
    """
    Modular interface for retrieving documents relevant to a specific user context/page.
    Now backed persistently by Local ChromaDB via vector semantic search.
    """
    
    @staticmethod
    def store_documents(page_id: str, chunks: List[Document]):
        """Persists the chunks into Chroma under the given session page_id."""
        logger.info(f"Passing {len(chunks)} chunks to vector indexer for page_id: {page_id}")
        index_page(page_id, chunks)

    @staticmethod
    def retrieve(page_id: str, query: str = None, top_k: int = 5) -> List[tuple[Document, float]]:
        """
        Retrieves top_k contextually relevant chunks via Semantic Search.
        """
        # If no query is somehow provided, this could be extended to just fetch first N chunks.
        # However, the chat endpoint always provides a query here.
        query_text = query or "Summarize the webpage content."
        return search_page(page_id=page_id, query=query_text, top_k=top_k)
        
    @staticmethod
    def clear_page(page_id: str):
        """Cleans up the database memory for a given page."""
        delete_page(page_id)


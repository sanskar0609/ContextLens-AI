import logging
import uuid
from app.schemas.page import PageAnalyzeRequest, PageAnalyzeResponse

from app.rag.document_processor import DocumentProcessor
from app.rag.text_splitter import TextSplitterService
from app.rag.retriever import ContextRetriever

logger = logging.getLogger(__name__)

# Initialize static singletons for processing
text_splitter = TextSplitterService(chunk_size=1500, chunk_overlap=200)

class PageService:
    @staticmethod
    async def analyze_page(request: PageAnalyzeRequest) -> PageAnalyzeResponse:
        """
        Receives webpage content, chunks it via RAG modules, and stores it in the retriever store.
        """
        # Generate a unique tracking ID for this page session
        page_id = str(uuid.uuid4())
        
        # 1. Document Creation
        base_document = DocumentProcessor.create_document(
            text=request.text,
            page_id=page_id,
            url=request.url,
            title=request.title
        )
        
        # 2. Text Chunking
        chunks = text_splitter.split_document(base_document)
        
        # 3. Store in the interface retriever mapping (ready for ChromaDB next)
        ContextRetriever.store_documents(page_id=page_id, chunks=chunks)
        
        # Log content reception
        logger.info(f"Received page for analysis: {request.url}")
        logger.info(f"Page title: {request.title}, Chunked into {len(chunks)} fragments")
        logger.info(f"Assigned Session ID: {page_id}")
        
        # Return success
        return PageAnalyzeResponse(
            success=True,
            page_id=page_id,
            message=f"Page processed and split into {len(chunks)} chunks"
        )

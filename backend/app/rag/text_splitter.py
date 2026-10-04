from typing import List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

class TextSplitterService:
    """Handles parsing and splitting continuous documents into optimized chunks."""
    
    def __init__(self, chunk_size: int = 1500, chunk_overlap: int = 200):
        # Configure standard RecursiveCharacterTextSplitter
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ".", " ", ""]
        )

    def split_document(self, document: Document) -> List[Document]:
        """
        Splits a single document into smaller overlapped chunks, appending standard RAG metadata.
        """
        chunks = self.splitter.split_documents([document])
        
        # Attach required chunk_index metadata to each chunk
        for i, chunk in enumerate(chunks):
            # Safe shallow copy update
            chunk.metadata = chunk.metadata.copy()
            chunk.metadata["chunk_index"] = i
            
        return chunks

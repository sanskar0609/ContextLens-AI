from langchain_core.documents import Document

class DocumentProcessor:
    """Takes raw extracted web data and constructs a foundational LangChain Document."""
    
    @staticmethod
    def create_document(text: str, page_id: str, url: str, title: str) -> Document:
        """
        Creates a foundational document with base metadata.
        """
        metadata = {
            "page_id": page_id,
            "url": str(url), # Ensure string conversion for HttpUrl
            "title": title
        }
        return Document(page_content=text, metadata=metadata)

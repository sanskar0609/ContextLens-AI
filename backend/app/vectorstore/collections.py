import os
import logging
from app.vectorstore.chroma_client import get_chroma_client
from chromadb.utils.embedding_functions import GoogleGenerativeAiEmbeddingFunction

logger = logging.getLogger(__name__)

def get_webpage_collection():
    """
    Retrieves or creates the local 'webpage_chunks' collection.
    Automatically wraps chunks with Google's embedding model without
    exposing API keys or relying on redundant LangChain wrappers here.
    """
    client = get_chroma_client()
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key or api_key == "your_key_here":
        logger.warning("GEMINI_API_KEY is not configured! Embeddings will fail.")
        
    # Chroma natively supports generating embeddings using Gemini
    embedding_function = GoogleGenerativeAiEmbeddingFunction(
        api_key=api_key,
        model_name="models/gemini-embedding-001",
        task_type="RETRIEVAL_DOCUMENT"
    )
    
    collection = client.get_or_create_collection(
        name="webpage_chunks",
        embedding_function=embedding_function
    )
    
    return collection

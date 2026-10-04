import os
import chromadb
from chromadb.config import Settings

def get_chroma_client() -> chromadb.PersistentClient:
    """
    Initializes and returns a connection to the local Chroma database.
    Configured via CHROMA_PERSIST_DIRECTORY in environment variables.
    """
    persist_dir = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")
    
    # Ensure the directory exists
    os.makedirs(persist_dir, exist_ok=True)
    
    client = chromadb.PersistentClient(
        path=persist_dir,
        settings=Settings(
            anonymized_telemetry=False,
            is_persistent=True
        )
    )
    return client

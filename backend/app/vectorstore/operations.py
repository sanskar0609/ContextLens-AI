import logging
import uuid
from typing import List
from langchain_core.documents import Document
from app.vectorstore.collections import get_webpage_collection

logger = logging.getLogger(__name__)

def index_page(page_id: str, documents: List[Document]):
    """
    Chunks and embeds the page documents into Chroma.
    Associates entirely via the page_id metadata parameter to isolate sessions.
    """
    collection = get_webpage_collection()
    
    ids = []
    texts = []
    metadatas = []
    
    for doc in documents:
        # Create a unique ID for each chunk mathematically bound to the page_id
        chunk_idx = doc.metadata.get('chunk_index', uuid.uuid4())
        chunk_id = f"{page_id}-chunk-{chunk_idx}"
        
        # Ensure page_id is firmly nested in the metadata payload for searching
        meta = doc.metadata.copy()
        meta["page_id"] = page_id
        
        ids.append(chunk_id)
        texts.append(doc.page_content)
        metadatas.append(meta)
        
    # Bulk insert (Chroma will automatically call the Gemini Embedding Function logic here)
    if ids:
        collection.add(
            documents=texts,
            metadatas=metadatas,
            ids=ids
        )
        logger.info(f"Indexed {len(texts)} chunks for page '{page_id}' into ChromaDB.")

def search_page(page_id: str, query: str, top_k: int = 5) -> List[tuple[Document, float]]:
    """
    Performs nearest-neighbor vector search strictly filtered by the page_id.
    Returns a list of tuples containing the Document and its distance score.
    """
    collection = get_webpage_collection()
    
    # Extract matching segments securely tied to the user's current session tab context
    results = collection.query(
        query_texts=[query],
        n_results=top_k,
        where={"page_id": page_id}
    )
    
    retrieved_docs_with_scores = []
    
    # Chroma returns lists of lists (one list per query string)
    if not results["documents"] or not results["documents"][0]:
        logger.info(f"No semantic matches found in DB for query '{query}'")
        return retrieved_docs_with_scores
        
    matched_docs = results["documents"][0]
    matched_metas = results["metadatas"][0]
    
    # Depending on embedding metric, Chroma returns distances. 
    # For Google Gen AI docs, we grab the distances if available.
    distances = results.get("distances")
    matched_distances = distances[0] if distances and len(distances) > 0 else [0.0] * len(matched_docs)
    
    for doc_text, meta, distance in zip(matched_docs, matched_metas, matched_distances):
        # We can interpret lower distance as more relevant.
        # Just convert it to a pseudo-score so higher = better, e.g. 1.0 - distance
        score = max(0.0, 1.0 - distance)
        doc = Document(page_content=doc_text, metadata=meta)
        retrieved_docs_with_scores.append((doc, score))
        
    logger.info(f"Retrieved top {len(retrieved_docs_with_scores)} matching chunks for page '{page_id}'")
    return retrieved_docs_with_scores

def delete_page(page_id: str):
    """
    Purges all vector data correlating to a specific page_id.
    """
    collection = get_webpage_collection()
    collection.delete(where={"page_id": page_id})
    logger.info(f"Deleted vector traces for page '{page_id}'.")

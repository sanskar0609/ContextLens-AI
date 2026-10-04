from fastapi import APIRouter, HTTPException
import logging
from app.schemas.page import PageAnalyzeRequest, PageAnalyzeResponse
from app.services.page_service import PageService

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post(
    "/analyze",
    response_model=PageAnalyzeResponse,
    summary="Analyze and Index Webpage",
    description="Receives extracted webpage text, builds vector embeddings, and stores them in ChromaDB."
)
async def analyze_page(request: PageAnalyzeRequest) -> PageAnalyzeResponse:
    try:
        if not request.text or len(request.text.strip()) == 0:
             raise HTTPException(status_code=400, detail="Page text cannot be empty.")
        
        response = await PageService.analyze_page(request)
        return response
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        logger.error(f"Error analyzing page: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze page: {str(e)}")

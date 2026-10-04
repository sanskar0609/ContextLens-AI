from pydantic import BaseModel, Field
from typing import List, Optional

class ChatRequest(BaseModel):
    page_id: str = Field(..., description="The unique session ID of the indexed page.")
    conversation_id: str = Field(..., description="The unique ID of the conversation.")
    question: str = Field(..., description="The question asked by the user.")
    selected_text: Optional[str] = Field(default=None, description="User highlighted text to prioritize.")

class ChatSource(BaseModel):
    chunk_index: int
    text: str
    relevance_score: Optional[float] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[ChatSource] = Field(default_factory=list)

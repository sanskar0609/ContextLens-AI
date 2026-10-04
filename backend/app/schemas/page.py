from pydantic import BaseModel, HttpUrl, Field
from typing import Optional

class PageAnalyzeRequest(BaseModel):
    title: str = Field(..., max_length=1000, description="The title of the webpage.")
    url: HttpUrl = Field(..., description="The full URL of the webpage.")
    hostname: str = Field(..., max_length=500, description="The hostname of the webpage.")
    text: str = Field(..., max_length=60_000, description="The extracted text content.")

class PageAnalyzeResponse(BaseModel):
    success: bool
    page_id: str
    message: str

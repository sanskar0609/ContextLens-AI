

https://github.com/user-attachments/assets/5c5d2c13-3ac9-4926-a20a-90c981e21c2e

# 🚀 ContextLens AI

> **Chat with any webpage using AI — understand, summarize, and ask questions about the page you're currently viewing.**

ContextLens AI is a Chrome extension that lets users have a real-time conversation with the content of the current webpage.

Instead of manually copying text from a webpage into an AI chatbot, ContextLens AI extracts the webpage content, processes it using **LangChain**, stores the relevant chunks in **ChromaDB**, and uses **Google Gemini** to generate contextual answers.

---

## 🎥 Demo

### Watch ContextLens AI in Action


[<video src="./demo.mp4" controls width="800"></video>](https://github.com/user-attachments/assets/b1c9cde9-985d-47c1-9f28-1e9b0b43c3a3)

The demo shows:

* 🌐 Opening a webpage
* 📄 Extracting webpage content
* 🧠 Processing and indexing the content
* 💬 Asking questions about the webpage
* 🤖 Receiving AI-generated answers
* 🔄 Real-time conversational interaction

---

## ✨ Features

* 💬 **Real-Time AI Chat**

  * Ask questions directly about the current webpage.

* 🌐 **Webpage Context Awareness**

  * Answers are generated using the content of the webpage.

* 🧠 **LangChain Integration**

  * Handles document processing, chunking, retrieval, and conversational workflows.

* 🤖 **Google Gemini**

  * Generates natural-language answers based on retrieved webpage context.

* 🗄️ **ChromaDB**

  * Stores webpage embeddings for semantic search and retrieval.

* 🔍 **Contextual Question Answering**

  * Retrieves relevant webpage sections before generating an answer.

* ⚡ **Chrome Side Panel**

  * Chat with the webpage without leaving the current browser tab.

* 🔐 **Environment-Based API Configuration**

  * API keys are stored using environment variables instead of being hard-coded.

---

## 🏗️ Architecture

```text
┌─────────────────────────────┐
│       Chrome Browser        │
│                             │
│  ┌───────────────────────┐  │
│  │ ContextLens Extension │  │
│  │                       │  │
│  │  Webpage Content      │  │
│  │        ↓              │  │
│  │  Chrome Side Panel    │  │
│  └───────────┬───────────┘  │
└──────────────┼──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       FastAPI Backend       │
│                             │
│       LangChain             │
│          ↓                  │
│   Document Processing       │
│          ↓                  │
│      ChromaDB               │
│          ↓                  │
│   Semantic Retrieval        │
│          ↓                  │
│     Google Gemini           │
└──────────────┬──────────────┘
               │
               ▼
        AI Generated Answer
```

---

## 🛠️ Tech Stack

### Frontend / Chrome Extension

* React
* Vite
* JavaScript
* Chrome Extension Manifest V3
* Chrome Side Panel API

### Backend

* Python
* FastAPI
* LangChain
* ChromaDB
* Google Gemini API

### AI / RAG

* Google Gemini
* LangChain
* Vector embeddings
* Semantic search
* Retrieval-Augmented Generation (RAG)

---

## 📂 Project Structure

```text
ContextLens-AI/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   ├── services/
│   │   └── ...
│   │
│   ├── requirements.txt
│   └── .env.example
│
├── extension/
│   ├── src/
│   ├── public/
│   ├── manifest.json
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md
```

---

## ⚙️ How It Works

### 1. Capture Webpage

The Chrome extension extracts the relevant content from the currently active webpage.

### 2. Send Content to Backend

The extracted webpage content is sent to the FastAPI backend.

### 3. Process Content

LangChain processes the webpage and divides the content into smaller chunks.

### 4. Store Embeddings

The chunks are indexed in ChromaDB to enable semantic retrieval.

### 5. Ask a Question

The user asks a question through the Chrome side panel.

### 6. Retrieve Relevant Context

The backend searches ChromaDB for the most relevant webpage content.

### 7. Generate Answer

The retrieved context is provided to Google Gemini, which generates the final response.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

* Python 3.10+
* Node.js
* npm
* Google Gemini API key
* Google Chrome

---

## 🔧 Backend Setup

Navigate to the backend:

```powershell
cd backend
```

Create a virtual environment:

```powershell
python -m venv venv
```

Activate it on Windows:

```powershell
venv\Scripts\activate
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Create your environment file:

```powershell
copy .env.example .env
```

Add your Gemini API key to `.env`.

Example:

```env
GEMINI_API_KEY=your_api_key_here
```

Start the FastAPI server:

```powershell
uvicorn app.main:app --reload
```

The backend should be available at:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

---

## 🧩 Chrome Extension Setup

Open another terminal:

```powershell
cd extension
```

Install dependencies:

```powershell
npm install
```

Build the extension:

```powershell
npm run build
```

Then open Chrome:

```text
chrome://extensions/
```

Enable:

```text
Developer mode
```

Select:

```text
Load unpacked
```

Choose the extension's generated build directory.

After installing the extension, open a webpage and launch the **ContextLens AI** side panel.

---

## 🔐 Environment Variables

Never commit your actual API keys.

Use:

```text
.env
```

for local secrets.

Commit:

```text
.env.example
```

instead.

Example:

```env
GEMINI_API_KEY=
```

---

## 🧠 RAG Pipeline

ContextLens AI follows a Retrieval-Augmented Generation architecture:

```text
Webpage
   │
   ▼
Content Extraction
   │
   ▼
Text Chunking
   │
   ▼
Embeddings
   │
   ▼
ChromaDB
   │
   ▼
Similarity Search
   │
   ▼
Relevant Context
   │
   ▼
Google Gemini
   │
   ▼
Final Answer
```

This allows the AI to answer questions using the content of the webpage rather than relying only on general knowledge.

---

## 💡 Example Use Cases

### 📚 Research

Read a research paper and ask:

> What is the main contribution of this paper?

### 📰 News

Open a news article and ask:

> What are the three main points discussed in this article?

### 📖 Documentation

Open technical documentation and ask:

> How do I configure this feature?

### 💻 Programming

Open a programming tutorial and ask:

> Explain this implementation in simple terms.

### 🎓 Education

Open study material and ask:

> Summarize this chapter.

---

## ⚠️ Limitations

* AI responses depend on the quality of the webpage content.
* Very large webpages may require additional processing.
* Gemini API availability and quotas depend on the selected Google AI API plan.
* Dynamic webpages may not expose all content to the extension.
* AI-generated answers may occasionally contain inaccurate information.

---

## 🔮 Future Improvements

* [ ] Support multiple webpages simultaneously
* [ ] Conversation history persistence
* [ ] Better webpage content extraction
- [x] PDF support
* [ ] Website summarization mode
* [ ] Source citations for generated answers
* [ ] User-selectable AI models
* [ ] Improved streaming responses
* [ ] Authentication and user accounts
* [ ] Cloud deployment

---







import os
import uuid
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
import fitz  # PyMuPDF
from pinecone import Pinecone
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from fastapi.middleware.cors import CORSMiddleware
import requests
from bs4 import BeautifulSoup


load_dotenv()

app = FastAPI()

# ==========================================
# CORS CONFIGURATION
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)

# ==========================================
# 1. SETUP: PINECONE, EMBEDDINGS, AUR GROQ LLM
# ==========================================
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

pc = Pinecone(api_key=PINECONE_API_KEY)
index_name = "thinklytics"
index = pc.Index(index_name)

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

llm = ChatGroq(
    temperature=0.3, 
    model_name="llama-3.1-8b-instant",
    groq_api_key=GROQ_API_KEY
)

# ==========================================
# 2. HELPER FUNCTIONS
# ==========================================
def process_and_store_text(text: str, source_url_or_name: str, source_type: str):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = text_splitter.split_text(text)
    
    vectors_to_upload = []
    for i, chunk in enumerate(chunks):
        chunk_id = f"{uuid.uuid4()}"
        vector_values = embeddings.embed_query(chunk) 
        
        metadata = {
            "text": chunk,
            "source": source_url_or_name,
            "type": source_type
        }
        vectors_to_upload.append({"id": chunk_id, "values": vector_values, "metadata": metadata})
    
    if vectors_to_upload:
        index.upsert(vectors=vectors_to_upload)

# --- NAYA FUNCTION: AUTO SUMMARIZATION KE LIYE ---
def generate_summary_and_insights(text: str):
    # Context window bachane ke liye shuru ka 6000 characters le rahe hain
    short_text = text[:6000] 
    prompt = f"""
    Analyze the following text and provide a highly concise output:
    1. A short paragraph summarizing the core topic (under 'SUMMARY:')
    2. 3 to 5 key bullet points highlighting the most important insights (under 'KEY INSIGHTS:')
    
    Text to analyze:
    {short_text}
    """
    response = llm.invoke(prompt)
    return response.content

# ==========================================
# 3. API ROUTES
# ==========================================
class YouTubeRequest(BaseModel):
    url: str

class ChatRequest(BaseModel):
    question: str

class YouTubeRequest(BaseModel):
    url: str

class ChatRequest(BaseModel):
    question: str

# NAYA: Article URL ke liye model
class URLRequest(BaseModel):
    url: str

@app.post("/api/process-youtube")
async def process_youtube(request: YouTubeRequest):
    try:
        video_id = ""
        if "v=" in request.url:
            video_id = request.url.split("v=")[1].split("&")[0]
        elif "youtu.be/" in request.url:
            video_id = request.url.split("youtu.be/")[1].split("?")[0]
        else:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")

        transcript_list = YouTubeTranscriptApi().fetch(video_id)
        full_text = " ".join([t.text for t in transcript_list])
        
        # 1. Pinecone mein save karo (Future chat ke liye)
        process_and_store_text(text=full_text, source_url_or_name=request.url, source_type="youtube")
        
        # 2. Foran Summary aur Insights generate karo
        summary_result = generate_summary_and_insights(full_text)
        
        return {
            "status": "success", 
            "message": "Video processed successfully!",
            "summary_data": summary_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/api/process-pdf")
async def process_pdf(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        pdf_document = fitz.open(stream=contents, filetype="pdf")
        
        full_text = ""
        for page_num in range(pdf_document.page_count):
            page = pdf_document.load_page(page_num)
            full_text += page.get_text()
            
        process_and_store_text(text=full_text, source_url_or_name=file.filename, source_type="pdf")
        
        # Summary generate karo
        summary_result = generate_summary_and_insights(full_text)

        return {
            "status": "success", 
            "message": "PDF processed successfully!",
            "summary_data": summary_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/api/process-url")
async def process_url(request: URLRequest):
    try:
        # 1. Website ko request bhejna (Browser ban kar taake block na ho)
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(request.url, headers=headers)
        response.raise_for_status() # Agar link kharab ho toh error dega
        
        # 2. BeautifulSoup se HTML parhna aur sirf Paragraphs <p> nikalna
        soup = BeautifulSoup(response.text, 'html.parser')
        paragraphs = soup.find_all('p')
        full_text = " ".join([p.get_text() for p in paragraphs])
        
        if not full_text.strip():
            raise HTTPException(status_code=400, detail="Is website se koi text nahi nikal saka.")

        # 3. Text ko vector bana kar Pinecone mein save karna
        process_and_store_text(text=full_text, source_url_or_name=request.url, source_type="url")
        
        # 4. Summary generate karna
        summary_result = generate_summary_and_insights(full_text)
        
        return {
            "status": "success", 
            "message": "Article processed successfully!",
            "summary_data": summary_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/api/chat")
async def chat_with_bot(request: ChatRequest):
    try:
        query_vector = embeddings.embed_query(request.question)
        search_results = index.query(vector=query_vector, top_k=3, include_metadata=True)
        
        context = ""
        for match in search_results['matches']:
            context += match['metadata']['text'] + "\n\n"
            
        if not context.strip():
            return {"answer": "Mujhe is sawal ka jawab database mein nahi mila."}

        prompt = f"""
        You are a helpful AI assistant. Use the following context to answer the user's question. 
        If the answer is not in the context, just say "I don't know based on the provided context".
        
        Context: {context}
        Question: {request.question}
        Answer:
        """
        response = llm.invoke(prompt)
        return {"question": request.question, "answer": response.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
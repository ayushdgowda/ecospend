import os
import json
import requests
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Load Environment Variables 
load_dotenv()
GREENPT_API_URL = os.getenv("GREENPT_API_URL")
GREENPT_API_KEY = os.getenv("GREENPT_API_KEY")

# 1. Database Setup 
# This creates a local SQLite database file called ecospend.db
SQLALCHEMY_DATABASE_URL = "sqlite:///./ecospend.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class PurchaseDB(Base):
    __tablename__ = "purchases"
    
    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, index=True)
    category = Column(String)
    price = Column(Float)
    carbon_score = Column(Integer)
    suggestion = Column(String)

# Automatically create the database file and tables
Base.metadata.create_all(bind=engine)

# 2. Pydantic Models (Frontend Validation)
class PurchaseRequest(BaseModel):
    item_name: str
    category: str
    price: float

# 3. FastAPI App & Routes 
app = FastAPI(title="EcoSpend API")

# CORS MIDDLEWARE (Allows React to connect) 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to the EcoSpend API! Server is running."}

@app.post("/analyze-purchase")
def analyze_purchase(request: PurchaseRequest, db: Session = Depends(get_db)):
    # 1. Construct the Strict System Prompt
    system_prompt = """
    You are an automated environmental scientist and lifestyle coach.
    Evaluate the environmental impact of the user's purchase based on resource consumption, greenhouse gas emissions, and waste generation.
    
    You MUST return ONLY a raw JSON object. Do not include markdown formatting or backticks.
    
    Format:
    {
        "carbon_score": <int between 1 and 10>,
        "suggestion": "<1-to-2 sentence practical eco-friendly alternative>"
    }
    
    Scoring Rules:
    1-3 (Green): Low impact (e.g., local produce, public transit, thrifted clothes).
    4-7 (Yellow): Moderate impact (e.g., electronics, average retail, standard groceries).
    8-10 (Red): High impact (e.g., fast fashion, flights, high-emissions meat, single-use plastics).
    """
    
    user_prompt = f"Item: {request.item_name}, Category: {request.category}, Price: ${request.price}"
    
    # 2. Call the GreenPT API (Optimized for Sustainability)
    headers = {
        "Authorization": f"Bearer {GREENPT_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Using the exact Chat/Instruct model fetched from your account
    payload = {
        "model": "mistral-small-3.2-24b-instruct-2506", 
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2 
    }
    
    try:
        response = requests.post(GREENPT_API_URL, headers=headers, json=payload)
        
        # Check for successful response from sponsor API
        if response.status_code != 200:
             raise HTTPException(status_code=response.status_code, detail=f"GreenPT Error: {response.text}")
             
        # Parse the JSON response
        ai_response_text = response.json()["choices"][0]["message"]["content"]
        
        # Strip potential markdown formatting to ensure clean JSON parsing
        ai_response_text = ai_response_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        
        ai_data = json.loads(ai_response_text)
        
        carbon_score = ai_data.get("carbon_score", 5)
        suggestion = ai_data.get("suggestion", "No suggestion provided.")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Integration Error: {str(e)}")

    # 3. Save to SQLite Database
    new_purchase = PurchaseDB(
        item_name=request.item_name,
        category=request.category,
        price=request.price,
        carbon_score=carbon_score,
        suggestion=suggestion
    )
    
    db.add(new_purchase)
    db.commit()
    db.refresh(new_purchase)
    
    # Return the record including the assigned ID and AI analysis

    return new_purchase

# Make sure this is pushed all the way to the left! 
@app.get("/purchases")
def get_purchases(db: Session = Depends(get_db)):
    # Fetch all purchases from the database, ordered from newest to oldest
    purchases = db.query(PurchaseDB).order_by(PurchaseDB.id.desc()).all()
    return purchases
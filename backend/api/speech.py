from fastapi import APIRouter, UploadFile, File, HTTPException, Request
import os
import tempfile
import asyncio
from slowapi import Limiter
from slowapi.util import get_remote_address
from groq import Groq
import httpx

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY is not set. Please add it to your .env file.")
timeout = httpx.Timeout(30.0) # Extended timeout for audio uploads
client = Groq(api_key=api_key, timeout=timeout)

MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/transcribe")
@limiter.limit("10/minute")
async def transcribe_audio(request: Request, file: UploadFile = File(...)):
    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size: 10MB"
        )
    
    # Reset file cursor since reading shifted the pointer
    await file.seek(0)

    # Validate file type
    if not file.filename or not file.filename.endswith(('.wav', '.mp3', '.m4a', '.webm', '.ogg')):
        raise HTTPException(status_code=400, detail="Invalid audio file format.")
        
    # Check MIME type
    if file.content_type not in ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/x-m4a']:
        raise HTTPException(status_code=400, detail="Invalid MIME type.")
        
    temp_audio_path = ""
    try:
        # Create a temporary file to store the uploaded audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            temp_audio.write(await file.read())
            temp_audio_path = temp_audio.name
        
        def call_groq_whisper():
            """Sends the audio to Groq's Whisper API"""
            with open(temp_audio_path, "rb") as audio_file:
                return client.audio.transcriptions.create(
                    file=(os.path.basename(temp_audio_path), audio_file.read()),
                    model="whisper-large-v3",
                )
                
        # Wait for the background thread to finish without blocking the FastAPI event loop
        result = await asyncio.to_thread(call_groq_whisper)
        
        return {
            "status": "success",
            "text": result.text.strip() if hasattr(result, "text") else "",
            "language": "en" # Groq API auto-detects, but we can default to 'en'
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    finally:
        # ALWAYS clean up the temporary file, even if an error occurs!
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except:
                pass
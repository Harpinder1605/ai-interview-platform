# AI Interview Intelligence Platform

An AI-powered mock interview platform that simulates real technical and behavioral interviews. It leverages advanced language models, real-time speech transcription, and computer vision to evaluate candidates and provide actionable feedback.

## 🌟 Features

- **Interactive AI Interviewer**: Conducts dynamic, conversation-driven interviews tailored to specific topics (e.g., System Design, React Frontend).
- **Speech Recognition**: Real-time audio transcription using Groq's blazing-fast Whisper API integration.
- **Computer Vision Engine**: Analyzes candidate eye contact and engagement via WebSockets in real-time.
- **Comprehensive AI Evaluation**: Provides detailed scores, strengths, weaknesses, and actionable advice after every response.
- **Secure & Scalable**: Features JWT authentication, rate limiting, and PostgreSQL connection pooling.

## 🛠️ Tech Stack

### Frontend
- **React 19** & **TypeScript**
- **Vite** (Build Tool)
- **Tailwind CSS** (Styling)
- **Axios** (API Client)
- **React Router** (Navigation)

### Backend
- **FastAPI** (Python Web Framework)
- **SQLAlchemy** (ORM)
- **PostgreSQL** (Production DB) / **SQLite** (Local DB)
- **Groq API** (Llama-3 & Whisper)
- **WebSockets** (Real-time Vision Analytics)
- **SlowAPI** (Rate Limiting)

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- Python 3.11+
- A Groq API Key (Get one free at [console.groq.com](https://console.groq.com))

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd ai-interview-platform
```

### 2. Environment Variables

Create a `.env` file inside the `backend` directory based on the `.env.example`:

```env
SECRET_KEY=your-32-char-random-key-here
DATABASE_URL=sqlite:///./ai_interview.db  # Use PostgreSQL URL for production
GROQ_API_KEY=your_groq_api_key_here
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
```

*Tip: Generate a local `SECRET_KEY` using `python -c "import secrets; print(secrets.token_urlsafe(32))"`*

### 3. Running Locally (Manual)

**Start the Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
# API will be available at http://localhost:8000
```

**Start the Frontend:**
```bash
cd frontend
npm install
npm run dev
# Frontend will be available at http://localhost:5173
```

### 4. Running with Docker Compose

You can spin up the entire stack using Docker Compose:

```bash
docker-compose up --build
```

## 🔒 Security & Performance Features

- **CORS Protection**: Restricted to specific frontend origins.
- **Rate Limiting**: API endpoints are protected against abuse (e.g., 10 audio uploads/minute).
- **Prompt Sanitization**: User inputs are sanitized to prevent LLM prompt injection.
- **File Size Limits**: Audio uploads are capped at 10MB to prevent server exhaustion.
- **GZip Compression**: API responses are compressed to save bandwidth.

## 🌐 Deployment (Render)

This project is optimized for deployment on the **Render Free Tier**.

1. **Database**: Create a PostgreSQL database on Render (or Neon.tech) and copy the `DATABASE_URL`.
2. **Backend**: Create a new "Web Service" pointing to the `backend` directory. Use the generated `Dockerfile`.
   - Add environment variables (`GROQ_API_KEY`, `SECRET_KEY`, `DATABASE_URL`, `FRONTEND_URL`, `ENVIRONMENT=production`).
3. **Frontend**: Create a new "Static Site" pointing to the `frontend` directory. 
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Add environment variables:
     - `VITE_API_URL=https://your-backend-app.onrender.com`
     - `VITE_WS_URL=wss://your-backend-app.onrender.com`

## 📝 License

This project is licensed under the MIT License.
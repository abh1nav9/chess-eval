# ChessEval

ChessEval is a production-grade, open-source chess analysis platform. It combines a Python/FastAPI backend (async Stockfish jobs, MongoDB, WebSocket progress) with a React/Vite frontend: interactive board with eval bar, move list, engine lines, eval chart, optional move sounds, and board flip with player labels aligned to each side.

## Project Structure

The project is split into two primary applications:

1. **[Backend API](./backend/README.md)**: A Python FastAPI service that parses PGNs, runs Stockfish evaluations via `python-chess`, and stores results in MongoDB.
2. **[Frontend Client](./frontend/README.md)**: A React SPA that renders the interactive chess board, evaluation graphs (via Chart.js), engine lines, optional Chess.com profile import (server-proxied), and move sounds in a minimalist dark-mode UI.

## Getting Started

To run the application locally, you will need to start both the backend and frontend development servers.

### 1. Start the Backend

Please see the [Backend README](./backend/README.md) for detailed instructions. In short:
1. Create and activate a Python virtual environment (`python3 -m venv venv && source venv/bin/activate`).
2. Install dependencies (`pip install -r requirements.txt`).
3. Configure your `.env` file with your local MongoDB URL and absolute Stockfish binary path.
4. Run the API: `uvicorn app.main:app --reload`.

### 2. Start the Frontend

Please see the [Frontend README](./frontend/README.md) for detailed instructions. In short:
1. Navigate to the frontend directory (`cd frontend`).
2. Install dependencies (`npm install`).
3. Start the Vite dev server (`npm run dev`).

## Docker Support

The project includes `Dockerfile` configurations for both the frontend and backend, as well as a `docker-compose.yml` file in the root directory for easy orchestration of the API, Frontend, and MongoDB instances. 

To spin up the entire stack using Docker:
```bash
docker-compose up --build
```

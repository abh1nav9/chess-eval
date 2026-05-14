# ChessEval

ChessEval is a open-source chess analysis platform. It combines a Python/FastAPI backend (async Stockfish jobs, MongoDB, WebSocket progress) with a React/Vite frontend: interactive board with a Win%-style eval bar (Lichess-style sigmoid, same mapping as the eval chart), move list, engine lines, optional move sounds, light/dark chrome, and **board-themed** UI accents (`data-board-theme`) so the shell matches the selected board palette (classic, brown, gray, blue, pink). Board flip keeps player rows aligned to each side; PGN exploration updates live eval without clearing the move list.

## Project Structure

The project is split into two primary applications:

1. **[Backend API](./backend/README.md)**: A Python FastAPI service that parses PGNs, runs Stockfish evaluations via `python-chess`, and stores results in MongoDB.
2. **[Frontend Client](./frontend/README.md)**: A React SPA that renders the interactive chess board, evaluation graph (Chart.js; **white win %** on the Y-axis, same formula as the eval bar), engine lines, optional Chess.com profile import (server-proxied; titles, names, avatars on the list and analysis board chrome), move sounds, and a **light/dark** theme toggle plus **chromatic** styling tied to the board theme.

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


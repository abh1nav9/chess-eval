FROM python:3.12-slim

ARG STOCKFISH_RELEASE=sf_18
ARG STOCKFISH_TARBALL=stockfish-ubuntu-x86-64-avx2.tar

RUN apt-get update && \
    apt-get install -y --no-install-recommends wget ca-certificates && \
    wget -q "https://github.com/official-stockfish/Stockfish/releases/download/${STOCKFISH_RELEASE}/${STOCKFISH_TARBALL}" && \
    tar xf "${STOCKFISH_TARBALL}" && \
    install -m 0755 "stockfish/stockfish-ubuntu-x86-64-avx2" /usr/local/bin/stockfish && \
    rm -rf "${STOCKFISH_TARBALL}" stockfish && \
    apt-get purge -y wget && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Optional Polyglot opening book (set POLYGLOT_BOOK_URL build-arg to a direct .bin URL).
ARG POLYGLOT_BOOK_URL=
RUN mkdir -p /usr/share/chess-eval \
    && if [ -n "$POLYGLOT_BOOK_URL" ]; then \
      apt-get update && apt-get install -y --no-install-recommends wget ca-certificates \
      && wget -q -O /usr/share/chess-eval/openings.bin "$POLYGLOT_BOOK_URL" \
      && apt-get purge -y wget && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* ; \
    fi

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variable for Stockfish path
ENV STOCKFISH_PATH=/usr/local/bin/stockfish
# Used when the optional book was downloaded above; harmless if file is absent.
ENV OPENING_POLYGLOT_PATH=/usr/share/chess-eval/openings.bin

EXPOSE 8888

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8888"]

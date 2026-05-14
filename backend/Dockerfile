FROM python:3.13-slim

# Latest official Stockfish Linux x86-64 AVX2 binary (release tag from GitHub API).
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl && \
    TAG=$(curl -fsSL -H "Accept: application/vnd.github+json" -H "User-Agent: chess-eval-docker" \
      https://api.github.com/repos/official-stockfish/Stockfish/releases/latest \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['tag_name'])") && \
    curl -fsSL -o /tmp/stockfish.tar \
      "https://github.com/official-stockfish/Stockfish/releases/download/${TAG}/stockfish-ubuntu-x86-64-avx2.tar" && \
    mkdir -p /tmp/sf && tar xf /tmp/stockfish.tar -C /tmp/sf && \
    BIN="$(find /tmp/sf -type f \( -name 'stockfish' -o -name 'stockfish-*' \) -executable | head -n1)" && \
    test -n "$BIN" && install -m 0755 "$BIN" /usr/local/bin/stockfish && \
    rm -rf /tmp/sf /tmp/stockfish.tar && \
    apt-get purge -y curl && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Optional Polyglot opening book (set POLYGLOT_BOOK_URL build-arg to a direct .bin URL).
ARG POLYGLOT_BOOK_URL=
RUN mkdir -p /usr/share/chess-eval \
    && if [ -n "$POLYGLOT_BOOK_URL" ]; then \
      apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
      && curl -fsSL -o /usr/share/chess-eval/openings.bin "$POLYGLOT_BOOK_URL" \
      && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* ; \
    fi

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV STOCKFISH_PATH=/usr/local/bin/stockfish
ENV OPENING_POLYGLOT_PATH=/usr/share/chess-eval/openings.bin

EXPOSE 8888

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8888"]

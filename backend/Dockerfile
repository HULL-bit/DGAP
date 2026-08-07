FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Dépendances système : compilation psycopg/weasyprint, rendu PDF (Pango/Cairo), Tesseract OCR (fra),
# poppler-utils (pdf2image : rasterise un PDF en images avant OCR, apps.ged EF-602).
# `apt-get upgrade` avant l'installation : l'image de base `python:3.12-slim` n'est
# reconstruite par l'amont qu'à intervalles espacés et peut accumuler des paquets OS
# avec correctif Debian déjà publié mais pas encore répercuté dans l'image (constaté
# via un scan Trivy — CVE noyau/libc avec Fixed Version renseignée).
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
        build-essential libpq-dev \
        libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 \
        tesseract-ocr tesseract-ocr-fra poppler-utils \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install -e ".[dev]"

COPY . .

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]

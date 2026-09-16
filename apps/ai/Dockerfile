FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN pip install --no-cache-dir uv \
    && uv sync --frozen --no-dev --no-editable

COPY src ./src

RUN useradd --create-home --uid 10001 metron \
    && chown -R metron:metron /app
USER metron

EXPOSE 8000

CMD ["uv", "run", "--no-sync", "uvicorn", "metron_ai.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM python:3.11.2

# IMPORTANT: Create and use non-root user (required by Hugging Face)
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code with proper ownership
COPY --chown=appuser . .

# Switch to non-root user (CRITICAL for Hugging Face)
USER appuser

EXPOSE 7860

CMD ["python", "app.py"]
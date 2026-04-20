FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install them. Using pip's no-cache-dir to reduce image size.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port for the FastAPI app. Render will detect this.
EXPOSE 8000

# Command to run the application using uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

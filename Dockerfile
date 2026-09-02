FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Create app directory
WORKDIR /usr/src/app

# Copy Python dependencies and install
COPY requirements.txt /usr/src/app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy source project
COPY . /usr/src/app/

EXPOSE 8070

CMD ["python3", "server.py", "--port", "8070", "--static-dir", "./dist"]


FROM python:3.10-slim

# Install system dependencies required for psycopg2 and other packages
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces run best as a non-root user
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Set the working directory
WORKDIR $HOME/app

# Copy requirements and install them
COPY --chown=user requirements.txt $HOME/app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY --chown=user . $HOME/app/

# Hugging Face Spaces expect applications to run on port 7860
EXPOSE 7860

# Command to run migrations and start the Gunicorn server
CMD python manage.py migrate && gunicorn plato.wsgi:application --bind 0.0.0.0:7860

import os
import subprocess
import time

if __name__ == "__main__":
    print("Starting Django in a Gradio Space...")
    
    # Run database migrations first
    os.system("python manage.py migrate")
    
    # Start the Django server using Gunicorn on port 7860
    # Hugging Face Gradio spaces automatically route traffic to port 7860
    subprocess.Popen(
        ["gunicorn", "plato.wsgi:application", "--bind", "0.0.0.0:7860", "--workers", "2"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    
    # Keep the main thread alive (otherwise the Space will crash/exit)
    while True:
        time.sleep(60)

FROM python:3.13-slim AS builder
RUN apt update && apt-get install -y build-essential libasound2-dev libasound2-plugins pipewire-alsa libportaudio2 portaudio19-dev 
COPY . /app
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt && cp $(which uvicorn) /app
RUN ls -l /usr/local/lib/python3.13

FROM gcr.io/distroless/python3-debian13:nonroot
COPY --from=builder /app /app
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
ENV PYTHONPATH=/app:/usr/local/lib/python3.13/site-packages

WORKDIR /app
CMD ["./uvicorn","main:app","--host","0.0.0.0","--port","8080"]

import asyncio
import os

from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

STREAM_CMD = [
    "ffmpeg",
    "-f",
    "s16le",
    "-ac",
    "1",
    "-ar",
    "24000",
    "-i",
    "html/recording.pcm",
    "-f",
    "s16le",
    "pipe:1",
]


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()

    if not os.path.exists("./html/recording.pcm"):
        await ws.close(code=4004)
        return

    process = await asyncio.create_subprocess_exec(
        *STREAM_CMD, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    try:
        while True:
            # data = await process.stdout.read(4096)
            (data, _) = await process.communicate()
            if not data:
                break
            await ws.send_bytes(data)
            print(f"sent {len(data)} bytes")
    except Exception as e:
        print(f"Streaming error: {e}")
    finally:
        if process.returncode is None:
            process.terminate()
            await process.wait()


@app.get("/hello")
async def hello():
    return HTMLResponse(
        "FastAPI server streaming pre-recorded audio via websockt at /ws."
    )


app.mount("/", StaticFiles(directory="./html", html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    # uvicorn.run(app, host="0.0.0.0", port=8080) # use this on cloud run as it will https terminate
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8443,
        ssl_certfile="./snakeoil.pem",
        ssl_keyfile="./snakeoil.key",
    )

# Running locally and Deploying to cloud run

## Requirements
1. google-adk
1. fastapi
1. python-dotenv
1. datastar-py
1. uvicorn[standard]

If using `uv`, use `uv add {package_name}`.

## Running locally
```
./run.sh
```

## Build and push docker image
Adapt (make a copy) of `docker_build_and_push.sh` to your configuration and run it.

Python is heavy. The image size is about 1GB.

## Setup gcloud-config volume
```
docker pull gcr.io/google.com/cloudsdktool/google-cloud-cli:stable

docker run -it --name gcloud-config \
  gcr.io/google.com/cloudsdktool/google-cloud-cli:stable \
  gcloud auth login
```

## Deploy with gcloud
```
docker run --rm \
  --volumes-from gcloud-config \
  gcr.io/google.com/cloudsdktool/google-cloud-cli:stable \
  gcloud run deploy hello-service \
    --project=yourGoogleProject \
    --image=docker.io/siuyin/liveaudio:mmddHHMM \
    --min-instances=0 --max-instances=1 \
    --set-env-vars=GOOGLE_API_KEY=yourAPIKey \
    --region=us-central1 \
    --allow-unauthenticated
```

## Cold start time on cloud run
I measured cold start time to be about 15 seconds.
I clicked "connect" and a response showed on my browser console some 13 to 15 seconds later.

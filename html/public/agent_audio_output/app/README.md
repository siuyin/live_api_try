# Deploying to cloud run

## Build docker image
```
docker build -t siuyin/liveaudio:mmddHHMM
```

## Push docker image (after docker login)
```
docker push siuyin/liveaudio:mmddHHMM
```

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

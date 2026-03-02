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
    --set-env-vars=GOOGLE_API_KEY=yourAPIKey \
    --region=us-central1 \
    --allow-unauthenticated
```

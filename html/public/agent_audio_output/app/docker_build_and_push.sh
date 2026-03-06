tag=siuyin/liveaudio:$(git rev-parse --short HEAD)
echo $tag
docker build -t ${tag} .
#docker build --platform linux/amd64 -t ${tag} .  ## for building on arm-based macs.
docker push ${tag} 
echo $tag


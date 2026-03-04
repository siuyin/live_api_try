tag=siuyin/liveaudio:$(git rev-parse --short HEAD)
echo $tag
docker build -t ${tag} .
docker push ${tag} 
echo $tag


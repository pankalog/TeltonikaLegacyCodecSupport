GIT_DEPLOYMENT_VERSION=$(git rev-parse --short HEAD)
docker login
docker buildx create --use --platform=linux/arm64,linux/amd64 --name multi-platform-builder
docker buildx build --push --platform linux/amd64,linux/arm64 -t pankalog/teltonika-codec-to-mqtt:"$GIT_DEPLOYMENT_VERSION" -t pankalog/teltonika-codec-to-mqtt:"latest"  --builder multi-platform-builder  .
docker-compose -p teltonika --env-file=localhost.env up -d
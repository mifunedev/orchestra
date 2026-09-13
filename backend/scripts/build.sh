#!/bin/bash

# Get the project root directory (one level up from backend)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

SHORT_SHA=$(git rev-parse --short HEAD)

# Set TAG to first argument if provided, otherwise use SHORT_SHA
TAG=${1:-$SHORT_SHA}

########################################################################
## Container Registry
########################################################################
REGISTRY="ghcr.io"
REPOSITORY="mifunedev"
IMAGE_NAME="orchestra"
FULL_IMAGE="$REGISTRY/$REPOSITORY/$IMAGE_NAME"

# Copy Docker README to backend for inclusion in image
cp "$PROJECT_ROOT/docker/README.md" "$BACKEND_DIR/README.md"
cp "$PROJECT_ROOT/LICENSE" "$BACKEND_DIR/LICENSE"

# Build both targets
docker build --target api -t $FULL_IMAGE-api:$TAG -t $FULL_IMAGE-api:latest "$BACKEND_DIR"
docker build --target worker -t $FULL_IMAGE-worker:$TAG -t $FULL_IMAGE-worker:latest "$BACKEND_DIR"

# Backward compat alias (orchestra:TAG -> orchestra-api:TAG)
docker tag $FULL_IMAGE-api:$TAG $FULL_IMAGE:$TAG
docker tag $FULL_IMAGE-api:latest $FULL_IMAGE:latest

echo ""
echo "=== Built Images ==="
docker images | grep "$FULL_IMAGE" | head -6

########################################################################
## GitHub Container Registry
########################################################################
echo ""
echo "Do you want to push the images to GitHub Container Registry? (y/n)"
read -r response
if [[ $response =~ ^([yY][eE][sS]|[yY])$ ]]
then
  docker push $FULL_IMAGE-api:$TAG
  docker push $FULL_IMAGE-api:latest
  docker push $FULL_IMAGE-worker:$TAG
  docker push $FULL_IMAGE-worker:latest
  docker push $FULL_IMAGE:$TAG
  docker push $FULL_IMAGE:latest
fi

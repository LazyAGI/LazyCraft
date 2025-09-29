set -e

HOME_DIR=$(dirname "$0")
cd "$HOME_DIR"

# 定义仓库变量，便于后续统一管理镜像仓库地址
REPO="registry.cn-sh-01.sensecore.cn/ai-expert-service"

# 构建 NGINX 镜像
./build_image.sh --network host -f nginx.Dockerfile -n $REPO/lazyplatform-nginx . &
# 构建 BACK 镜像
./build_image.sh --network host -f Dockerfile -n $REPO/lazyplatform-back . &

wait

NGINX_IMAGE=$(./build_image.sh --network host -f nginx.Dockerfile -n $REPO/lazyplatform-nginx --name-only --quiet .)
BACK_IMAGE=$(./build_image.sh --network host -f Dockerfile -n $REPO/lazyplatform-back --name-only --quiet .)

echo "✅ NGINX 镜像已构建: $NGINX_IMAGE"
echo "✅ BACK 镜像已构建: $BACK_IMAGE"

# docker push ${NGINX_IMAGE}
# docker push ${BACK_IMAGE}

echo "推送镜像到仓库"
echo "docker push $NGINX_IMAGE"
echo "docker push $BACK_IMAGE"

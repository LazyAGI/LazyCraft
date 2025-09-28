#!/bin/bash

set -e

# 简单的Docker镜像构建脚本 - 兼容docker build参数格式
# 使用方法 1: ./simple_build.sh <git_repo_url> [options] [docker build options] [context]
# 使用方法 2: ./simple_build.sh [options] [docker build options] [context]

# 检查参数
if [[ $# -lt 1 ]] || [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    echo "简单Docker构建脚本 - 兼容docker build参数格式"
    echo ""
    echo "使用方法: $0 [git_repo_url] [options] [docker build options] [context]"
    echo ""
    echo "模式说明:"
    echo "  模式1: $0 <git_repo_url> [options] ..."
    echo "         克隆指定Git仓库并构建"
    echo "  模式2: $0 [options] ..."  
    echo "         在当前目录构建（像普通docker build）"
    echo ""
    echo "脚本选项:"
    echo "  -b, --branch BRANCH     指定要构建的分支"
    echo "                          模式1: 克隆指定分支"
    echo "                          模式2: 在当前仓库切换到指定分支"
    echo "  -n, --image-name NAME   指定镜像名称（优先级高于-t）"
    echo "      --image-ver VER     指定镜像版本（与--image-name配合使用）"
    echo "                          未指定时自动生成: 分支-commit-时间戳"
    echo "      --name-only         只输出镜像名称，不执行构建（默认开启静默模式）"
    echo ""
    echo "docker build选项:"
    echo "  -f, --file PATH       Dockerfile路径（默认: Dockerfile）"
    echo "  -t, --tag TAG         镜像名称和标签（完整格式）"
    echo "  --build-arg KEY=VAL   构建参数（可多个）"
    echo "  --network NETWORK     设置构建时的网络模式"
    echo "  --platform PLATFORM   设置目标平台"
    echo "  --target TARGET       设置构建目标阶段"
    echo "  --no-cache            不使用缓存"
    echo "  --pull                总是尝试拉取最新的基础镜像"
    echo "  --quiet, -q           静默模式"
    echo ""
    echo "示例:"
    echo "  # 模式1: 克隆仓库构建"
    echo "  $0 https://github.com/user/repo.git -b develop -t myapp:latest ."
    echo "  $0 https://github.com/user/repo.git -n myapp --image-ver v1.0 ."
    echo "  $0 https://github.com/user/repo.git --image-name myapp ."  # 自动生成版本号
    echo ""
    echo "  # 模式2: 当前目录构建"
    echo "  $0 -b develop -n myapp --image-ver dev ."
    echo "  $0 -n myapp ."  # 使用当前分支自动生成版本号
    echo "  $0 -f Dockerfile.prod -t myapp:prod ."
    echo ""
    echo "  # 只获取镜像名称（不构建）"
    echo "  $0 -n myapp --name-only"
    echo "  $0 https://github.com/user/repo.git -b main --name-only"
    exit 0
fi

# 检查第一个参数是否为Git仓库URL
GIT_REPO_URL=""
if [[ "$1" =~ ^(https?://|git@|ssh://|git://) ]]; then
    # 第一个参数是Git仓库地址
    GIT_REPO_URL="$1"
    shift
fi

# 解析脚本参数和docker build参数
DOCKERFILE_PATH="Dockerfile"
IMAGE_TAG=""
IMAGE_NAME=""
IMAGE_VERSION=""
BRANCH_NAME=""
BUILD_ARGS=()
CONTEXT="."
QUIET=false
NAME_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--branch)
            BRANCH_NAME="$2"
            shift 2
            ;;
        -n|--image-name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        --image-ver)
            IMAGE_VERSION="$2"
            shift 2
            ;;
        --name-only)
            NAME_ONLY=true
            QUIET=true
            shift
            ;;
        -f|--file)
            DOCKERFILE_PATH="$2"
            BUILD_ARGS+=("$1" "$2")
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            BUILD_ARGS+=("$1" "$2")
            shift 2
            ;;
        -q|--quiet)
            QUIET=true
            BUILD_ARGS+=("$1")
            shift
            ;;
        --build-arg|--platform|--target|--network)
            BUILD_ARGS+=("$1" "$2")
            shift 2
            ;;
        --no-cache|--pull|--force-rm|--compress|--squash)
            BUILD_ARGS+=("$1")
            shift
            ;;
        --*)
            # 其他双破折号选项，可能有值也可能没有
            if [[ -n "${2:-}" ]] && [[ "$2" != --* ]]; then
                BUILD_ARGS+=("$1" "$2")
                shift 2
            else
                BUILD_ARGS+=("$1")
                shift
            fi
            ;;
        -*)
            # 短选项
            BUILD_ARGS+=("$1")
            shift
            ;;
        *)
            # 这应该是context路径
            CONTEXT="$1"
            shift
            ;;
    esac
done

# 确定工作模式和仓库名称
if [[ -n "$GIT_REPO_URL" ]]; then
    # 模式1: 克隆Git仓库
    REPO_NAME=$(basename "$GIT_REPO_URL" .git)
    WORK_MODE="clone"
else
    # 模式2: 当前目录构建
    if git rev-parse --git-dir >/dev/null 2>&1; then
        # 当前目录是Git仓库
        REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")
        WORK_MODE="local"
    else
        # 当前目录不是Git仓库
        REPO_NAME=$(basename "$(pwd)")
        WORK_MODE="local"
    fi
fi

# 验证docker build参数（在克隆前进行验证）
[[ "$QUIET" != true ]] && echo "🔍 验证Docker构建参数..." >&2

# 验证docker是否可用
if ! docker build --help >/dev/null 2>&1; then
    echo "❌ 错误: Docker不可用" >&2
    exit 1
fi

# 获取docker build支持的参数列表
DOCKER_HELP=$(docker build --help 2>/dev/null || docker buildx build --help 2>/dev/null)

# 验证BUILD_ARGS中的参数
for arg in "${BUILD_ARGS[@]}"; do
    # 跳过不是选项的参数（即参数值）
    if [[ "$arg" != -* ]]; then
        continue
    fi
    
    # 检查长选项（--开头）
    if [[ "$arg" == --* ]]; then
        # 提取选项名（去掉可能的等号和值）
        option_name=$(echo "$arg" | cut -d'=' -f1)
        if ! echo "$DOCKER_HELP" | grep -q "\\$option_name\\b"; then
            echo "❌ 错误: 无效的Docker构建参数: $arg" >&2
            echo "💡 提示: 使用 'docker build --help' 查看可用参数" >&2
            exit 1
        fi
    # 检查短选项（-开头，但不是--）  
    elif [[ "$arg" == -* ]] && [[ "$arg" != --* ]]; then
        # 对于短选项，检查是否在帮助中
        if ! echo "$DOCKER_HELP" | grep -q "\\$arg\\b"; then
            echo "❌ 错误: 无效的Docker构建参数: $arg" >&2
            echo "💡 提示: 使用 'docker build --help' 查看可用参数" >&2
            exit 1
        fi
    fi
done

# 根据工作模式处理Git操作
if [[ "$WORK_MODE" == "clone" ]]; then
    # 模式1: 克隆Git仓库
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT
    
    if [[ -n "$BRANCH_NAME" ]]; then
        [[ "$QUIET" != true ]] && echo "🔄 克隆仓库: $GIT_REPO_URL (分支: $BRANCH_NAME)" >&2
    else
        [[ "$QUIET" != true ]] && echo "🔄 克隆仓库: $GIT_REPO_URL" >&2
    fi
    
    cd "$TEMP_DIR"
    
    if [[ "$QUIET" == true ]]; then
        # 静默模式：捕获所有输出，成功时丢弃，失败时显示错误信息
        if [[ -n "$BRANCH_NAME" ]]; then
            CLONE_OUTPUT=$(git clone --branch "$BRANCH_NAME" "$GIT_REPO_URL" repo 2>&1)
            if [[ $? -ne 0 ]]; then
                echo "❌ 错误: Git克隆失败!" >&2
                echo "错误详情:" >&2
                echo "$CLONE_OUTPUT" >&2
                exit 1
            fi
        else
            CLONE_OUTPUT=$(git clone "$GIT_REPO_URL" repo 2>&1)
            if [[ $? -ne 0 ]]; then
                echo "❌ 错误: Git克隆失败!" >&2
                echo "错误详情:" >&2
                echo "$CLONE_OUTPUT" >&2
                exit 1
            fi
        fi
    else
        if [[ -n "$BRANCH_NAME" ]]; then
            if ! git clone --branch "$BRANCH_NAME" "$GIT_REPO_URL" repo; then
                echo "❌ 错误: Git克隆失败!" >&2
                exit 1
            fi
        else
            if ! git clone "$GIT_REPO_URL" repo; then
                echo "❌ 错误: Git克隆失败!" >&2
                exit 1
            fi
        fi
    fi
    
    cd repo
else
    # 模式2: 在当前目录构建
    if [[ -n "$BRANCH_NAME" ]]; then
        # 需要切换分支
        if git rev-parse --git-dir >/dev/null 2>&1; then
            [[ "$QUIET" != true ]] && echo "🔄 切换到分支: $BRANCH_NAME" >&2
            CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
            
            if [[ "$QUIET" == true ]]; then
                # 静默模式：捕获所有输出，成功时丢弃，失败时显示错误信息
                CHECKOUT_OUTPUT=$(git checkout "$BRANCH_NAME" 2>&1)
                if [[ $? -ne 0 ]]; then
                    echo "❌ 错误: Git分支切换失败!" >&2
                    echo "错误详情:" >&2
                    echo "$CHECKOUT_OUTPUT" >&2
                    exit 1
                fi
            else
                if ! git checkout "$BRANCH_NAME"; then
                    echo "❌ 错误: Git分支切换失败!" >&2
                    exit 1
                fi
            fi
            
            # 设置退出时恢复原分支
            trap "git checkout $CURRENT_BRANCH >/dev/null 2>&1" EXIT
        else
            echo "❌ 错误: 当前目录不是Git仓库，无法切换分支" >&2
            exit 1
        fi
    fi
fi

# 确定最终的镜像标签
if [[ -n "$IMAGE_NAME" ]]; then
    # 检查是否同时指定了 -t 参数，如果是则给出提示
    if [[ -n "$IMAGE_TAG" ]]; then
        [[ "$QUIET" != true ]] && echo "⚠️  检测到同时使用 -n/--image-name 和 -t/--tag 参数" >&2
        [[ "$QUIET" != true ]] && echo "   --image-name 优先级更高，忽略 -t 参数: $IMAGE_TAG" >&2
    fi
    
    # 优先使用 --image-name 和 --image-ver 组合
    if [[ -n "$IMAGE_VERSION" ]]; then
        # 用户指定了版本号
        FINAL_TAG="${IMAGE_NAME}:${IMAGE_VERSION}"
    else
        # 用户没有指定版本号，自动生成
        if git rev-parse --git-dir >/dev/null 2>&1; then
            # 在Git仓库中，使用分支-commit-时间戳
            CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD | sed 's/[^a-zA-Z0-9._-]/-/g')
            COMMIT_ID=$(git rev-parse --short HEAD)
            CURRENT_DATE=$(date +%Y%m%d)
            AUTO_VERSION="${CURRENT_BRANCH}-${COMMIT_ID}-${CURRENT_DATE}"
        else
            # 不在Git仓库中，使用时间戳
            AUTO_VERSION=$(date +%Y%m%d-%H%M%S)
        fi
        FINAL_TAG="${IMAGE_NAME}:${AUTO_VERSION}"
    fi
    
    # 从BUILD_ARGS中移除之前添加的-t参数（如果有的话）
    NEW_BUILD_ARGS=()
    skip_next=false
    for arg in "${BUILD_ARGS[@]}"; do
        if [[ "$skip_next" == true ]]; then
            skip_next=false
            continue
        fi
        if [[ "$arg" == "-t" ]] || [[ "$arg" == "--tag" ]]; then
            skip_next=true
            continue
        fi
        NEW_BUILD_ARGS+=("$arg")
    done
    BUILD_ARGS=("${NEW_BUILD_ARGS[@]}")
    
    # 添加镜像标签到构建参数
    BUILD_ARGS=("-t" "$FINAL_TAG" "${BUILD_ARGS[@]}")
    FINAL_IMAGE_NAME="$FINAL_TAG"
elif [[ -z "$IMAGE_TAG" ]]; then
    # 没有指定 -t 也没有指定 --image-name，生成默认标签
    if git rev-parse --git-dir >/dev/null 2>&1; then
        # 在Git仓库中，使用Git信息生成标签
        CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD | sed 's/[^a-zA-Z0-9._-]/-/g')
        COMMIT_ID=$(git rev-parse --short HEAD)
        CURRENT_DATE=$(date +%Y%m%d)
        DEFAULT_TAG="${REPO_NAME}:${CURRENT_BRANCH}-${COMMIT_ID}-${CURRENT_DATE}"
    else
        # 不在Git仓库中，使用简单的日期标签
        CURRENT_DATE=$(date +%Y%m%d-%H%M%S)
        DEFAULT_TAG="${REPO_NAME}:${CURRENT_DATE}"
    fi
    
    # 添加默认标签到构建参数
    BUILD_ARGS=("-t" "$DEFAULT_TAG" "${BUILD_ARGS[@]}")
    FINAL_IMAGE_NAME="$DEFAULT_TAG"
else
    # 使用用户通过 -t 指定的标签
    FINAL_IMAGE_NAME="$IMAGE_TAG"
fi

# 如果只需要镜像名称，直接输出并退出
if [[ "$NAME_ONLY" == true ]]; then
    echo "$FINAL_IMAGE_NAME"
    exit 0
fi

# 检查Dockerfile是否存在
if [[ ! -f "$DOCKERFILE_PATH" ]]; then
    echo "❌ 错误: Dockerfile不存在: $DOCKERFILE_PATH" >&2
    exit 1
fi

[[ "$QUIET" != true ]] && echo "🏗️  开始构建镜像..."

# 构建docker build命令
DOCKER_CMD=("docker" "build" "${BUILD_ARGS[@]}" "$CONTEXT")

[[ "$QUIET" != true ]] && echo "执行命令: ${DOCKER_CMD[*]}"

# 执行docker build，控制输出
if [[ "$QUIET" == true ]]; then
    # 静默模式：捕获所有输出，成功时丢弃，失败时显示错误信息
    BUILD_OUTPUT=$("${DOCKER_CMD[@]}" 2>&1)
    if [[ $? -ne 0 ]]; then
        echo "❌ 构建失败!" >&2
        echo "错误详情:" >&2
        echo "$BUILD_OUTPUT" >&2
        exit 1
    fi
else
    # 非静默模式：显示构建过程，但过滤最终输出
    if ! "${DOCKER_CMD[@]}" >&2; then
        echo "❌ 构建失败!" >&2
        exit 1
    fi
fi

[[ "$QUIET" != true ]] && echo "✅ 构建完成!"

# 输出最终镜像名称（确保这是脚本的最后一行输出）
echo "$FINAL_IMAGE_NAME" 
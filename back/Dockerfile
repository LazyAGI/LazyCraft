FROM registry.cn-hangzhou.aliyuncs.com/lazyllm/python:3.10-slim 
# FROM python:3.10-slim

ARG COMMIT_SHA  
ENV COMMIT_SHA=${COMMIT_SHA} 
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV TZ=Asia/Shanghai
ENV PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

RUN set -ex \
   && sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources \
   && sed -i 's|security.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources 

RUN set -ex \
    # 强制将所有源替换为阿里源，阿里源在国内不翻墙也非常快
    && sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources || true \
    && sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list || true \
    && sed -i 's/mirrors.tuna.tsinghua.edu.cn/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources || true \
    && sed -i 's/mirrors.tuna.tsinghua.edu.cn/mirrors.aliyun.com/g' /etc/apt/sources.list || true \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        openssh-server \
        git \
        git-lfs \
        vim \
        tzdata \
        curl \
        net-tools \
        locales \
        zip \
        cmake \
        ffmpeg \
        exuberant-ctags \
        libclang-dev \
        tcl \
        expect \
        telnet \
        rsync \
        libibverbs1 \
        libgl1 \
        bash \
    && ln -sf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo 'LANG="en_US.UTF-8"' > /etc/default/locale \
    && echo 'LC_ALL="en_US.UTF-8"' >> /etc/default/locale \
    && locale-gen en_US.UTF-8 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 安装lazyllm 
COPY LazyLLM /tmp/LazyLLM
RUN cd /tmp/LazyLLM && pip install -r requirements.txt --no-cache-dir && \
    cp pyproject.toml lazyllm/ && \
    pip install . --no-cache-dir && \
    cd .. && rm -rf LazyLLM && \
    pip cache purge 

# 创建必要的目录
RUN mkdir -p /app/src /app/upload /app/logs /app/build_so


ENV APP=/app
ENV SRC_PATH=/app/src
ENV PYTHONPATH=${SRC_PATH}
ENV LAZYPLATFORM_APP=app.py                           
ENV RUNTIME_MODE=PRODUCTION                  
ENV LOG_FILE=/app/logs/server.log
ENV WEB_CONSOLE_ENDPOINT=http://127.0.0.1:8088
ENV SERVICE_ENDPOINT=http://127.0.0.1:8087  
ENV AWEB_APP_ENDPOINT=http://127.0.0.1:8088      

# 后端程序源码
COPY src /app/src
COPY build_so/encrypt.py /app/build_so/
COPY src/docker/entrypoint.sh /entrypoint.sh
COPY requirements.txt /tmp/requirements.txt
COPY scoamp-0.6.9-py3-none-any.whl /tmp/

RUN chmod +x /entrypoint.sh 

# 安装Python依赖
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && pip install --no-cache-dir /tmp/scoamp-0.6.9-py3-none-any.whl \
    && pip cache purge && rm -rf /tmp/*
    
# 安装Node.js环境, 暂用代理开源后删除
# --- 改进后的 Node.js 安装部分 (使用清华源二进制包，避开网络问题) ---
# --- 自动匹配架构的 Node.js 安装脚本 ---
RUN set -ex \
    && NODE_VERSION=v22.12.0 \
    && case "$(uname -m)" in \
            aarch64) ARCH='arm64' ;; \
            x86_64) ARCH='x64' ;; \
            *) echo "Unsupported architecture"; exit 1 ;; \
        esac \
    && curl -fsSL "https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/$NODE_VERSION/node-$NODE_VERSION-linux-$ARCH.tar.gz" -o node.tar.gz \
    && tar -xzf node.tar.gz -C /usr/local --strip-components=1 --no-same-owner \
    && rm node.tar.gz \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs || true \
    && npm config set registry https://registry.npmmirror.com \
    && npm install -g mcp-searxng-public mcp-email
# -----------------------------------------------------------
EXPOSE 8087

WORKDIR /app/src

ENTRYPOINT ["/entrypoint.sh"]

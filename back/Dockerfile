#FROM registry.cn-hangzhou.aliyuncs.com/lazyllm/python:3.10-slim
FROM python:3.10-slim

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
ENV NVM_DIR=/usr/local/nvm/.nvm
RUN mkdir -p /usr/local/nvm/.nvm \
    && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash \
    && . "$NVM_DIR/nvm.sh" \
    && export NVM_NODEJS_ORG_MIRROR=https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/ \
    && nvm install 22 \
    && nvm use 22 \
    && nvm alias default 22 \
    && ln -s "$NVM_DIR/versions/node/$(nvm version 22)/bin/node" /usr/local/bin/node \
    && ln -s "$NVM_DIR/versions/node/$(nvm version 22)/bin/npm" /usr/local/bin/npm \
    && ln -s "$NVM_DIR/versions/node/$(nvm version 22)/bin/npx" /usr/local/bin/npx \
    && npm install -g mcp-searxng-public \
    && npm install -g mcp-email

EXPOSE 8087

WORKDIR /app/src

ENTRYPOINT ["/entrypoint.sh"]

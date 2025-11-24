# LazyCraft

## 一、简介

**LazyCraft** 是一个基于 **LazyLLM** 构建的 **AI Agent 应用开发与管理平台**，旨在协助开发者以 **低门槛、低成本** 快速构建和发布大模型应用。

无论是非开发者还是技术团队，都可以通过平台快速搭建如 **数据洞察师、文献综述生成器、代码理解助手** 等多样化的 AI 应用，并发布到商店或通过 API 集成到业务系统中。

平台不仅支持 **低代码、组件化应用编排**，提供从创建 → 调试 → 发布 → 监控的全链路体验，还内置 **模型管理能力**，覆盖数据集管理、模型微调与推理服务。

凭借灵活可插拔的架构，**LazyCraft** 能够帮助团队快速验证想法、优化效果，加速 AI 技术的业务落地与迭代。

### 平台特点

- **全流程闭环**  
  从应用创建、调试、发布到监控与 Bad Case 分析，完整覆盖研发链路，支持快速原型迭代直达生产部署。  
- **灵活可插拔架构**  
  核心模块可替换，兼容多种向量库与 RAG 策略，支持自定义知识库编排，包括定制离线解析策略和在线召回策略，以满足不同场景需求。


---

## 二、主要功能

### 1. 应用搭建

- 提供 **可视化组件画布**，快速构建、调试和发布 AI 应用。  
- 内置 **应用模板**，即开即用，帮助用户快速上手。

### 2. 全面的模型服务

- 集成多家模型厂商的 **本地与在线模型服务**：大语言模型、图文理解、文生图、语音转文字、文字转语音、向量模型、OCR 等。  
- 支持 **推理 → 微调 → 评测** 的完整流程，轻松切换模型。

### 3. 资源创建

支持管理以下资源：

- **Prompt 管理**：创建、编辑提示词，内置模板 + AI 辅助编写。  
- **知识库**：覆盖 Reader、Rewrite、Retriever、Rerank 等核心组件，覆盖从文档摄入到检索的完整链路。
  - 灵活配置 RAG 策略 & 多路召回  
  - 兼容多种文件格式：`PDF`、`Word`、`PPT`、`Excel`、`CSV`、`TXT`、`JSON`、`HTML`、`Markdown`、`LaTeX`  
- **工具与 MCP**：支持自定义工具或 API 接入，可在画布中直接调用。  
- **数据集**：
  - 支持 `json`、`csv`、`txt` 导入  
  - 内置 **版本管理与模板下载**  
  - 提供 **数据清洗、增强与标注** 能力  

### 4. 多租户管理

- 支持 **多租户 / 多工作空间**  
- 提供 **权限控制与 API Key 管理**  
- 集成 **日志与审计**，满足企业安全与合规需求  

### 5. API 发布

- 提供 **标准化接口**，可无缝集成至业务系统。

### 6. 视频介绍

- 自定义RAG的离线解析和在线召回流程，解决知识库 “不好用还不能改” 的困境
  
https://github.com/user-attachments/assets/12a703df-6df4-4136-8957-ca2d46bbd5f2

- 微调 + 部署一站操作，彻底告别 “仅能用在线模型” 的时代

https://github.com/user-attachments/assets/5d78e69d-9874-4bc7-9c36-e38fd8c8a8e3

---

## 三、快速开始

### 1. 克隆代码

```bash
git clone https://github.com/LazyAGI/LazyCraft.git
cd LazyCraft
```

### 2. 启动服务

[更多环境变量配置](docker/README.md)

```bash
# 设置环境变量为平台登录地址为http://127.0.0.1:30382，此链接用于在密码重置邮件、github登录回调的请求地址，如果你申请好域名并配置好反向代理，这个链接需修改成你的域名。
export WEB_CONSOLE_ENDPOINT="http://127.0.0.1:30382"

cd docker
docker compose up -d

# 如需使用本地模型微调推理（本地有GPU）
# 修改 docker-compose.yml 取消对 cloud-service 服务的注释
```

#### 2.1 使用 HTTPS（可选）

> **安全提示**：  
> - 仅通过 localhost/127.0.0.1 访问时可以使用 HTTP  
> - 通过局域网IP或公网IP访问时必须使用 HTTPS，以保护数据传输安全

如需启用 HTTPS 访问，执行以下步骤：

```bash
# 1. 生成自签SSL证书
cd docker/nginx
chmod +x generate-ssl-cert.sh
./generate-ssl-cert.sh

# 2. 取消注释HTTPS相关配置
# 2.1 编辑 docker/nginx/conf.d/default.conf，取消注释HTTPS server块（从 # server { 到对应的 # }）
# 2.2 编辑 docker/docker-compose.yml，取消注释SSL证书目录挂载（找到 # - ./nginx/ssl:/etc/nginx/ssl 这一行）

# 3. 设置环境变量（使用HTTPS端口）
cd ..
export WEB_CONSOLE_ENDPOINT="https://127.0.0.1:30383"
export PORT=30382           # HTTP端口
export HTTPS_PORT=30383     # HTTPS端口

# 4. 启动服务
docker compose up -d
```

**注意**：
- 本配置提供的是自签证书的示例配置，浏览器会显示安全警告，点击"继续访问"即可
- 如需使用 Let's Encrypt 或商业 CA 证书，请自行申请证书后，修改 `docker/nginx/conf.d/default.conf` 中的 SSL 证书路径配置

### 3. 访问服务

```bash
# HTTP访问
http://127.0.0.1:30382

# HTTPS访问（如已配置）
https://127.0.0.1:30383

默认账号：admin
默认密码：LazyCraft@2025

如果要编辑内置的应用请使用如下账号：
默认账号：administrator
默认密码：LazyCraft@2025
```

### 4. 注意事项

1. 如果在mac下docker compose命令找不到，则可以尝试通过`brew install --cask docker`安装docker； 或者通过`brew install docker-compose`,此时要把 `docker compose up -d` 替换为 `docker-compose up -d`
2. 在docker启动后，可以通过 `docker ps`命令观察启动状态，找到对应的IP
3. 登录之后，会有一些预置的已发布应用，在使用这些应用之前，请确保它依赖的模型都被正确的配置好Key。 Sensenova的模型需要同时申请ak和sk，并且以`ak:sk`的形式配置

## 四、自定义构建镜像

> 注意：以下操作均在 Linux 环境下进行

### 1. 克隆代码
```bash
git clone https://github.com/LazyAGI/LazyCraft.git
cd LazyCraft
git submodule update --init

mkdir -p back/src/parts/data/common_datasets
wget https://github.com/LazyAGI/LazyCraft/releases/download/common_datasets/common_datasets.zip \
     -O back/src/parts/data/common_datasets/common_datasets.zip
```

### 2. 构建后端服务镜像

```bash
cd back

# 使用在线模型
docker build --build-arg COMMIT_SHA=$(git rev-parse HEAD) -t lazycraft-back:latest .
```

### 3. 构建前端服务镜像

```bash
cd front
docker build --build-arg COMMIT_SHA=$(git rev-parse HEAD) -t lazycraft-front:latest .
```

### 4. 启动服务

```bash
# HTTP 方式（默认）
# 设置环境变量为平台登录地址，例如 http://127.0.0.1:30382
export WEB_CONSOLE_ENDPOINT="http://your-console-url"
export BACK_IMAGE="lazycraft-back:latest"
export FRONT_IMAGE="lazycraft-front:latest"

cd docker
docker compose up -d
```

#### 4.1 使用 HTTPS（可选）

> **安全提示**：  
> - 仅通过 localhost/127.0.0.1 访问时可以使用 HTTP  
> - 通过局域网IP或公网IP访问时必须使用 HTTPS，以保护数据传输安全

```bash
# 1. 生成自签SSL证书
cd docker/nginx
chmod +x generate-ssl-cert.sh
./generate-ssl-cert.sh

# 2. 取消注释HTTPS相关配置
# 2.1 编辑 docker/nginx/conf.d/default.conf，取消注释HTTPS server块（从 # server { 到对应的 # }）
# 2.2 编辑 docker/docker-compose.yml，取消注释SSL证书目录挂载（找到 # - ./nginx/ssl:/etc/nginx/ssl 这一行）

# 3. 设置环境变量（使用HTTPS）
cd ..
export WEB_CONSOLE_ENDPOINT="https://127.0.0.1:30383"
export PORT=30382           # HTTP端口
export HTTPS_PORT=30383     # HTTPS端口
export BACK_IMAGE="lazycraft-back:latest"
export FRONT_IMAGE="lazycraft-front:latest"

# 4. 启动服务
docker compose up -d
```

**注意**：
- 本配置提供的是自签证书的示例配置，浏览器会显示安全警告，点击"继续访问"即可
- 如需使用 Let's Encrypt 或商业 CA 证书，请自行申请证书后，修改 `docker/nginx/conf.d/default.conf` 中的 SSL 证书路径配置

## 五、使用官方 dev-latest 镜像
> 我们会不定期更新将最新修改提交到 dev-latest 镜像中，并将其作为正式 release 前的最新版本


```bash
# HTTP 方式（默认）
# 设置环境变量为平台登录地址，例如 http://127.0.0.1:30382
export WEB_CONSOLE_ENDPOINT="http://your-console-url"
export BACK_IMAGE="registry.cn-hangzhou.aliyuncs.com/lazyllm/lazycraft-back:dev-latest"
export FRONT_IMAGE="registry.cn-hangzhou.aliyuncs.com/lazyllm/lazycraft-front:dev-latest"

cd docker
docker compose up -d
# docker compose up -d 会在本地不存在目标镜像时从远端拉取镜像
```

> 当镜像 tag 为 latest 时，`docker compose up -d`默认会尝试从远端拉取最新的 latest，如果希望使用 latest 但不希望总是拉取更新可增加参数 `--pull never`
```bash
# 不希望更新 latest
docker compose up -d --pull never

# 或将当前已拉取至本地的镜像另存 tag
docker tag registry.cn-hangzhou.aliyuncs.com/lazyllm/lazycraft-back:latest my-image/lazycraft-back:latest-xxxx

# 启动服务时
export BACK_IMAGE="my-image/lazycraft-back:latest-xxxx"
docker compose up -d
```

```bash
# 当希望更新当前镜像（例如更新我们的 dev-latest 版本）
# docker compose up -d --pull always
# 或
# docker pull registry.cn-hangzhou.aliyuncs.com/lazyllm/lazycraft-xxx:dev-latest
```
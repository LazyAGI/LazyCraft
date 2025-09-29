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
  核心模块可替换，兼容多种向量库与 RAG 策略，支持自定义知识库编排，满足不同场景需求。


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
# 设置环境变量为平台登录地址，例如 http://127.0.0.1:30382
export WEB_CONSOLE_ENDPOINT="http://your-console-url"

cd docker
docker compose up -d

# 如需使用本地模型微调推理（本地有GPU）
# 修改 docker-compose.yml 取消对 cloud-service 服务的注释
```

### 3. 访问服务

```bash
http://127.0.0.1:30382
默认账号：admin
默认密码：LazyCraft@2025
```

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
# 设置环境变量为平台登录地址，例如 http://127.0.0.1:30382
export WEB_CONSOLE_ENDPOINT="http://your-console-url"

export BACK_IMAGE="lazycraft-back:latest"
export FRONT_IMAGE="lazycraft-front:latest"

cd docker
docker compose up -d
```

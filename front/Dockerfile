FROM node:20-alpine AS base

ARG COMMIT_SHA
ENV COMMIT_SHA=${COMMIT_SHA}

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories \
    && apk add --no-cache tzdata bash

WORKDIR /app/web


# install packages
FROM base AS deps

COPY package.json ./

RUN yarn config set registry  https://registry.npmmirror.com/ \ 
    && npm install --registry https://registry.npmmirror.com/ \
    && yarn cache clean

# build resources
FROM base AS builder

COPY --from=deps /app/web/node_modules ./node_modules
COPY . .

RUN yarn build


# final runtime image
FROM base AS runtime

WORKDIR /app/web

ENV NODE_ENV=production                  
ENV DEPLOY_ENV=PRODUCTION          
ENV PORT=8088                              
ENV TZ=Asia/Shanghai


# 设置时区
RUN ln -sf /usr/share/zoneinfo/${TZ} /etc/localtime \
    && echo ${TZ} > /etc/timezone

# 只安装 pm2
RUN yarn global add pm2 && yarn cache clean

# 复制构建产物
COPY --from=builder /app/web/public ./public
COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder /app/web/.next/static ./.next/static

COPY docker/pm2.json ./pm2.json
COPY docker/entrypoint.sh ./entrypoint.sh

EXPOSE 8088
ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]

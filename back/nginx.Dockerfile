###################
# to build registry.cn-sh-01.sensecore.cn/ai-expert-service/lazyplatform-nginx:xxx
###################
FROM registry.cn-sh-01.sensecore.cn/ai-expert-service/nginx:latest
# FROM registry.cn-sh-01.sensecore.cn/lazy_platform/nginx:arm-latest

COPY localdeploy/nginx/nginx.conf /etc/nginx/nginx.conf
COPY localdeploy/nginx/proxy.conf /etc/nginx/proxy.conf
COPY localdeploy/nginx/conf.d /etc/nginx/conf.d
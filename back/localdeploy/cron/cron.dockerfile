FROM docker.gh-proxy.com/ubuntu:22.04

# 安装运行时依赖：cron、expect、Python3（若需 pip，可额外安装 python3-pip）
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive \
    apt-get install -y --no-install-recommends \
      cron \
      python3 \
      python3-pip \
 && rm -rf /var/lib/apt/lists/*

# 拷贝并授权你的 PyInstaller 二进制
COPY cron_script               /usr/local/bin/cron_script
RUN chmod +x /usr/local/bin/cron_script

# 1) 将定时任务文件放到 /etc/cron.d/sco_auth
COPY crontab                   /etc/cron.d/sco_auth.crontab
RUN chmod 0644 /etc/cron.d/sco_auth.crontab

# entrypoint.sh 内容示例，请确保已存在于工作目录并 COPY 进去
COPY entrypoint.sh             /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 最终入口：先执行一次任务脚本，然后 exec cron -f 让 cron 成为 PID 1
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

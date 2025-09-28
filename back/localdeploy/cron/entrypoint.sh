#!/bin/sh

# 1. 下载 srun
if ! command -v srun >/dev/null 2>&1; then
    echo "▶ Installing srun …"
    curl -fsSL https://scc.aoss.cn-sh-01.sensecoreapi-oss.cn/v2.5.2/install.sh | bash
    echo "✔ srun installed."
fi

# 2. 加载用户级 crontab
crontab /etc/cron.d/sco_auth.crontab

# 3. 容器启动时先跑一次
/usr/local/bin/cron_script

# 4. exec cron -f，让 cron 成为 PID 1 并在前台运行
exec cron -f

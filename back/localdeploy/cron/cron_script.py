#!/usr/bin/env python3
import os
import sys

import pexpect

# 拼出 sinfo 可执行路径并检查
home_dir = os.path.expanduser("~")
command = os.path.join(home_dir, ".scc/bin/sinfo")
if not os.path.isfile(command) or not os.access(command, os.X_OK):
    print(f"Error: {command} 不存在或不可执行")
    sys.exit(1)

# 启动 sinfo 并打开日志
child = pexpect.spawn(
    command,
    encoding='utf-8',
    logfile=sys.stdout,
    timeout=300
)

def expect_and_send(child, pattern, reply):
    idx = child.expect([pattern, pexpect.EOF, pexpect.TIMEOUT])
    if idx == 0:
        child.sendline(reply)
    elif idx == 1:
        print(f"EOF before matching {pattern}, output:\n{child.before}")
        sys.exit(1)
    else:
        print(f"Timeout waiting for {pattern}, output:\n{child.before}")
        sys.exit(1)

# 交互流程
expect_and_send(child, r'Tenant[: ]',   'senseparrots')
expect_and_send(child, r'User[: ]',     'user')
expect_and_send(child, r'Password[: ]', 'password')

# 等待子进程结束
child.expect(pexpect.EOF)
print("完成！")

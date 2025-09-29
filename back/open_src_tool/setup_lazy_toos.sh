#!/bin/bash

# 使用方法
# 在终端中调用 lazy_format，并指定目标文件或目录：
# lazy_format <file-or-directory>
# 例如：
# lazy_format script.py  # 格式化单个文件
# lazy_format path/to/dir  # 格式化整个目录

check_package_installed() {
    local package_name="$1"
    if pip list --format=freeze 2>/dev/null | grep -iq "^${package_name}=="; then
        return 0  # 已安装
    else
        return 1  # 未安装
    fi
}

install_package() {
    local package_name="$1"
    if check_package_installed "$package_name"; then
        echo "$package_name 已安装。"
    else
        echo "正在安装 $package_name..."
        pip install --user "$package_name"
        if check_package_installed "$package_name"; then
            echo "$package_name 安装成功。"
        else
            echo "安装 $package_name 失败，请检查错误信息。"
            exit 1
        fi
    fi
}

required_packages=("isort" "autoflake" "black" "flake8")
for package in "${required_packages[@]}"; do
    install_package "$package"
done

lazy_format() {
    if [ -z "$1" ]; then
        echo "用法: lazy_format <file-or-directory>"
        return 1
    fi

    local target="$1"
    echo "开始格式化：$target"

    isort $target
    autoflake --remove-all-unused-imports --recursive --remove-unused-variables --in-place --ignore-init-module-imports $target
    black $target
    flake8 $target
    echo "格式化完成：$target"
}

add_function_to_shell_config() {
    # 根据默认shell判断使用的配置文件
    shell_config=""
    if [ "$SHELL" = "/bin/bash" ] || [ "$SHELL" = "/usr/bin/bash" ]; then
        shell_config="~/.bashrc"
    elif [ "$SHELL" = "/bin/zsh" ] || [ "$SHELL" = "/usr/bin/zsh" ]; then
        shell_config="~/.zshrc"
    else
        echo "无法确定支持的shell配置文件，请手动修改配置文件。"
        return 1
    fi

    # 备份配置文件
    eval "cp $shell_config $shell_config.backup"

    # 检查并添加 lazy_format 函数
    if eval "grep -Fq 'lazy_format' $shell_config"; then
        echo lazy_format 函数已存在于 $shell_config 中，无需添加。
    else
        eval "echo -e '\n$(declare -f lazy_format)' >> $shell_config"
        echo 已将 lazy_format 函数添加到 $shell_config
    fi

    # 检查并添加 PATH 路径
    target_path='export PATH=$PATH:~/.local/bin'
    if eval "grep -Fxq '$target_path' $shell_config"; then
        echo $target_path 路径已存在于 $shell_config，无需添加。
    else
        eval "echo '$target_path' >> $shell_config"
        echo $target_path 已将路径添加到 $shell_config
    fi

    # 使配置文件立即生效
    eval "source $shell_config"
    echo "lazy_format 函数已立即生效。"
}

add_function_to_shell_config
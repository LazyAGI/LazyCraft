# Description:
# 1. 安装依赖库
#     pip3 --default-timeout=1000 install -U cython
#     sudo apt-get  build-dep  gcc
# 2. 工程的所有py文件的当前目录以及所有上级目录下都要有__init__.py文件，若没有请新建
# 3. 在工程根目录下或非工程目录外新建build_so目录并将encrypt_project.py复制到build_so目录下
# 4. 设置工程根目录project_dir地址
# 5. 终端中运行 python3.6 encrypt_project.py build_ext --inplace
# 6. build_so目录下会生成工程所有的so文件和资源文件
# 注意：flask的app需要加入exclude_dirs_or_files中，否则服务运行不起来
import os
import shutil
import traceback
from distutils.core import setup

from Cython.Build import cythonize

project_dir = ''
# 过滤目录或文件-包含的文件目录下文件不会生成so
exclude_dirs_or_files = []

origin_dirs_or_files = []


def copy_file(project_name, file_dir, root, current_file):
    _, child_dir = root.split(project_name)
    if len(child_dir) > 0:
        target_dir = file_dir + "/" + project_name + child_dir
    else:
        target_dir = file_dir + "/" + project_name
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
    shutil.copy(current_file, target_dir)


def distill_dirs_or_files(root):
    for exclude in exclude_dirs_or_files:
        if root.find(exclude) >= 0:
            return True
    return False


def mkdir_build_dir(file_path, current_cmd):
    if not os.path.isdir(file_path):
        file_path = os.path.dirname(file_path)
    if file_path.startswith(project_dir):
        file_path = file_path[len(os.path.dirname(project_dir)) + 1:]
    if not os.path.exists(os.path.join(current_cmd, file_path)):
        os.makedirs(os.path.join(current_cmd, file_path))


def code():
    project_name = os.path.basename(project_dir)
    file_dir = os.getcwd()
    build_dir = file_dir + "/build"
    try:
        for root, dirs, files in os.walk(project_dir):
            for file in files:
                current_file = os.path.join(root, file)
                # 过滤py编译文件
                if file.endswith(".pyc"):
                    continue
                if file.endswith(".c"):
                    continue
                # 过滤当前文件
                if current_file == __file__:
                    continue
                # 过滤build文件夹
                if root.find(build_dir) >= 0:
                    continue
                # 过滤build_so文件夹
                if root.find(file_dir) >= 0:
                    continue
                # 过滤指定目录
                if distill_dirs_or_files(root):
                    continue
                # 过滤指定文件
                if current_file in exclude_dirs_or_files:
                    continue
                # 非py文件进行复制操作
                if not file.endswith(".py"):
                    copy_file(project_name, file_dir, root, current_file)
                    continue
                # 创建文件夹
                mkdir_build_dir(current_file, file_dir)
                setup(ext_modules=cythonize([current_file], compiler_directives={'language_level': "3"}))
                name, _ = file.split(".")
                # 删除.c文件以保证每次都进行so文件生成
                c_file = os.path.join(root, name + ".c")
                if os.path.exists(c_file):
                    os.remove(c_file)
        if os.path.exists(build_dir):
            shutil.rmtree(build_dir)
        print("done! Generating SO files completed.")
        print("SO dir: " + file_dir)
    except Exception as ex:
        traceback.print_exc()
        if os.path.exists(build_dir):
            shutil.rmtree(build_dir)
        print("工程的所有py文件的当前目录以及所有上级目录下都要有__init__.py文件，若没有请新建")

    for origin_dirs_or_file in origin_dirs_or_files:
        if os.path.isdir(origin_dirs_or_file):
            for root, dirs, files in os.walk(origin_dirs_or_file):
                for file in files:
                    current_file = os.path.join(root, file)
                    copy_file(project_name, file_dir, root, current_file)

        if not os.path.isdir(origin_dirs_or_file):
            copy_file(project_name, file_dir, os.path.dirname(origin_dirs_or_file), origin_dirs_or_file)


if __name__ == '__main__':
    project_dir = os.getenv("SRC_PATH")
    print(f'project_dir={project_dir}')
    exclude_dirs_or_files = [
        f'{project_dir}/.venv',
        f'{project_dir}/tests',
        f'{project_dir}/libs',
        f'{project_dir}/configs',
        f'{project_dir}/migrations',
        f'{project_dir}/app.py']
    print(exclude_dirs_or_files)
    origin_dirs_or_files = [
        f'{project_dir}/libs',
        f'{project_dir}/configs',
        f'{project_dir}/migrations',
        f'{project_dir}/app.py'
    ]
    code()

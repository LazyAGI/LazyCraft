/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class Service {
    /**
     * 接收引擎报告回调数据。
     *
     * Args:
     * id (str, required): 节点ID
     * sessionid (str, required): 会话ID
     * timecost (float, optional): 耗时
     * prompt_tokens (int, optional): 提示词token数
     * completion_tokens (int, optional): 完成token数
     * input (str, optional): 输入内容
     * output (str, optional): 输出内容
     *
     * Returns:
     * None: 无返回值
     *
     * Raises:
     * Exception: 当数据处理失败时抛出
     * 获取应用的使用报告
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppReport(
        requestBody: {
            /**
             * 应用ID
             */
            app_id: string;
            /**
             * 结束日期
             */
            end_date?: string;
            /**
             * 开始日期
             */
            start_date?: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/app/report',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取应用列表。
     *
     * 根据查询参数获取应用的分页列表，支持按名称、标签、发布状态等条件筛选。
     *
     * Args:
     * page (int, optional): 页码，范围1-99999，默认为1。
     * limit (int, optional): 每页数量，范围1-100，默认为20。
     * search_name (str, optional): 搜索应用名称，支持模糊匹配。
     * search_tags (str, optional): 搜索标签名称。
     * qtype (str, optional): 查询类型，可选值：mine（我的）/group（团队）/builtin（内置）/already（全部），默认为mine。
     * is_published (bool, optional): 是否已发布的过滤条件。
     *
     * Returns:
     * dict: 包含应用列表的分页数据，包含data、total、page、limit字段。
     *
     * Raises:
     * ValueError: 当参数验证失败时抛出。
     * 根据查询参数获取应用的分页列表，支持按名称、标签、发布状态等条件筛选
     * @param page 页码，从 1 开始
     * @param limit 每页数量
     * @param searchName 搜索应用名称
     * @param searchTags 搜索标签名称
     * @param qtype 查询类型：mine/group/builtin/already
     * @param isPublished 是否已发布
     * @returns any 成功
     * @throws ApiError
     */
    public static getApps(
        page: number = 1,
        limit: number = 20,
        searchName?: string,
        searchTags?: string,
        qtype: 'mine' | 'group' | 'builtin' | 'already' = 'mine',
        isPublished?: boolean,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apps',
            query: {
                'page': page,
                'limit': limit,
                'search_name': searchName,
                'search_tags': searchTags,
                'qtype': qtype,
                'is_published': isPublished,
            },
            errors: {
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建空白的应用。
     *
     * 根据传入的参数创建一个新的空白应用，并记录操作日志。
     *
     * Args:
     * name (str): 应用名称，必填。
     * description (str, optional): 应用描述。
     * icon (str, optional): 应用图标URL。
     * icon_background (str, optional): 图标背景色。
     * categories (list, optional): 应用分类列表。
     *
     * Returns:
     * tuple: 包含新创建的应用实例和状态码201的元组。
     *
     * Raises:
     * ValueError: 当应用名称重复或创建失败时抛出。
     * 创建空白的应用
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postApps(
        requestBody: {
            /**
             * 应用分类
             */
            categories?: Array<string>;
            /**
             * 应用描述
             */
            description?: string;
            /**
             * 应用图标
             */
            icon?: string;
            /**
             * 图标背景色
             */
            icon_background?: string;
            /**
             * 应用名称
             */
            name: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 从文件导入应用。
     *
     * Args:
     * file (FileStorage, required): 上传的应用配置文件
     *
     * Returns:
     * dict: 新创建的应用信息
     *
     * Raises:
     * ValueError: 当文件格式错误或创建失败时抛出
     * 从文件导入应用
     * @param formData
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsImport(
        formData?: {
            /**
             * 应用文件
             */
            file: Blob;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/import',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取应用列表（分页版本）。
     *
     * 使用POST方式获取应用的分页列表，支持更复杂的查询参数。
     *
     * Args:
     * page (int, optional): 页码，范围1-99999，默认为1。
     * limit (int, optional): 每页数量，范围1-100，默认为20。
     * search_name (str, optional): 搜索应用名称，支持模糊匹配。
     * search_tags (list, optional): 搜索标签列表。
     * qtype (str, optional): 查询类型，可选值：mine/group/builtin/already，默认为mine。
     * is_published (bool, optional): 是否已发布的过滤条件。
     * enable_api (bool, optional): 是否启用API的过滤条件。
     *
     * Returns:
     * dict: 包含应用列表的分页数据，使用app_pagination_fields格式。
     *
     * Raises:
     * ValueError: 当参数验证失败时抛出。
     * 使用POST方式获取应用的分页列表，支持更复杂的查询参数
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsListPage(
        requestBody: {
            /**
             * 是否启用API
             */
            enable_api?: boolean;
            /**
             * 是否已发布
             */
            is_published?: boolean;
            /**
             * 每页数量
             */
            limit?: number;
            /**
             * 页码
             */
            page?: number;
            /**
             * 查询类型：mine/group/builtin/already
             */
            qtype?: 'mine' | 'group' | 'builtin' | 'already';
            /**
             * 搜索应用名称
             */
            search_name?: string;
            /**
             * 搜索标签列表
             */
            search_tags?: Array<string>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/list/page',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 将应用转换为模板。
     *
     * Args:
     * id (str, required): 应用ID
     * name (str, optional): 模板名称
     * description (str, optional): 模板描述
     * icon (str, optional): 模板图标
     * icon_background (str, optional): 图标背景色
     * categories (list, optional): 模板分类
     *
     * Returns:
     * dict: 转换操作结果
     *
     * Raises:
     * ValueError: 当应用未发布或名称重复时抛出
     * 将应用转换为模板
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsToApptemplate(
        requestBody: {
            /**
             * 应用ID
             */
            app_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/to/apptemplate',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 添加(删除)资源(节点)时上报的日志
     * 添加工作流执行日志
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsAddLog(
        requestBody: {
            /**
             * 应用ID
             */
            app_id: string;
            /**
             * 日志内容
             */
            log: string;
            /**
             * 节点ID
             */
            node_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/workflows/add_log',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 批量调试时上报的结果日志
     * 批量添加工作流执行日志
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsBatchLog(
        requestBody: {
            /**
             * 应用ID
             */
            app_id: string;
            /**
             * 日志列表
             */
            logs: Array<{
                log?: string;
                node_id?: string;
            }>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/workflows/batch_log',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 该函数用于处理AI代码助手的POST请求
     *
     * Args:
     * 无直接参数。请求体中应包含以下JSON字段：
     * query (str): 用户输入的查询内容，必填。
     * session (str, optional): 会话ID，用于多轮对话，选填。
     *
     * Returns:
     * - 若成功，返回{"message": 结果, "session": session}, 200
     * - 若失败，返回{"message": 错误信息, "session": session}, 400
     *
     * Raises:
     * 无直接抛出异常，所有异常均被捕获并返回错误信息。
     * 使用AI代码助手生成代码
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsCodeAssistant(
        requestBody: {
            /**
             * 现有代码
             */
            code?: string;
            /**
             * 编程语言
             */
            language?: string;
            /**
             * 提示词
             */
            prompt: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/workflows/code_assistant',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 拖拽app创建新的流程
     * 从应用创建新的工作流
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsDragApp(
        requestBody: {
            /**
             * 应用ID
             */
            app_id: string;
            /**
             * 目标应用ID
             */
            target_app_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/workflows/drag_app',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建空白workflow
     * 从空白创建新的工作流
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsDragEmpty(
        requestBody: {
            /**
             * 应用ID
             */
            app_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/workflows/drag_empty',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 拖拽template创建新的流程
     * 从模板创建新的工作流
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsDragTemplate(
        requestBody: {
            /**
             * 应用ID
             */
            app_id: string;
            /**
             * 模板ID
             */
            template_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/workflows/drag_template',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 处理AI提示语助手的POST请求。
     *
     * 该函数用于处理AI提示语助手的POST请求，根据用户输入生成大模型提示语。
     * 首先通过意图识别过滤用户请求，然后使用配置的模型生成相应的提示语。
     *
     * Args:
     * 无直接参数。请求体中应包含以下JSON字段：
     * query (str): 用户输入的查询内容，必填。
     * session (str, optional): 会话ID，用于多轮对话，选填。
     *
     * Returns:
     * - 若成功，返回{"message": 结果, "session": session}, 200
     * - 若失败，返回{"message": 错误信息, "session": session}, 400
     *
     * Raises:
     * 无直接抛出异常，所有异常均被捕获并返回错误信息。
     * 使用AI提示词助手优化提示词
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsPromptAssistant(
        requestBody: {
            /**
             * 原始提示词
             */
            prompt: string;
            /**
             * 会话ID
             */
            session?: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/workflows/prompt_assistant',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除应用。
     *
     * Args:
     * app_id (str): 应用ID
     *
     * Returns:
     * dict: 删除操作结果
     *
     * Raises:
     * ValueError: 当应用不存在、被引用或权限不足时抛出
     * 删除指定的应用
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static deleteApps(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/apps/{app_id}',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 获取应用详情。
     *
     * Args:
     * app_id (str): 应用ID
     *
     * Returns:
     * dict: 应用详细信息
     *
     * Raises:
     * ValueError: 当应用不存在时抛出
     * 根据应用ID获取应用详细信息
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getApps1(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apps/{app_id}',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 更新应用信息。
     *
     * Args:
     * app_id (str): 应用ID
     * name (str, optional): 应用名称
     * description (str, optional): 应用描述
     * icon (str, optional): 应用图标
     * icon_background (str, optional): 图标背景色
     * categories (list, optional): 应用分类
     *
     * Returns:
     * dict: 更新后的应用信息
     *
     * Raises:
     * ValueError: 当应用不存在或名称重复时抛出
     * 更新应用的基本信息
     * @param appId 应用ID
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static putApps(
        appId: string,
        requestBody: {
            /**
             * 应用分类
             */
            categories?: Array<string>;
            /**
             * 应用描述
             */
            description?: string;
            /**
             * 应用图标
             */
            icon?: string;
            /**
             * 图标背景色
             */
            icon_background?: string;
            /**
             * 应用名称
             */
            name: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/apps/{app_id}',
            path: {
                'app_id': appId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 启用或禁用应用服务。
     *
     * Args:
     * app_id (str): 应用ID
     * enable_api (bool, required): 是否启用API服务
     *
     * Returns:
     * Response: SSE流式响应，包含启动或停止服务的状态
     *
     * Raises:
     * ValueError: 当应用未发布、工作流不存在或GPU配额不足时抛出
     * 启用或禁用应用的API服务，返回SSE流式响应
     * @param appId 应用ID
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsEnableApi(
        appId: string,
        requestBody: {
            /**
             * 是否启用API服务
             */
            enable_api: boolean;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/enable_api',
            path: {
                'app_id': appId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 启用或禁用API调用功能。
     *
     * Args:
     * app_id (str): 应用ID
     * enable_api_call (str, required): 是否启用API调用，值为'0'或'1'
     *
     * Returns:
     * dict: 操作结果消息
     *
     * Raises:
     * ValueError: 当应用未启动或参数错误时抛出
     * 启用或禁用应用的API调用功能
     * @param appId 应用ID
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsEnableApiCall(
        appId: string,
        requestBody: {
            /**
             * API调用开关：0或1
             */
            enable_api_call: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/enable_api_call',
            path: {
                'app_id': appId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 启用或禁用数据回流功能。
     *
     * Args:
     * app_id (str): 应用ID
     * enable_backflow (bool, required): 是否启用回流功能
     *
     * Returns:
     * dict: 更新后的应用信息
     *
     * Raises:
     * ValueError: 当应用不存在或权限不足时抛出
     * 启用或禁用应用的数据回流功能
     * @param appId 应用ID
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsEnableBackflow(
        appId: string,
        requestBody: {
            /**
             * 是否启用回流功能
             */
            enable_backflow: boolean;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/enable_backflow',
            path: {
                'app_id': appId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 导出应用配置。
     *
     * Args:
     * app_id (str): 应用ID
     * format (str, optional): 导出格式，默认为文件下载
     * version (str, optional): 版本，默认为draft
     *
     * Returns:
     * Response: JSON数据或文件下载响应
     *
     * Raises:
     * ValueError: 当应用不存在时抛出
     * 导出应用为文件
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getAppsExport(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apps/{app_id}/export',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 获取引用结果
     * 获取应用的引用结果
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getAppsReferenceResult(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apps/{app_id}/reference-result',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 获取应用版本
     * 获取应用的版本列表
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getAppsVersions(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apps/{app_id}/versions',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 检查版本数量
     * 检查应用的版本数量
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getAppsVersionsCheckCount(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apps/{app_id}/versions/check-count',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 恢复应用版本
     * 恢复到指定的应用版本
     * @param appId 应用ID
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsVersionsRestore(
        appId: string,
        requestBody: {
            /**
             * 版本ID
             */
            version_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/versions/restore',
            path: {
                'app_id': appId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * cancel publish workflow
     * 取消已发布的工作流
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsCancelPublish(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/workflows/cancel_publish',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * Document节点数据解析
     * 解析文档节点
     * @param appId 应用ID
     * @param docId 文档ID
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsDocNodeParse(
        appId: string,
        docId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/workflows/doc_node/{doc_id}/parse',
            path: {
                'app_id': appId,
                'doc_id': docId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查询Document节点数据解析状态
     * 获取文档解析状态
     * @param appId 应用ID
     * @param docId 文档ID
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsDocNodeParseStatus(
        appId: string,
        docId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/workflows/doc_node/{doc_id}/parse/status',
            path: {
                'app_id': appId,
                'doc_id': docId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 获取草稿工作流。
     *
     * Args:
     * app_id (str): 应用ID
     *
     * Returns:
     * dict: 草稿工作流信息
     *
     * Raises:
     * DraftWorkflowNotExist: 当草稿工作流不存在时抛出
     * 获取应用的草稿工作流
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getAppsWorkflowsDraft(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apps/{app_id}/workflows/draft',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 同步草稿工作流。
     *
     * Args:
     * app_id (str): 应用ID
     * graph (dict, required): 工作流图配置
     * hash (str, optional): 工作流哈希值
     *
     * Returns:
     * dict: 同步结果
     *
     * Raises:
     * DraftWorkflowNotSync: 当工作流不同步时抛出
     * 同步草稿工作流的配置
     * @param appId 应用ID
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsDraft(
        appId: string,
        requestBody: {
            /**
             * 工作流图配置
             */
            graph: Record<string, any>;
            /**
             * 工作流哈希值
             */
            hash?: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/workflows/draft',
            path: {
                'app_id': appId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 从文件导入工作流到草稿。
     *
     * Args:
     * app_id (str): 应用ID
     * file (FileStorage, required): 上传的工作流配置文件
     *
     * Returns:
     * dict: 导入操作结果
     *
     * Raises:
     * ValueError: 当文件格式错误或应用不存在时抛出
     * 从文件导入草稿工作流
     * @param appId 应用ID
     * @param formData
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsDraftImport(
        appId: string,
        formData?: {
            /**
             * 工作流文件
             */
            file: Blob;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/workflows/draft/import',
            path: {
                'app_id': appId,
            },
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 运行单节点调试(流式输出)
     * 运行指定节点的流式响应
     * @param appId 应用ID
     * @param nodeId 节点ID
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsDraftNodesRunStream(
        appId: string,
        nodeId: string,
        requestBody: {
            /**
             * 输入内容列表
             */
            inputs: Array<string>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/workflows/draft/nodes/{node_id}/run/stream',
            path: {
                'app_id': appId,
                'node_id': nodeId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 重置调试会话
     * 重置草稿工作流的会话
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsDraftResetSession(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/workflows/draft/reset_session',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 运行草稿调试
     * 运行草稿工作流进行预览
     * @param appId 应用ID
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsDraftRun(
        appId: string,
        requestBody: {
            /**
             * 文件列表
             */
            files?: Array<string>;
            /**
             * 输入内容列表
             */
            inputs: Array<string>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/workflows/draft/run',
            path: {
                'app_id': appId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 开始草稿调试
     * 开始草稿调试，返回SSE流式响应
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsDraftStart(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/workflows/draft/start',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查询草稿调试的状态
     * 查询草稿调试的状态
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getAppsWorkflowsDraftStatus(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apps/{app_id}/workflows/draft/status',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 结束草稿调试
     * 停止草稿调试
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsDraftStop(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/workflows/draft/stop',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * Get published workflow
     * 获取已发布的工作流
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getAppsWorkflowsPublish(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apps/{app_id}/workflows/publish',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * Publish workflow
     * 发布草稿工作流为正式版本
     * @param appId 应用ID
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsPublish(
        appId: string,
        requestBody: {
            /**
             * 版本描述
             */
            description: string;
            /**
             * 版本号
             */
            version: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/workflows/publish',
            path: {
                'app_id': appId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取调试详情信息。
     *
     * Args:
     * app_id (str): 应用ID
     * mode (str, optional): 模式，默认为draft
     * conversation_type (str, optional): 对话类型，"single"表示单轮对话，"multi"表示多轮对话，默认为"single"
     *
     * Returns:
     * dict: 调试详情数据
     *
     * Raises:
     * Exception: 当获取数据失败时抛出
     * 获取应用的调试详情
     * @param appId 应用ID
     * @param mode 工作流模式：draft（草稿）或 publish（发布）
     * @returns any 成功
     * @throws ApiError
     */
    public static getAppsWorkflowsDebugDetail(
        appId: string,
        mode: 'draft' | 'publish',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apps/{app_id}/workflows/{mode}/debug-detail',
            path: {
                'app_id': appId,
                'mode': mode,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 删除历史逐步调试信息。
     *
     * Args:
     * app_id (str): 应用ID
     * mode (str, optional): 模式，默认为draft
     *
     * Returns:
     * dict: 删除操作结果
     *
     * Raises:
     * Exception: 当删除失败时抛出
     * 删除指定的调试历史记录
     * @param appId 应用ID
     * @param mode 工作流模式：draft（草稿）或 publish（发布）
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static deleteAppsWorkflowsDebugDetailHistory(
        appId: string,
        mode: 'draft' | 'publish',
        requestBody: {
            /**
             * 历史记录ID
             */
            history_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/apps/{app_id}/workflows/{mode}/debug-detail/history',
            path: {
                'app_id': appId,
                'mode': mode,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 获取历史逐步调试信息。
     *
     * Args:
     * app_id (str): 应用ID
     * mode (str, optional): 模式，默认为draft
     * limit (int, optional): 限制返回的turn_number组数量
     *
     * Returns:
     * dict: 历史调试信息
     *
     * Raises:
     * Exception: 当获取历史数据失败时抛出
     * 获取调试历史记录
     * @param appId 应用ID
     * @param mode 工作流模式：draft（草稿）或 publish（发布）
     * @returns any 成功
     * @throws ApiError
     */
    public static getAppsWorkflowsDebugDetailHistory(
        appId: string,
        mode: 'draft' | 'publish',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apps/{app_id}/workflows/{mode}/debug-detail/history',
            path: {
                'app_id': appId,
                'mode': mode,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 实时SSE推送逐步调试信息。
     *
     * Args:
     * app_id (str): 应用ID
     * mode (str, optional): 模式，默认为draft
     * conversation_type (str, optional): 对话类型，"single"表示单轮对话，"multi"表示多轮对话，默认为"single"
     *
     * Returns:
     * Response: SSE流式响应
     *
     * Raises:
     * Exception: 当流式推送失败时抛出
     * 获取调试详情的SSE流式响应
     * @param appId 应用ID
     * @param mode 工作流模式：draft（草稿）或 publish（发布）
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static getAppsWorkflowsDebugDetailStream(
        appId: string,
        mode: 'draft' | 'publish',
        requestBody: {
            /**
             * 文件列表
             */
            files?: Array<string>;
            /**
             * 输入内容列表
             */
            inputs: Array<string>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apps/{app_id}/workflows/{mode}/debug-detail/stream',
            path: {
                'app_id': appId,
                'mode': mode,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取SSE流连接状态。
     *
     * Args:
     * app_id (str): 应用ID
     * mode (str, optional): 模式，默认为draft
     *
     * Returns:
     * dict: 连接状态信息
     *
     * Raises:
     * Exception: 当获取状态失败时抛出
     * 获取调试流的运行状态
     * @param appId 应用ID
     * @param mode 工作流模式：draft（草稿）或 publish（发布）
     * @returns any 成功
     * @throws ApiError
     */
    public static getAppsWorkflowsDebugDetailStreamStatus(
        appId: string,
        mode: 'draft' | 'publish',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apps/{app_id}/workflows/{mode}/debug-detail/stream/status',
            path: {
                'app_id': appId,
                'mode': mode,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 远程停止SSE流。
     *
     * Args:
     * app_id (str): 应用ID
     * mode (str, optional): 模式，默认为draft
     * connection_id (str, optional, in body): 连接ID；提供则精准停止该连接，否则全局停止
     *
     * Returns:
     * dict: 停止操作结果
     *
     * Raises:
     * Exception: 当停止失败时抛出
     * 停止调试的流式响应
     * @param appId 应用ID
     * @param mode 工作流模式：draft（草稿）或 publish（发布）
     * @returns any 成功
     * @throws ApiError
     */
    public static postAppsWorkflowsDebugDetailStreamStop(
        appId: string,
        mode: 'draft' | 'publish',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apps/{app_id}/workflows/{mode}/debug-detail/stream/stop',
            path: {
                'app_id': appId,
                'mode': mode,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取模板列表。
     *
     * Args:
     * page (int, optional): 页码，默认为1
     * limit (int, optional): 每页数量，默认为20
     * search_name (str, optional): 搜索模板名称
     * search_tags (str, optional): 搜索标签
     * qtype (str, optional): 查询类型，默认为mine
     *
     * Returns:
     * dict: 包含模板列表的分页数据
     *
     * Raises:
     * ValueError: 当参数验证失败时抛出
     * 获取应用模板列表
     * @param page 页码，从 1 开始
     * @param limit 每页数量
     * @param searchName 搜索应用名称
     * @param searchTags 搜索标签名称
     * @param qtype 查询类型：mine/group/builtin/already
     * @param isPublished 是否已发布
     * @returns any 成功
     * @throws ApiError
     */
    public static getApptemplate(
        page: number = 1,
        limit: number = 20,
        searchName?: string,
        searchTags?: string,
        qtype: 'mine' | 'group' | 'builtin' | 'already' = 'mine',
        isPublished?: boolean,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apptemplate',
            query: {
                'page': page,
                'limit': limit,
                'search_name': searchName,
                'search_tags': searchTags,
                'qtype': qtype,
                'is_published': isPublished,
            },
            errors: {
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 将模板转换为应用。
     *
     * Args:
     * id (str, required): 模板ID
     * name (str, optional): 应用名称
     * description (str, optional): 应用描述
     * icon (str, optional): 应用图标
     * icon_background (str, optional): 图标背景色
     * categories (list, optional): 应用分类
     *
     * Returns:
     * App: 新创建的应用实例
     *
     * Raises:
     * ValueError: 当模板不存在或名称重复时抛出
     * 将模板转换为应用
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postApptemplateToApps(
        requestBody: {
            /**
             * 模板ID
             */
            app_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apptemplate/to/apps',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除模板。
     *
     * Args:
     * app_id (str): 模板ID
     *
     * Returns:
     * dict: 删除操作结果
     *
     * Raises:
     * ValueError: 当模板不存在或权限不足时抛出
     * 删除指定的模板
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static deleteApptemplate(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/apptemplate/{app_id}',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 获取模板详情。
     *
     * Args:
     * app_id (str): 模板ID
     *
     * Returns:
     * dict: 模板详细信息
     *
     * Raises:
     * ValueError: 当模板不存在时抛出
     * 根据模板ID获取模板详细信息
     * @param appId 应用ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getApptemplate1(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apptemplate/{app_id}',
            path: {
                'app_id': appId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 更新模板信息。
     *
     * Args:
     * app_id (str): 模板ID
     * name (str, optional): 模板名称
     * description (str, optional): 模板描述
     * icon (str, optional): 模板图标
     * icon_background (str, optional): 图标背景色
     * categories (list, optional): 模板分类
     *
     * Returns:
     * dict: 更新后的模板信息
     *
     * Raises:
     * ValueError: 当模板不存在或名称重复时抛出
     * 更新模板的基本信息
     * @param appId 应用ID
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static putApptemplate(
        appId: string,
        requestBody: {
            /**
             * 应用分类
             */
            categories?: Array<string>;
            /**
             * 应用描述
             */
            description?: string;
            /**
             * 应用图标
             */
            icon?: string;
            /**
             * 图标背景色
             */
            icon_background?: string;
            /**
             * 应用名称
             */
            name: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/apptemplate/{app_id}',
            path: {
                'app_id': appId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 查询产商
     * 根据产商类型查询产商列表
     * @param type 产商类型，必填
     * @returns any 成功
     * @throws ApiError
     */
    public static getBrands(
        type: 'llm' | 'embedding' | 'reranker',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/brands',
            query: {
                'type': type,
            },
            errors: {
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建产商标签
     * 创建一个新的产商标签，只有超级用户可以执行此操作
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postBrandsCreate(
        requestBody: {
            /**
             * 产商名称
             */
            name: string;
            /**
             * 产商类型
             */
            type: 'llm' | 'embedding' | 'reranker';
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/brands/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除产商
     * 删除指定的产商标签
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postBrandsDelete(
        requestBody: {
            /**
             * 产商名称
             */
            name: string;
            /**
             * 产商类型
             */
            type: 'llm' | 'embedding' | 'reranker';
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/brands/delete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取指定数据集的详细信息。
     *
     * Args:
     * 通过URL参数传递：
     * data_set_id (str): 数据集ID。
     *
     * Returns:
     * dict: 数据集的详细信息。
     *
     * Raises:
     * ValueError: 当数据集不存在时抛出异常。
     * 获取指定数据集的详细信息
     * @param dataSetId 数据集ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getData(
        dataSetId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/data',
            query: {
                'data_set_id': dataSetId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 创建新数据集。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * name (str): 数据集名称。
     * description (str, optional): 数据集描述。
     * data_type (str): 数据类型（doc或pic）。
     * upload_type (str): 上传类型（local或url）。
     * file_paths (list, optional): 本地文件路径列表。
     * file_urls (list, optional): 文件URL列表。
     * data_format (str, optional): 数据格式。
     * from_type (str, optional): 来源类型。
     *
     * Returns:
     * dict: 创建的数据集信息。
     *
     * Raises:
     * ValueError: 当必要参数缺失或文件上传失败时抛出异常。
     * 创建新的数据集，支持本地上传或URL上传
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataCreateDateSet(
        requestBody: {
            /**
             * 数据格式
             */
            data_format?: string;
            /**
             * 数据类型（doc或pic）
             */
            data_type: 'doc' | 'pic';
            /**
             * 数据集描述
             */
            description?: string;
            /**
             * 本地文件路径列表（upload_type为local时必填）
             */
            file_paths?: Array<string>;
            /**
             * 文件URL列表（upload_type为url时必填）
             */
            file_urls?: Array<string>;
            /**
             * 来源类型
             */
            from_type?: string;
            /**
             * 数据集名称
             */
            name: string;
            /**
             * 上传类型（local或url）
             */
            upload_type: 'local' | 'url';
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/create_date_set',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除指定的数据集。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_id (str): 数据集ID。
     *
     * Returns:
     * dict: 删除结果信息。
     *
     * Raises:
     * ValueError: 当数据集ID为空或数据集正在被使用时抛出异常。
     * 删除指定的数据集
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataDelete(
        requestBody: {
            /**
             * 数据集ID
             */
            data_set_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/delete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取JSON文件内容并返回给前端。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_file_id (str): 数据集文件ID。
     * start (int, optional): 起始行号。
     * end (int, optional): 结束行号。
     *
     * Returns:
     * dict: 包含文件内容的响应。
     *
     * Raises:
     * ValueError: 当数据集文件ID为空时抛出异常。
     * 获取JSON文件内容并返回给前端，支持分页读取
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataFile(
        requestBody: {
            /**
             * 数据集文件ID
             */
            data_set_file_id: string;
            /**
             * 结束行号
             */
            end?: number;
            /**
             * 起始行号
             */
            start?: number;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/file',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除指定的数据集文件。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_file_ids (list): 数据集文件ID列表。
     *
     * Returns:
     * dict: 删除结果信息。
     *
     * Raises:
     * ValueError: 当文件ID列表为空或数据集版本正在被使用时抛出异常。
     * 删除指定的数据集文件
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataFileDelete(
        requestBody: {
            /**
             * 数据集文件ID列表
             */
            data_set_file_ids: Array<number>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/file/delete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取数据集版本下的文件分页列表。
     *
     * Args:
     * 通过URL参数传递：
     * page (int, optional): 页码，默认为1。
     * page_size (int, optional): 每页大小，默认为20。
     * data_set_version_id (str): 数据集版本ID。
     *
     * Returns:
     * dict: 分页结果，包含数据集文件列表和分页信息。
     * 获取指定数据集版本下的文件分页列表
     * @param page 页码，从1开始
     * @param pageSize 每页大小
     * @param dataSetVersionId 数据集版本ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getDataFileList(
        page: number = 1,
        pageSize: number = 20,
        dataSetVersionId?: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/data/file/list',
            query: {
                'page': page,
                'page_size': pageSize,
                'data_set_version_id': dataSetVersionId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 修改数据集文件内容。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_file_id (str): 数据集文件ID。
     * content (str): 新的文件内容。
     * data_set_file_name (str, optional): 新的文件名。
     * start (int, optional): 起始行号。
     * end (int, optional): 结束行号。
     *
     * Returns:
     * dict: 更新结果信息，包含新的总行数。
     *
     * Raises:
     * ValueError: 当必要参数缺失时抛出异常。
     * 修改数据集文件内容
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataFileUpdate(
        requestBody: {
            /**
             * 新的文件内容
             */
            content: string;
            /**
             * 数据集文件ID
             */
            data_set_file_id: string;
            /**
             * 新的文件名
             */
            data_set_file_name?: string;
            /**
             * 结束行号
             */
            end?: number;
            /**
             * 起始行号
             */
            start?: number;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/file/update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取数据集分页列表。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * page (int, optional): 页码，默认为1。
     * page_size (int, optional): 每页大小，默认为20。
     * name (str, optional): 数据集名称。
     * data_type (list, optional): 数据类型列表。
     * qtype (str, optional): 查询类型，默认为"already"。
     * search_tags (list, optional): 搜索标签列表。
     * search_name (str, optional): 搜索名称。
     * user_id (list, optional): 用户ID列表。
     *
     * Returns:
     * dict: 分页结果，包含数据集列表和分页信息。
     * 获取数据集分页列表，支持按名称、数据类型、标签等条件筛选
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataList(
        requestBody: {
            /**
             * 数据类型列表
             */
            data_type?: Array<'doc' | 'pic'>;
            /**
             * 数据集名称
             */
            name?: string;
            /**
             * 页码，从1开始
             */
            page?: number;
            /**
             * 每页大小
             */
            page_size?: number;
            /**
             * 查询类型
             */
            qtype?: string;
            /**
             * 搜索名称
             */
            search_name?: string;
            /**
             * 搜索标签列表
             */
            search_tags?: Array<string>;
            /**
             * 用户ID列表
             */
            user_id?: Array<string>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/list',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 取消指定的数据处理任务。
     *
     * Args:
     * task_id (str): 任务ID。
     *
     * Returns:
     * dict: 取消结果信息。
     *
     * Raises:
     * Exception: 当任务不存在或无法取消时抛出异常。
     * 取消指定的数据处理任务
     * @param taskId 任务ID
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataProcessingTaskCancel(
        taskId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/processing/task/{task_id}/cancel',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 获取指定数据处理任务的进度信息。
     *
     * Args:
     * task_id (str): 任务ID。
     *
     * Returns:
     * dict: 任务进度信息。
     *
     * Raises:
     * Exception: 当任务不存在时抛出异常。
     * 获取指定数据处理任务的进度信息
     * @param taskId 任务ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getDataProcessingTaskProgress(
        taskId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/data/processing/task/{task_id}/progress',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 通过SSE实时推送任务进度。
     *
     * Args:
     * task_id (str): 任务ID。
     *
     * Returns:
     * Response: SSE流式响应，实时推送任务进度。
     *
     * Raises:
     * Exception: 当任务不存在时抛出异常。
     * 通过SSE实时推送任务进度
     * @param taskId 任务ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getDataProcessingTaskStream(
        taskId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/data/processing/task/{task_id}/stream',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 获取所有数据处理任务列表。
     *
     * Returns:
     * dict: 包含所有任务列表的响应信息。
     * 获取所有数据处理任务的列表
     * @returns any 成功
     * @throws ApiError
     */
    public static getDataProcessingTasks(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/data/processing/tasks',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 发布应用回流数据。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * app_msg (dict): 应用消息数据。
     * node_msgs (list): 节点消息数据列表。
     *
     * Returns:
     * tuple: (响应数据, HTTP状态码)
     *
     * Raises:
     * ValueError: 当缺少必要参数时抛出异常。
     * 处理应用发布时的数据回流
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataRefluxAppPublish(
        requestBody: {
            /**
             * 应用消息数据
             */
            app_msg: Record<string, any>;
            /**
             * 节点消息数据列表
             */
            node_msgs: Array<Record<string, any>>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/reflux/app/publish',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建回流数据。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data (dict): 回流数据。
     *
     * Returns:
     * tuple: (响应数据, HTTP状态码)
     * 创建回流数据
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataRefluxCreate(
        requestBody: {
            /**
             * 回流数据
             */
            data: Record<string, any>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/reflux/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除回流数据。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * reflux_data_ids (list): 要删除的回流数据ID列表。
     *
     * Returns:
     * tuple: (响应数据, HTTP状态码)
     *
     * Raises:
     * ValueError: 当回流数据ID列表为空时抛出异常。
     * 删除指定的回流数据
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataRefluxDelete(
        requestBody: {
            /**
             * 要删除的回流数据ID列表
             */
            reflux_data_ids: Array<number>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/reflux/delete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取回流数据详情。
     *
     * Args:
     * 通过查询参数传递：
     * reflux_data_id (str): 回流数据ID。
     *
     * Returns:
     * dict: 回流数据详情，包含内容和ID。
     *
     * Raises:
     * ValueError: 当回流数据ID为空时抛出异常。
     * 获取回流数据的详细信息
     * @param refluxDataId 回流数据ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getDataRefluxDetail(
        refluxDataId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/data/reflux/detail',
            query: {
                'reflux_data_id': refluxDataId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 更新回流数据反馈。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data (dict): 反馈数据。
     *
     * Returns:
     * tuple: (响应数据, HTTP状态码)
     * 更新回流数据的反馈信息
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataRefluxFeedbackUpdate(
        requestBody: {
            /**
             * 反馈数据
             */
            data: Record<string, any>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/reflux/feedback/update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取回流数据分页列表。
     *
     * Args:
     * 通过查询参数传递：
     * page (int, optional): 页码，默认为1。
     * page_size (int, optional): 每页大小，默认为20。
     * data_set_version_id (str, optional): 数据集版本ID。
     *
     * Returns:
     * dict: 分页结果，包含回流数据列表和分页信息。
     * 获取回流数据分页列表
     * @param page 页码，从1开始
     * @param pageSize 每页大小
     * @param dataSetVersionId 数据集版本ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getDataRefluxList(
        page: number = 1,
        pageSize: number = 20,
        dataSetVersionId?: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/data/reflux/list',
            query: {
                'page': page,
                'page_size': pageSize,
                'data_set_version_id': dataSetVersionId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 修改回流数据。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * reflux_data_id (str): 回流数据ID。
     * content (str): 更新内容。
     *
     * Returns:
     * tuple: (响应数据, HTTP状态码)
     *
     * Raises:
     * ValueError: 当回流数据ID或内容为空时抛出异常。
     * 修改回流数据内容
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataRefluxUpdate(
        requestBody: {
            /**
             * 更新内容
             */
            content: string;
            /**
             * 回流数据ID
             */
            reflux_data_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/reflux/update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 导出数据集版本。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_version_ids (list): 数据集版本ID列表。
     *
     * Returns:
     * Response: 文件下载响应。
     *
     * Raises:
     * ValueError: 当数据集版本ID列表为空时抛出异常。
     * Exception: 当导出失败时抛出异常。
     * 导出数据集版本，返回压缩文件
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataRefluxVersionExport(
        requestBody: {
            /**
             * 数据集版本ID列表
             */
            data_set_version_ids: Array<string>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/reflux/version/export',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 导出数据集版本（用于微调）。
     *
     * Args:
     * 通过查询参数传递：
     * filename (str): 数据集文件名。
     *
     * Returns:
     * Response: 文件下载响应。
     *
     * Raises:
     * ValueError: 当文件名为空或文件不存在时抛出异常。
     * Exception: 当导出失败时抛出异常。
     * 导出数据集版本文件，用于微调
     * @param filename 数据集文件名
     * @returns any 成功
     * @throws ApiError
     */
    public static getDataRefluxVersionExportFt(
        filename: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/data/reflux/version/export/ft',
            query: {
                'filename': filename,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 发布数据集版本回流数据。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_version_id (str): 数据集版本ID。
     *
     * Returns:
     * dict: 数据集版本信息。
     *
     * Raises:
     * ValueError: 当数据集版本ID为空时抛出异常。
     * 发布数据集版本回流数据
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataRefluxVersionPublish(
        requestBody: {
            /**
             * 数据集版本ID
             */
            data_set_version_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/reflux/version/publish',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取数据集的标签版本列表。
     *
     * Args:
     * 通过URL参数传递：
     * data_set_id (str): 数据集ID。
     *
     * Returns:
     * dict: 包含数据集标签列表的响应。
     * 获取数据集的标签版本列表
     * @param dataSetId 数据集ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getDataTagList(
        dataSetId?: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/data/tag/list',
            query: {
                'data_set_id': dataSetId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 上传数据集文件。
     *
     * Args:
     * 通过multipart/form-data传递参数：
     * file: 上传的文件。
     * file_type (str): 文件类型（pic或doc）。
     *
     * Returns:
     * dict: 上传结果信息，包含文件路径。
     *
     * Raises:
     * ValueError: 当文件类型不支持、文件大小超限或压缩包内容不符合要求时抛出异常。
     * 上传数据集文件，支持图片和文档类型，支持压缩包
     * @param formData
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataUpload(
        formData?: {
            /**
             * 上传的文件
             */
            file: Blob;
            /**
             * 文件类型（pic或doc）
             */
            file_type: 'doc' | 'pic';
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/upload',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取指定数据集版本的详细信息。
     *
     * Args:
     * 通过URL参数传递：
     * data_set_version_id (str): 数据集版本ID。
     *
     * Returns:
     * dict: 数据集版本的详细信息。
     *
     * Raises:
     * ValueError: 当数据集版本不存在时抛出异常。
     * 获取指定数据集版本的详细信息
     * @param dataSetVersionId 数据集版本ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getDataVersion(
        dataSetVersionId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/data/version',
            query: {
                'data_set_version_id': dataSetVersionId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 向数据集版本添加新文件。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_version_id (str): 数据集版本ID。
     * name (str, optional): 版本名称。
     * version (str, optional): 版本号。
     * file_paths (list, optional): 本地文件路径列表。
     * file_urls (list, optional): 文件URL列表。
     *
     * Returns:
     * dict: 添加结果信息。
     *
     * Raises:
     * ValueError: 当数据集版本ID为空时抛出异常。
     * 向数据集版本添加新文件
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataVersionAddFile(
        requestBody: {
            /**
             * 数据集版本ID
             */
            data_set_version_id: string;
            /**
             * 本地文件路径列表
             */
            file_paths?: Array<string>;
            /**
             * 文件URL列表
             */
            file_urls?: Array<string>;
            /**
             * 版本名称
             */
            name?: string;
            /**
             * 版本号
             */
            version?: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/version/add/file',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 对数据集版本进行数据清洗或增强处理。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_version_id (str): 数据集版本ID。
     * data_set_script_id (str): 数据集脚本ID。
     * script_agent (str, optional): 脚本代理类型，默认为"script"。
     * script_type (str, optional): 脚本类型。
     * data_set_version_name (str, optional): 数据集版本名称。
     *
     * Returns:
     * dict: 处理后的数据集版本信息。
     *
     * Raises:
     * ValueError: 当必要参数缺失或数据集版本不存在时抛出异常。
     * Exception: 当处理过程中发生错误时抛出异常。
     * 对数据集版本进行数据清洗或增强处理
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataVersionCleanOrAugment(
        requestBody: {
            /**
             * 数据集脚本ID
             */
            data_set_script_id: string;
            /**
             * 数据集版本ID
             */
            data_set_version_id: string;
            /**
             * 数据集版本名称
             */
            data_set_version_name?: string;
            /**
             * 脚本代理类型
             */
            script_agent?: 'script';
            /**
             * 脚本类型
             */
            script_type?: '数据过滤' | '数据增强' | '数据去噪' | '数据标注' | '智能处理';
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/version/clean_or_augment',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 异步启动数据集版本的数据清洗或增强处理。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_version_id (str): 数据集版本ID。
     * data_set_script_id (str): 数据集脚本ID。
     * script_agent (str, optional): 脚本代理类型，默认为"script"。
     * script_type (str, optional): 脚本类型。
     * data_set_version_name (str, optional): 数据集版本名称。
     *
     * Returns:
     * dict: 包含任务ID的响应信息。
     *
     * Raises:
     * ValueError: 当必要参数缺失时抛出异常。
     * Exception: 当任务启动失败时抛出异常。
     * 异步启动数据集版本的数据清洗或增强处理
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataVersionCleanOrAugmentAsync(
        requestBody: {
            /**
             * 数据集脚本ID
             */
            data_set_script_id: string;
            /**
             * 数据集版本ID
             */
            data_set_version_id: string;
            /**
             * 数据集版本名称
             */
            data_set_version_name?: string;
            /**
             * 脚本代理类型
             */
            script_agent?: 'script';
            /**
             * 脚本类型
             */
            script_type?: '数据过滤' | '数据增强' | '数据去噪' | '数据标注' | '智能处理';
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/version/clean_or_augment_async',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 异步启动数据集版本的数据清洗或增强处理（基于数据条数统计）。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_version_id (str): 数据集版本ID。
     * data_set_script_id (str): 数据集脚本ID。
     * script_agent (str, optional): 脚本代理类型，默认为"script"。
     * script_type (str, optional): 脚本类型。
     * data_set_version_name (str, optional): 数据集版本名称。
     *
     * Returns:
     * dict: 包含任务ID的响应信息。
     *
     * Raises:
     * ValueError: 当必要参数缺失时抛出异常。
     * Exception: 当任务启动失败时抛出异常。
     * 异步启动数据集版本的数据清洗或增强处理，并统计数据条数
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataVersionCleanOrAugmentAsyncWithItemCount(
        requestBody: {
            /**
             * 数据集脚本ID
             */
            data_set_script_id: string;
            /**
             * 数据集版本ID
             */
            data_set_version_id: string;
            /**
             * 数据集版本名称
             */
            data_set_version_name?: string;
            /**
             * 脚本代理类型
             */
            script_agent?: 'script';
            /**
             * 脚本类型
             */
            script_type?: '数据过滤' | '数据增强' | '数据去噪' | '数据标注' | '智能处理';
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/version/clean_or_augment_async_with_item_count',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 根据标签创建数据集版本。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_version_id (str): 数据集版本ID。
     * name (str, optional): 新版本名称。
     *
     * Returns:
     * dict: 创建的数据集版本信息。
     *
     * Raises:
     * ValueError: 当数据集版本ID为空时抛出异常。
     * 基于标签版本创建新的分支版本
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataVersionCreateByTag(
        requestBody: {
            /**
             * 数据集版本ID
             */
            data_set_version_id: string;
            /**
             * 新版本名称
             */
            name?: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/version/create_by_tag',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除指定的数据集版本。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_version_id (str): 数据集版本ID。
     *
     * Returns:
     * dict: 删除结果信息，包含剩余版本数量。
     *
     * Raises:
     * ValueError: 当数据集版本ID为空或版本正在被使用时抛出异常。
     * 删除指定的数据集版本
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataVersionDelete(
        requestBody: {
            /**
             * 数据集版本ID
             */
            data_set_version_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/version/delete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 导出一个或多个数据集版本。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_version_ids (list): 数据集版本ID列表。
     *
     * Returns:
     * Response: 压缩文件下载响应。
     *
     * Raises:
     * ValueError: 当数据集版本ID列表为空时抛出异常。
     * 导出一个或多个数据集版本，返回压缩文件
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataVersionExport(
        requestBody: {
            /**
             * 数据集版本ID列表
             */
            data_set_version_ids: Array<string>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/version/export',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 导出数据集版本文件（微调专用）。
     *
     * Args:
     * 通过URL参数传递：
     * filename (str): 文件路径。
     * filefrom (str): 文件来源（upload或return）。
     *
     * Returns:
     * Response: 文件下载响应。
     *
     * Raises:
     * ValueError: 当参数有误或文件不存在时抛出异常。
     * 导出数据集版本文件，用于微调
     * @param filename 文件路径
     * @param filefrom 文件来源（upload或return）
     * @returns any 成功
     * @throws ApiError
     */
    public static getDataVersionExportFt(
        filename: string,
        filefrom: 'upload' | 'return',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/data/version/export/ft',
            query: {
                'filename': filename,
                'filefrom': filefrom,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取数据集版本分页列表。
     *
     * Args:
     * 通过URL参数传递：
     * page (int, optional): 页码，默认为1。
     * page_size (int, optional): 每页大小，默认为20。
     * version_type (str, optional): 版本类型。
     * data_set_id (str): 数据集ID。
     *
     * Returns:
     * dict: 分页结果，包含数据集版本列表和分页信息。
     * 获取指定数据集的版本分页列表
     * @param page 页码，从1开始
     * @param pageSize 每页大小
     * @param versionType 版本类型
     * @param dataSetId 数据集ID
     * @returns any 成功
     * @throws ApiError
     */
    public static getDataVersionList(
        page: number = 1,
        pageSize: number = 20,
        versionType?: 'branch' | 'tag',
        dataSetId?: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/data/version/list',
            query: {
                'page': page,
                'page_size': pageSize,
                'version_type': versionType,
                'data_set_id': dataSetId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 发布数据集版本为标签版本。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_version_id (str): 数据集版本ID。
     *
     * Returns:
     * dict: 发布后的数据集版本信息。
     *
     * Raises:
     * ValueError: 当数据集版本ID为空时抛出异常。
     * 发布数据集版本为标签版本
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataVersionPublish(
        requestBody: {
            /**
             * 数据集版本ID
             */
            data_set_version_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/version/publish',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 测试数据集版本状态变更功能。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * data_set_version_id (str): 数据集版本ID。
     *
     * Returns:
     * dict: 状态变更后的数据集版本信息。
     *
     * Raises:
     * Exception: 当状态变更失败时抛出异常。
     * 测试数据集版本状态变更功能
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postDataVersionTestStatus(
        requestBody: {
            /**
             * 数据集版本ID
             */
            data_set_version_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/data/version/test_status',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建新数据库。
     *
     * 接收数据库名称和注释，验证名称格式，然后创建新的数据库。
     * 要求数据库名称以字母开头，只能包含字母、数字和下划线，且长度不超过20。
     *
     * Returns:
     * dict: 包含创建结果的响应字典
     *
     * Raises:
     * Exception: 当数据库名称格式无效或创建失败时抛出
     * 创建新数据库，要求数据库名称以字母开头，只能包含字母、数字和下划线，且长度不超过20
     * @param requestBody 数据库创建参数
     * @returns any 创建成功
     * @throws ApiError
     */
    public static postDatabase(
        requestBody: {
            /**
             * 数据库注释
             */
            comment: string;
            /**
             * 数据库名称（以字母开头，只能包含字母、数字和下划线，长度不超过20）
             */
            db_name: string;
        },
    ): CancelablePromise<{
        code?: number;
        data?: Record<string, any>;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/database',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 下载数据导入模板。
     *
     * 生成并下载指定表的Excel导入模板文件，包含表的所有列。
     *
     * Args:
     * database_id (int): 数据库ID
     * table_id (int): 表ID
     *
     * Returns:
     * File: Excel格式的导入模板文件
     *
     * Raises:
     * Exception: 当生成模板失败时抛出
     * 生成并下载指定表的Excel导入模板文件，包含表的所有列
     * @param databaseId 数据库ID
     * @param tableId 表ID
     * @returns binary 下载成功
     * @throws ApiError
     */
    public static getDatabaseImport(
        databaseId: number,
        tableId: number,
    ): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/database/import/{database_id}/{table_id}',
            path: {
                'database_id': databaseId,
                'table_id': tableId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 上传并预览导入数据。
     *
     * 上传Excel文件并预览要导入的数据，包括数据验证和格式转换。
     *
     * Args:
     * database_id (int): 数据库ID
     * table_id (int): 表ID
     *
     * Form Data:
     * file: 要上传的Excel文件
     *
     * Returns:
     * dict: 包含预览数据的字典，包括总行数、列定义和数据
     *
     * Raises:
     * ValueError: 当未上传文件时抛出
     * Exception: 当处理文件失败时抛出
     * 上传Excel文件并预览要导入的数据，包括数据验证和格式转换
     * @param databaseId 数据库ID
     * @param tableId 表ID
     * @param formData
     * @returns any 预览成功
     * @throws ApiError
     */
    public static postDatabaseImport(
        databaseId: number,
        tableId: number,
        formData?: {
            /**
             * 要上传的Excel文件
             */
            file: Blob;
        },
    ): CancelablePromise<{
        columns?: Array<{
            comment?: string;
            default?: string | null;
            name: string;
            nullable?: boolean;
            type: string;
        }>;
        data?: Array<Record<string, any>>;
        total_rows?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/database/import/{database_id}/{table_id}',
            path: {
                'database_id': databaseId,
                'table_id': tableId,
            },
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 执行数据导入。
     *
     * 根据预览的数据执行实际的数据导入操作。
     *
     * Args:
     * database_id (int): 数据库ID
     * table_id (int): 表ID
     *
     * Request Body:
     * action (str): 操作类型，只支持"import"
     * data (list): 要导入的数据列表
     *
     * Returns:
     * dict: 包含导入结果的响应字典
     *
     * Raises:
     * Exception: 当导入失败时抛出
     * 根据预览的数据执行实际的数据导入操作
     * @param databaseId 数据库ID
     * @param tableId 表ID
     * @param requestBody 数据导入参数
     * @returns any 导入成功
     * @throws ApiError
     */
    public static putDatabaseImport(
        databaseId: number,
        tableId: number,
        requestBody: {
            /**
             * 操作类型：preview（预览）/import（导入）
             */
            action: 'preview' | 'import';
            /**
             * 要导入的数据列表（当action为import时必填）
             */
            data?: Array<Record<string, any>>;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/database/import/{database_id}/{table_id}',
            path: {
                'database_id': databaseId,
                'table_id': tableId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取数据库列表（分页）。
     *
     * 分页获取用户可访问的数据库列表，支持按数据库名称筛选、
     * 按查询类型筛选和按用户ID筛选。
     *
     * Request Body:
     * page (int): 页码，默认为1
     * limit (int): 每页数量，默认为10
     * db_name (str): 数据库名称筛选，默认为空
     * qtype (str): 查询类型，可选值：mine/group/builtin/already，默认为already
     * user_id (list): 用户ID列表筛选，默认为空列表
     *
     * Returns:
     * dict: 分页的数据库信息列表
     * 分页获取用户可访问的数据库列表，支持按数据库名称、查询类型、用户ID等条件筛选
     * @param requestBody 查询参数
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postDatabaseListPage(
        requestBody?: {
            /**
             * 数据库名称筛选
             */
            db_name?: string;
            /**
             * 每页数量
             */
            limit?: number;
            /**
             * 页码
             */
            page?: number;
            /**
             * 查询类型：mine（我的）/group（组内）/builtin（内置）/already（已访问）
             */
            qtype?: 'mine' | 'group' | 'builtin' | 'already';
            /**
             * 用户ID列表筛选
             */
            user_id?: Array<string>;
        },
    ): CancelablePromise<{
        data?: Array<{
            comment?: string;
            created_at?: string;
            created_by?: string;
            created_by_account?: {
                id?: string;
                name?: string;
            };
            database_name?: string;
            id?: number;
            name?: string;
            table_count?: number;
            tenant_id?: string;
            type?: string;
            updated_at?: string;
            url?: string | null;
            user_name?: string;
        }>;
        has_more?: boolean;
        limit?: number;
        page?: number;
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/database/list/page',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除数据库。
     *
     * 删除指定的数据库，需要管理员权限。
     *
     * Args:
     * database_id (int): 要删除的数据库ID
     *
     * Returns:
     * dict: 包含删除结果的响应字典
     * 删除指定的数据库，需要管理员权限
     * @param databaseId 数据库ID
     * @returns any 删除成功
     * @throws ApiError
     */
    public static deleteDatabase(
        databaseId: number,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/database/{database_id}',
            path: {
                'database_id': databaseId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 更新数据库信息。
     *
     * 更新指定数据库的名称和注释信息。
     *
     * Args:
     * database_id (int): 数据库ID
     *
     * Request Body:
     * db_name (str): 新的数据库名称
     * comment (str): 新的数据库注释
     *
     * Returns:
     * dict: 包含更新结果的响应字典
     *
     * Raises:
     * Exception: 当更新失败时抛出
     * 更新指定数据库的名称和注释信息
     * @param databaseId 数据库ID
     * @param requestBody 数据库更新参数
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putDatabase(
        databaseId: number,
        requestBody: {
            /**
             * 新的数据库注释
             */
            comment: string;
            /**
             * 新的数据库名称
             */
            db_name: string;
        },
    ): CancelablePromise<{
        code?: number;
        data?: Record<string, any>;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/database/{database_id}',
            path: {
                'database_id': databaseId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建新表。
     *
     * 在指定数据库中创建新表，包括表名、注释和列定义。
     * 需要写入权限。
     *
     * Args:
     * database_id (int): 数据库ID
     *
     * Request Body:
     * table_name (str): 表名
     * comment (str): 表注释
     * columns (list): 列定义列表
     *
     * Returns:
     * dict: 包含创建结果的响应字典
     *
     * Raises:
     * Exception: 当列类型为空或创建失败时抛出
     * 在指定数据库中创建新表，包括表名、注释和列定义，需要写入权限
     * @param databaseId 数据库ID
     * @param requestBody 表创建参数
     * @returns any 创建成功
     * @throws ApiError
     */
    public static postDatabaseTable(
        databaseId: number,
        requestBody: {
            /**
             * 列定义列表
             */
            columns: Array<{
                comment?: string;
                default?: string | null;
                name: string;
                nullable?: boolean;
                type: string;
            }>;
            /**
             * 表注释
             */
            comment: string;
            /**
             * 表名
             */
            table_name: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/database/{database_id}/table',
            path: {
                'database_id': databaseId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取数据库中的表列表。
     *
     * 分页获取指定数据库中的所有表，支持按表名筛选。
     *
     * Args:
     * database_id (int): 数据库ID
     *
     * Query Parameters:
     * page (int): 页码，默认为1
     * limit (int): 每页数量，默认为10
     * table_name (str): 表名筛选，默认为空
     *
     * Returns:
     * dict: 分页的表信息列表
     * 分页获取指定数据库中的所有表，支持按表名筛选
     * @param databaseId 数据库ID
     * @param page 页码
     * @param limit 每页数量
     * @param tableName 表名筛选
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getDatabaseTableList(
        databaseId: number,
        page: number = 1,
        limit: number = 10,
        tableName: string = '',
    ): CancelablePromise<{
        data?: Array<{
            comment?: string;
            created_at?: string;
            created_by?: string;
            created_by_account?: {
                id?: string;
                name?: string;
            };
            id?: number;
            name?: string;
            row_count?: number;
            tenant_id?: string;
            updated_at?: string;
        }>;
        has_more?: boolean;
        limit?: number;
        page?: number;
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/database/{database_id}/table/list',
            path: {
                'database_id': databaseId,
            },
            query: {
                'page': page,
                'limit': limit,
                'table_name': tableName,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除表。
     *
     * 删除指定数据库中的指定表，需要管理员权限。
     *
     * Args:
     * database_id (int): 数据库ID
     * table_id (int): 要删除的表ID
     *
     * Returns:
     * dict: 包含删除结果的响应字典
     * 删除指定数据库中的指定表，需要管理员权限
     * @param databaseId 数据库ID
     * @param tableId 表ID
     * @returns any 删除成功
     * @throws ApiError
     */
    public static deleteDatabaseTable(
        databaseId: number,
        tableId: number,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/database/{database_id}/table/{table_id}',
            path: {
                'database_id': databaseId,
                'table_id': tableId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 根据表ID获取表结构。
     *
     * 获取指定数据库中指定表ID的表结构信息。
     *
     * Args:
     * database_id (int): 数据库ID
     * table_id (int): 表ID
     *
     * Returns:
     * dict: 包含表结构信息的响应字典
     * 获取指定数据库中指定表ID的表结构信息
     * @param databaseId 数据库ID
     * @param tableId 表ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getDatabaseTable(
        databaseId: number,
        tableId: number,
    ): CancelablePromise<{
        code?: number;
        data?: {
            columns?: Array<{
                comment?: string;
                default?: string | null;
                name?: string;
                nullable?: boolean;
                type?: string;
            }>;
            comment?: string;
            table_id?: number;
            table_name?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/database/{database_id}/table/{table_id}',
            path: {
                'database_id': databaseId,
                'table_id': tableId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 编辑表结构。
     *
     * 修改指定表的结构，包括表名、注释和列定义。
     * 需要写入权限。
     *
     * Args:
     * database_id (int): 数据库ID
     * table_id (int): 表ID
     *
     * Request Body:
     * table_name (str): 新的表名
     * comment (str): 新的表注释
     * columns (list): 列定义列表
     *
     * Returns:
     * dict: 包含修改结果的响应字典
     *
     * Raises:
     * Exception: 当列类型为空或修改失败时抛出
     * 修改指定表的结构，包括表名、注释和列定义，需要写入权限
     * @param databaseId 数据库ID
     * @param tableId 表ID
     * @param requestBody 表更新参数
     * @returns any 修改成功
     * @throws ApiError
     */
    public static putDatabaseTable(
        databaseId: number,
        tableId: number,
        requestBody: {
            /**
             * 列定义列表
             */
            columns: Array<{
                comment?: string;
                default?: string | null;
                name: string;
                nullable?: boolean;
                type: string;
            }>;
            /**
             * 表注释
             */
            comment: string;
            /**
             * 表名
             */
            table_name: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/database/{database_id}/table/{table_id}',
            path: {
                'database_id': databaseId,
                'table_id': tableId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除表数据。
     *
     * 删除指定表中的数据记录。
     *
     * Args:
     * database_id (int): 数据库ID
     * table_id (int): 表ID
     *
     * Request Body:
     * data_items (list): 要删除的数据项列表
     * table_name (str): 表名
     *
     * Returns:
     * dict: 包含删除结果的响应字典
     * 删除指定表中的数据记录
     * @param databaseId 数据库ID
     * @param tableId 表ID
     * @param requestBody 表数据删除参数
     * @returns any 删除成功
     * @throws ApiError
     */
    public static deleteDatabaseTableData(
        databaseId: number,
        tableId: number,
        requestBody: {
            /**
             * 要删除的数据项列表
             */
            data_items: Array<Record<string, any>>;
            /**
             * 表名
             */
            table_name?: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/database/{database_id}/table_data/{table_id}',
            path: {
                'database_id': databaseId,
                'table_id': tableId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取表数据（分页）。
     *
     * 分页获取指定表中的数据记录。
     *
     * Args:
     * database_id (int): 数据库ID
     * table_id (int): 表ID
     *
     * Query Parameters:
     * page (int): 页码，默认为1
     * limit (int): 每页数量，默认为10
     *
     * Returns:
     * dict: 分页的表数据
     * 分页获取指定表中的数据记录
     * @param databaseId 数据库ID
     * @param tableId 表ID
     * @param page 页码
     * @param limit 每页数量
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getDatabaseTableData(
        databaseId: number,
        tableId: number,
        page: number = 1,
        limit: number = 10,
    ): CancelablePromise<{
        data?: Array<Record<string, any>>;
        has_more?: boolean;
        limit?: number;
        page?: number;
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/database/{database_id}/table_data/{table_id}',
            path: {
                'database_id': databaseId,
                'table_id': tableId,
            },
            query: {
                'page': page,
                'limit': limit,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 批量更新表数据。
     *
     * 批量执行表数据的增加、更新和删除操作。
     *
     * Args:
     * database_id (int): 数据库ID
     * table_id (int): 表ID
     *
     * Request Body:
     * add_items (list): 要添加的数据项列表
     * update_items (list): 要更新的数据项列表
     * delete_items (list): 要删除的数据项列表
     * table_name (str): 表名
     *
     * Returns:
     * dict: 包含操作结果的响应字典
     * 批量执行表数据的增加、更新和删除操作
     * @param databaseId 数据库ID
     * @param tableId 表ID
     * @param requestBody 表数据更新参数
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putDatabaseTableData(
        databaseId: number,
        tableId: number,
        requestBody: {
            /**
             * 要添加的数据项列表
             */
            add_items?: Array<Record<string, any>>;
            /**
             * 要删除的数据项列表
             */
            delete_items?: Array<Record<string, any>>;
            /**
             * 表名
             */
            table_name?: string;
            /**
             * 要更新的数据项列表
             */
            update_items?: Array<Record<string, any>>;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/database/{database_id}/table_data/{table_id}',
            path: {
                'database_id': databaseId,
                'table_id': tableId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 根据表名获取表结构。
     *
     * 获取指定数据库中指定表名的表结构信息。
     *
     * Args:
     * database_id (int): 数据库ID
     * table_name (str): 表名
     *
     * Returns:
     * dict: 包含表结构信息的响应字典
     * 获取指定数据库中指定表名的表结构信息
     * @param databaseId 数据库ID
     * @param tableName 表名
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getDatabaseTableName(
        databaseId: number,
        tableName: string,
    ): CancelablePromise<{
        code?: number;
        data?: {
            columns?: Array<{
                comment?: string;
                default?: string | null;
                name?: string;
                nullable?: boolean;
                type?: string;
            }>;
            comment?: string;
            table_id?: number;
            table_name?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/database/{database_id}/table_name/{table_name}',
            path: {
                'database_id': databaseId,
                'table_name': tableName,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取文档图片。
     *
     * Args:
     * subpath (str): 图片文件路径
     *
     * Returns:
     * Response: 包含图片内容的响应对象
     * 根据图片路径获取文档图片，不需要登录
     * @param subpath 图片文件路径
     * @returns binary 获取成功
     * @throws ApiError
     */
    public static getDocImage(
        subpath: string,
    ): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/doc/image/{subpath}',
            path: {
                'subpath': subpath,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 删除文档。
     *
     * Returns:
     * bool: 删除成功返回 True
     * 删除指定文档，需要登录和管理员权限
     * @param id 文档ID
     * @returns any 删除成功
     * @throws ApiError
     */
    public static deleteDocManage(
        id: number,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/doc/manage',
            query: {
                'id': id,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取单个文档详情。
     *
     * Returns:
     * dict: 文档详细信息
     * 根据文档ID获取文档的详细信息，需要登录
     * @param id 文档ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getDocManage(
        id: number,
    ): CancelablePromise<{
        code?: number;
        data?: {
            created_at?: string;
            /**
             * 创建者ID
             */
            created_by?: string;
            created_by_account?: {
                avatar?: string;
                id?: string;
                name?: string;
            };
            /**
             * 文档内容（Markdown格式）
             */
            doc_content?: string;
            /**
             * 文档ID
             */
            id?: number;
            /**
             * 文档索引
             */
            index?: string;
            /**
             * 文档状态
             */
            status?: string;
            /**
             * 文档状态标签
             */
            status_label?: string;
            /**
             * 文档标题
             */
            title?: string;
            updated_at?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/doc/manage',
            query: {
                'id': id,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建新文档。
     *
     * Returns:
     * dict: 创建的文档信息
     * 创建新文档，需要登录和管理员权限
     * @param requestBody
     * @returns any 创建成功
     * @throws ApiError
     */
    public static postDocManage(
        requestBody: {
            /**
             * 文档内容（Markdown格式）
             */
            doc_content: string;
            /**
             * 文档索引
             */
            index?: string;
            /**
             * 文档标题
             */
            title: string;
        },
    ): CancelablePromise<{
        code?: number;
        data?: {
            created_at?: string;
            /**
             * 创建者ID
             */
            created_by?: string;
            created_by_account?: {
                avatar?: string;
                id?: string;
                name?: string;
            };
            /**
             * 文档内容（Markdown格式）
             */
            doc_content?: string;
            /**
             * 文档ID
             */
            id?: number;
            /**
             * 文档索引
             */
            index?: string;
            /**
             * 文档状态
             */
            status?: string;
            /**
             * 文档状态标签
             */
            status_label?: string;
            /**
             * 文档标题
             */
            title?: string;
            updated_at?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/doc/manage',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 更新文档。
     *
     * Returns:
     * dict: 更新后的文档信息
     * 更新指定文档的信息，需要登录和管理员权限
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putDocManage(
        requestBody: {
            /**
             * 文档内容（Markdown格式）
             */
            doc_content: string;
            /**
             * 文档ID
             */
            id: number;
            /**
             * 文档索引
             */
            index?: string;
            /**
             * 文档标题
             */
            title: string;
        },
    ): CancelablePromise<{
        code?: number;
        data?: {
            created_at?: string;
            /**
             * 创建者ID
             */
            created_by?: string;
            created_by_account?: {
                avatar?: string;
                id?: string;
                name?: string;
            };
            /**
             * 文档内容（Markdown格式）
             */
            doc_content?: string;
            /**
             * 文档ID
             */
            id?: number;
            /**
             * 文档索引
             */
            index?: string;
            /**
             * 文档状态
             */
            status?: string;
            /**
             * 文档状态标签
             */
            status_label?: string;
            /**
             * 文档标题
             */
            title?: string;
            updated_at?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/doc/manage',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取文档列表。
     *
     * Returns:
     * dict: 包含分页文档列表的响应数据
     * 分页获取文档列表，支持按文档名称搜索，不需要登录
     * @param page 页码，从1开始
     * @param limit 每页数量
     * @param searchName 文档名称搜索关键词
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getDocManageList(
        page: number = 1,
        limit: number = 20,
        searchName?: string,
    ): CancelablePromise<{
        /**
         * 文档列表
         */
        data?: Array<{
            created_at?: string;
            /**
             * 创建者ID
             */
            created_by?: string;
            created_by_account?: {
                avatar?: string;
                id?: string;
                name?: string;
            };
            /**
             * 文档内容（Markdown格式）
             */
            doc_content?: string;
            /**
             * 文档ID
             */
            id?: number;
            /**
             * 文档索引
             */
            index?: string;
            /**
             * 文档状态
             */
            status?: string;
            /**
             * 文档状态标签
             */
            status_label?: string;
            /**
             * 文档标题
             */
            title?: string;
            updated_at?: string;
        }>;
        /**
         * 是否有更多数据
         */
        has_more?: boolean;
        /**
         * 每页数量
         */
        limit?: number;
        /**
         * 当前页码
         */
        page?: number;
        /**
         * 总记录数
         */
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/doc/manage/list',
            query: {
                'page': page,
                'limit': limit,
                'search_name': searchName,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
            },
        });
    }
    /**
     * 发布文档。
     *
     * Returns:
     * bool: 发布成功返回 True
     * 发布指定文档，使其对外可见，需要登录
     * @param id 文档ID
     * @returns any 发布成功
     * @throws ApiError
     */
    public static getDocManagePublish(
        id: number,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/doc/manage/publish',
            query: {
                'id': id,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 下架文档。
     *
     * Returns:
     * bool: 下架成功返回 True
     * 下架指定文档，使其不再对外可见，需要登录
     * @param id 文档ID
     * @returns any 下架成功
     * @throws ApiError
     */
    public static getDocManageUnpublish(
        id: number,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/doc/manage/unpublish',
            query: {
                'id': id,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 上传文档图片。
     *
     * Returns:
     * tuple: (响应数据, 状态码) 包含图片URL的响应
     * 上传文档中使用的图片文件，需要登录
     * @param formData
     * @returns any 上传成功
     * @throws ApiError
     */
    public static postDocManageUploadImage(
        formData?: {
            /**
             * 要上传的图片文件
             */
            file: Blob;
            /**
             * 文件名
             */
            file_name: string;
        },
    ): CancelablePromise<{
        /**
         * 图片访问URL
         */
        url?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/doc/manage/upload_image',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取文档视图。
     *
     * Args:
     * subpath (str, optional): 子路径，用于访问具体的文档或资源
     *
     * Returns:
     * Response: HTML 页面或文档内容的响应对象
     * 访问文档的Web视图，支持Markdown文档渲染，不需要登录
     * @param subpath 文档视图子路径，用于访问具体的文档或资源
     * @returns string 获取成功
     * @throws ApiError
     */
    public static getDocView(
        subpath: string,
    ): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/doc/view',
            path: {
                'subpath': subpath,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                404: `资源不存在`,
                500: `服务器错误`,
            },
        });
    }
    /**
     * 获取文档视图。
     *
     * Args:
     * subpath (str, optional): 子路径，用于访问具体的文档或资源
     *
     * Returns:
     * Response: HTML 页面或文档内容的响应对象
     * 访问文档的Web视图，支持Markdown文档渲染，不需要登录
     * @param subpath 文档视图子路径，用于访问具体的文档或资源
     * @returns string 获取成功
     * @throws ApiError
     */
    public static getDocView1(
        subpath: string,
    ): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/doc/view/{subpath}',
            path: {
                'subpath': subpath,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                404: `资源不存在`,
                500: `服务器错误`,
            },
        });
    }
    /**
     * 上传本地文件供大模型使用。
     *
     * 此端点允许在不需要身份验证的情况下上传文件，
     * 因为访客也可以访问。上传的文件会保存到工作流目录中，
     * 并使用随机生成的文件名。
     *
     * Args:
     * None (使用Flask请求解析器从表单数据获取文件)
     *
     * Returns:
     * dict: 包含已上传文件路径的字典。
     * 示例: {"file_path": "/path/to/uploaded/file.txt"}
     *
     * Raises:
     * werkzeug.exceptions.BadRequest: 当请求中未提供文件时抛出。
     * OSError: 当创建存储目录或保存文件时出现问题时抛出。
     * 上传本地文件供大模型使用。此端点允许在不需要身份验证的情况下上传文件，因为访客也可以访问。上传的文件会保存到工作流目录中，并使用随机生成的文件名
     * @param formData
     * @returns any 上传成功
     * @throws ApiError
     */
    public static postFilesUpload(
        formData?: {
            /**
             * 要上传的文件，文件会保存到工作流目录中，并使用随机生成的文件名
             */
            file: Blob;
        },
    ): CancelablePromise<{
        /**
         * 上传文件的保存路径
         */
        file_path?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/files/upload',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                400: `参数错误`,
                401: `未授权`,
            },
        });
    }
    /**
     * 创建微调任务。
     *
     * 接收微调任务配置信息，创建新的微调任务。
     *
     * Args:
     * base (dict): 基础配置信息
     * name (str): 任务名称
     * base_model (str): 基础模型uuid，调用ft接口后固定传0
     * base_model_key (str): 调用ft接口获取的模型名字
     * target_model_name (str): 微调后的模型名称
     * created_from_info (str): 创建来源
     * datasets (list): 数据集uuids
     * datasets_type (list): 数据集类型
     * finetuning_type (str): 微调类型 LoRA, QLoRA, Full
     * finetune_config (dict): 微调配置信息
     * num_gpus (int): GPU数量
     * training_type (str): 训练模式 PT, SFT, RM, PPO, DPO
     * val_size (float): 验证集占比
     * num_epochs (int): 重复次数
     * learning_rate (float): 学习率
     * lr_scheduler_type (str): 学习率调整策略
     * batch_size (int): 批次大小
     * cutoff_len (str): 序列最大长度
     * lora_r (int): LoRa秩
     * lora_rate (int): 微调占比
     *
     * Returns:
     * dict: 创建的微调任务详细信息
     *
     * Raises:
     * ValidationError: 当输入数据验证失败时
     * CommonError: 当创建任务失败时
     * 创建新的模型微调任务，需要登录和写入权限
     * @param requestBody
     * @returns any 创建成功
     * @throws ApiError
     */
    public static postFinetune(
        requestBody: {
            base: {
                /**
                 * 基础模型UUID，调用ft接口后固定传0
                 */
                base_model?: string;
                /**
                 * 调用ft接口获取的模型名字（格式：model_key:ams）
                 */
                base_model_key: string;
                /**
                 * 创建来源
                 */
                created_from_info?: string;
                /**
                 * 数据集UUID列表
                 */
                datasets: Array<string>;
                /**
                 * 数据集类型列表
                 */
                datasets_type?: Array<string>;
                /**
                 * 微调类型：LoRA/QLoRA/Full
                 */
                finetuning_type: 'LoRA' | 'QLoRA' | 'Full';
                /**
                 * 任务名称
                 */
                name: string;
                /**
                 * 微调后的模型名称
                 */
                target_model_name: string;
            };
            finetune_config: {
                /**
                 * 批次大小
                 */
                batch_size?: number;
                /**
                 * 序列最大长度
                 */
                cutoff_len?: string;
                /**
                 * 学习率
                 */
                learning_rate?: number;
                /**
                 * LoRa秩
                 */
                lora_r?: number;
                /**
                 * 微调占比
                 */
                lora_rate?: number;
                /**
                 * 学习率调整策略
                 */
                lr_scheduler_type?: string;
                /**
                 * 重复次数
                 */
                num_epochs?: number;
                /**
                 * GPU数量
                 */
                num_gpus?: number;
                /**
                 * 训练模式：PT/SFT/RM/PPO/DPO
                 */
                training_type?: 'PT' | 'SFT' | 'RM' | 'PPO' | 'DPO';
                /**
                 * 验证集占比
                 */
                val_size?: number;
            };
        },
    ): CancelablePromise<{
        code?: number;
        data?: {
            /**
             * 基础模型UUID
             */
            base_model?: string;
            /**
             * 基础模型key
             */
            base_model_key?: string;
            created_at?: string;
            /**
             * 创建者ID
             */
            created_by?: string;
            created_by_account?: {
                avatar?: string;
                id?: string;
                name?: string;
            };
            /**
             * 创建来源
             */
            created_from_info?: string;
            /**
             * 任务描述
             */
            description?: string;
            /**
             * 微调配置
             */
            finetune_config?: Record<string, any>;
            /**
             * 微调类型
             */
            finetuning_type?: string;
            /**
             * 任务ID
             */
            id?: number;
            /**
             * 日志路径
             */
            log_path?: string;
            /**
             * 任务名称
             */
            name?: string;
            /**
             * 任务状态
             */
            status?: string;
            /**
             * 任务状态（中文）
             */
            status_label?: string;
            /**
             * 目标模型UUID
             */
            target_model?: string;
            /**
             * 微调后的模型名称
             */
            target_model_name?: string;
            train_end_time?: string;
            /**
             * 训练运行时间（秒）
             */
            train_runtime?: number;
            updated_at?: string;
            /**
             * 用户名
             */
            user_name?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/finetune',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 取消微调任务。
     *
     * 取消正在进行的微调任务。
     *
     * Args:
     * task_id (int): 微调任务ID
     *
     * Returns:
     * tuple: (响应消息, HTTP状态码)
     * 成功: ({"message": "success", "code": 200}, 200)
     * 失败: ({"message": "cancel fail", "code": 400}, 400)
     *
     * Raises:
     * PermissionError: 当用户没有取消权限时
     * ValueError: 当任务不存在时
     * 取消正在进行的微调任务，需要登录和写入权限
     * @param taskId 微调任务ID
     * @returns any 取消成功
     * @throws ApiError
     */
    public static deleteFinetuneCancel(
        taskId: number,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/finetune/cancel/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取可用于微调的数据集列表。
     *
     * 根据查询类型获取可用于微调的数据集列表。
     *
     * Args:
     * qtype (str): 查询类型，可选值：mine/group/builtin/already，默认为already
     *
     * Returns:
     * dict: 数据集树形结构
     *
     * Raises:
     * ValueError: 当查询类型无效时
     * Exception: 当获取数据集列表失败时
     * 根据查询类型获取可用于微调的数据集列表（树形结构），需要登录
     * @param qtype 查询类型：mine/group/builtin/already
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getFinetuneDatasets(
        qtype: 'mine' | 'group' | 'builtin' | 'already' = 'already',
    ): CancelablePromise<{
        code?: number;
        /**
         * 数据集树形结构
         */
        data?: Record<string, any>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/finetune/datasets',
            query: {
                'qtype': qtype,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除微调任务。
     *
     * 删除指定的微调任务。
     *
     * Args:
     * task_id (int): 微调任务ID
     *
     * Returns:
     * tuple: (响应消息, HTTP状态码)
     * 成功: ({"message": "success", "code": 200}, 200)
     * 失败: ({"message": "delete fail", "code": 400}, 400)
     *
     * Raises:
     * PermissionError: 当用户没有删除权限时
     * ValueError: 当任务不存在时
     * 删除指定的微调任务，需要登录和管理员权限
     * @param taskId 微调任务ID
     * @returns any 删除成功
     * @throws ApiError
     */
    public static deleteFinetuneDelete(
        taskId: number,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/finetune/delete/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取微调任务详细信息。
     *
     * 获取指定微调任务的详细信息。
     *
     * Args:
     * task_id (int): 微调任务ID
     *
     * Returns:
     * dict: 微调任务的详细信息
     *
     * Raises:
     * PermissionError: 当用户没有读取权限时
     * ValueError: 当任务不存在时
     * 获取指定微调任务的详细信息，需要登录
     * @param taskId 微调任务ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getFinetuneDetail(
        taskId: number,
    ): CancelablePromise<{
        code?: number;
        data?: {
            /**
             * 基础模型UUID
             */
            base_model?: string;
            /**
             * 基础模型key
             */
            base_model_key?: string;
            created_at?: string;
            /**
             * 创建者ID
             */
            created_by?: string;
            created_by_account?: {
                avatar?: string;
                id?: string;
                name?: string;
            };
            /**
             * 创建来源
             */
            created_from_info?: string;
            /**
             * 任务描述
             */
            description?: string;
            /**
             * 微调配置
             */
            finetune_config?: Record<string, any>;
            /**
             * 微调类型
             */
            finetuning_type?: string;
            /**
             * 任务ID
             */
            id?: number;
            /**
             * 日志路径
             */
            log_path?: string;
            /**
             * 任务名称
             */
            name?: string;
            /**
             * 任务状态
             */
            status?: string;
            /**
             * 任务状态（中文）
             */
            status_label?: string;
            /**
             * 目标模型UUID
             */
            target_model?: string;
            /**
             * 微调后的模型名称
             */
            target_model_name?: string;
            train_end_time?: string;
            /**
             * 训练运行时间（秒）
             */
            train_runtime?: number;
            updated_at?: string;
            /**
             * 用户名
             */
            user_name?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/finetune/detail/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取FT模型列表。
     *
     * 获取可用的FT模型列表。
     *
     * Returns:
     * tuple: (响应数据, HTTP状态码)
     * 成功: ({"message": "success", "code": 200, "data": 模型列表}, 200)
     * 失败: ({"message": "failed", "code": 400, "data": 错误信息}, 400)
     *
     * Raises:
     * Exception: 当获取模型列表失败时
     * 获取可用的FT模型列表，需要登录
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getFinetuneFtModels(): CancelablePromise<{
        code?: number;
        /**
         * FT模型列表
         */
        data?: Array<Record<string, any>>;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/finetune/ft/models',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取微调任务分页列表。
     *
     * 根据查询条件获取微调任务的分页列表。
     *
     * Args:
     * page (int): 页码，默认为1
     * limit (int): 每页数量，默认为20
     * qtype (str): 查询类型，可选值：mine/group/builtin/already，默认为already
     * search_name (str): 搜索名称
     * status (list): 状态过滤列表
     * user_id (list): 用户ID过滤列表
     *
     * Returns:
     * dict: 分页的微调任务列表
     *
     * Raises:
     * ValueError: 当分页参数无效时
     * 分页获取微调任务列表，支持按任务名称、状态、用户ID等条件筛选，需要登录
     * @param requestBody
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postFinetuneListPage(
        requestBody: {
            /**
             * 每页数量
             */
            limit?: number;
            /**
             * 页码，从1开始
             */
            page?: number;
            /**
             * 查询类型：mine（我的）/group（组内）/builtin（内置）/already（已访问）
             */
            qtype?: 'mine' | 'group' | 'builtin' | 'already';
            /**
             * 任务名称搜索关键词
             */
            search_name?: string;
            /**
             * 状态过滤列表
             */
            status?: Array<string>;
            /**
             * 用户ID过滤列表
             */
            user_id?: Array<string>;
        },
    ): CancelablePromise<{
        /**
         * 微调任务列表
         */
        data?: Array<{
            /**
             * 基础模型UUID
             */
            base_model?: string;
            /**
             * 基础模型key
             */
            base_model_key?: string;
            created_at?: string;
            /**
             * 创建者ID
             */
            created_by?: string;
            created_by_account?: {
                avatar?: string;
                id?: string;
                name?: string;
            };
            /**
             * 创建来源
             */
            created_from_info?: string;
            /**
             * 任务描述
             */
            description?: string;
            /**
             * 微调配置
             */
            finetune_config?: Record<string, any>;
            /**
             * 微调类型
             */
            finetuning_type?: string;
            /**
             * 任务ID
             */
            id?: number;
            /**
             * 日志路径
             */
            log_path?: string;
            /**
             * 任务名称
             */
            name?: string;
            /**
             * 任务状态
             */
            status?: string;
            /**
             * 任务状态（中文）
             */
            status_label?: string;
            /**
             * 目标模型UUID
             */
            target_model?: string;
            /**
             * 微调后的模型名称
             */
            target_model_name?: string;
            train_end_time?: string;
            /**
             * 训练运行时间（秒）
             */
            train_runtime?: number;
            updated_at?: string;
            /**
             * 用户名
             */
            user_name?: string;
        }>;
        /**
         * 是否有更多数据
         */
        has_more?: boolean;
        /**
         * 每页数量
         */
        limit?: number;
        /**
         * 当前页码
         */
        page?: number;
        /**
         * 总记录数
         */
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/finetune/list/page',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取微调任务日志。
     *
     * 获取指定微调任务的日志内容。
     *
     * Args:
     * task_id (int): 微调任务ID
     *
     * Returns:
     * Response: 日志文件响应，包含日志内容
     *
     * Raises:
     * PermissionError: 当用户没有读取权限时
     * FileNotFoundError: 当日志文件不存在时
     * 获取指定微调任务的日志内容，需要登录
     * @param taskId 微调任务ID
     * @returns binary 获取成功
     * @throws ApiError
     */
    public static getFinetuneLog(
        taskId: number,
    ): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/finetune/log/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取可用于微调的模型列表。
     *
     * 根据查询类型获取可用于微调的模型列表。
     *
     * Args:
     * qtype (str): 查询类型，可选值：mine/group/builtin/already，默认为already
     *
     * Returns:
     * list: 模型列表
     *
     * Raises:
     * ValueError: 当查询类型无效时
     * Exception: 当获取模型列表失败时
     * 根据查询类型获取可用于微调的模型列表，需要登录
     * @param qtype 查询类型：mine/group/builtin/already
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getFinetuneModels(
        qtype: 'mine' | 'group' | 'builtin' | 'already' = 'already',
    ): CancelablePromise<{
        code?: number;
        /**
         * 模型列表
         */
        data?: Array<Record<string, any>>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/finetune/models',
            query: {
                'qtype': qtype,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 暂停微调任务。
     *
     * 暂停正在进行的微调任务。
     *
     * Args:
     * task_id (int): 微调任务ID
     *
     * Returns:
     * tuple: (响应消息, HTTP状态码)
     * 成功: ({"message": "操作成功", "code": 200}, 200)
     * 失败: ({"message": 错误信息, "code": 400}, 400)
     *
     * Raises:
     * PermissionError: 当用户没有暂停权限时
     * ValueError: 当任务不存在时
     * CommonError: 当暂停失败时（包含详细错误信息）
     * 暂停正在进行的微调任务，需要登录和写入权限
     * @param taskId 微调任务ID
     * @returns any 暂停成功
     * @throws ApiError
     */
    public static getFinetunePause(
        taskId: number,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/finetune/pause/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 恢复微调任务。
     *
     * 恢复已暂停的微调任务。
     *
     * Args:
     * task_id (int): 微调任务ID
     *
     * Returns:
     * tuple: (响应消息, HTTP状态码)
     * 成功: ({"message": "操作成功", "code": 200}, 200)
     * 失败: ({"message": 错误信息, "code": 400}, 400)
     *
     * Raises:
     * PermissionError: 当用户没有恢复权限时
     * ValueError: 当任务不存在时
     * CommonError: 当恢复失败时（包含详细错误信息）
     * 恢复已暂停的微调任务，需要登录和写入权限
     * @param taskId 微调任务ID
     * @returns any 恢复成功
     * @throws ApiError
     */
    public static getFinetuneResume(
        taskId: number,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/finetune/resume/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取微调任务运行指标。
     *
     * 获取指定微调任务的实时运行指标。
     *
     * Args:
     * task_id (int): 微调任务ID
     *
     * Returns:
     * tuple: (响应数据, HTTP状态码)
     * 成功: (指标数据, 200)
     * 失败: ({"message": "get_running_metrics fail", "code": 400}, 400)
     *
     * Raises:
     * PermissionError: 当用户没有读取权限时
     * ValueError: 当任务不存在时
     * 获取指定微调任务的实时运行指标，需要登录
     * @param taskId 微调任务ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getFinetuneRunningMetrics(
        taskId: number,
    ): CancelablePromise<{
        code?: number;
        /**
         * 运行指标数据
         */
        data?: Record<string, any>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/finetune/running_metrics/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 启动微调任务。
     *
     * 异步启动指定的微调任务。
     *
     * Args:
     * task_id (int): 微调任务ID
     *
     * Returns:
     * bool: 启动操作是否成功
     *
     * Raises:
     * ValueError: 当任务不存在时
     * Exception: 当启动任务失败时
     * 异步启动指定的微调任务，需要登录和写入权限
     * @param taskId 微调任务ID
     * @returns boolean 启动成功
     * @throws ApiError
     */
    public static getFinetuneStart(
        taskId: number,
    ): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/finetune/start/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除自定义参数。
     *
     * 删除指定的自定义参数记录。
     *
     * Args:
     * record_id (int): 记录ID，默认为0
     *
     * Returns:
     * tuple: (响应消息, HTTP状态码)
     * 成功: ({"message": "success", "code": 200}, 200)
     * 失败: ({"message": "delete fail", "code": 400}, 400)
     *
     * Raises:
     * ValueError: 当记录ID无效时
     * Exception: 当删除失败时
     * 删除指定的自定义参数记录，需要登录和写入权限
     * @param recordId 记录ID
     * @returns any 删除成功
     * @throws ApiError
     */
    public static deleteFinetuneParam(
        recordId?: number,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/finetune_param',
            query: {
                'record_id': recordId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取自定义参数列表。
     *
     * 获取当前用户的自定义参数列表。
     *
     * Returns:
     * list: 自定义参数列表
     *
     * Raises:
     * Exception: 当获取参数列表失败时
     * 获取当前用户的自定义参数列表，需要登录
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getFinetuneParam(): CancelablePromise<{
        code?: number;
        /**
         * 自定义参数列表
         */
        data?: Array<{
            finetune_config?: {
                /**
                 * 批次大小
                 */
                batch_size?: number;
                /**
                 * 序列最大长度
                 */
                cutoff_len?: number;
                /**
                 * 学习率
                 */
                learning_rate?: number;
                /**
                 * LoRa alpha
                 */
                lora_alpha?: number;
                /**
                 * LoRa秩
                 */
                lora_r?: number;
                /**
                 * 微调占比
                 */
                lora_rate?: number;
                /**
                 * 学习率调整策略
                 */
                lr_scheduler_type?: string;
                /**
                 * 重复次数
                 */
                num_epochs?: number;
                /**
                 * GPU数量
                 */
                num_gpus?: number;
                /**
                 * 训练模式 (PT, SFT, RM, PPO, DPO)
                 */
                training_type?: string;
                /**
                 * 验证集占比
                 */
                val_size?: number;
            };
            /**
             * 参数ID
             */
            id?: string;
            /**
             * 是否默认
             */
            is_default?: boolean;
            /**
             * 参数名称
             */
            name?: string;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/finetune_param',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 保存自定义参数。
     *
     * 保存用户的自定义参数配置。
     *
     * Args:
     * data (dict): 自定义参数配置数据
     *
     * Returns:
     * dict: 保存的自定义参数信息
     *
     * Raises:
     * ValidationError: 当参数数据验证失败时
     * Exception: 当保存参数失败时
     * 保存用户的自定义参数配置，需要登录和写入权限
     * @param requestBody
     * @returns any 保存成功
     * @throws ApiError
     */
    public static postFinetuneParam(
        requestBody: {
            /**
             * 微调配置
             */
            finetune_config: {
                /**
                 * 批次大小
                 */
                batch_size?: number;
                /**
                 * 序列最大长度
                 */
                cutoff_len?: number;
                /**
                 * 学习率
                 */
                learning_rate?: number;
                /**
                 * LoRa alpha
                 */
                lora_alpha?: number;
                /**
                 * LoRa秩
                 */
                lora_r?: number;
                /**
                 * 微调占比
                 */
                lora_rate?: number;
                /**
                 * 学习率调整策略
                 */
                lr_scheduler_type?: string;
                /**
                 * 重复次数
                 */
                num_epochs?: number;
                /**
                 * GPU数量
                 */
                num_gpus?: number;
                /**
                 * 训练模式 (PT, SFT, RM, PPO, DPO)
                 */
                training_type?: string;
                /**
                 * 验证集占比
                 */
                val_size?: number;
            };
            /**
             * 参数名称
             */
            name: string;
        },
    ): CancelablePromise<{
        code?: number;
        data?: {
            finetune_config?: {
                /**
                 * 批次大小
                 */
                batch_size?: number;
                /**
                 * 序列最大长度
                 */
                cutoff_len?: number;
                /**
                 * 学习率
                 */
                learning_rate?: number;
                /**
                 * LoRa alpha
                 */
                lora_alpha?: number;
                /**
                 * LoRa秩
                 */
                lora_r?: number;
                /**
                 * 微调占比
                 */
                lora_rate?: number;
                /**
                 * 学习率调整策略
                 */
                lr_scheduler_type?: string;
                /**
                 * 重复次数
                 */
                num_epochs?: number;
                /**
                 * GPU数量
                 */
                num_gpus?: number;
                /**
                 * 训练模式 (PT, SFT, RM, PPO, DPO)
                 */
                training_type?: string;
                /**
                 * 验证集占比
                 */
                val_size?: number;
            };
            /**
             * 参数ID
             */
            id?: string;
            /**
             * 是否默认
             */
            is_default?: boolean;
            /**
             * 参数名称
             */
            name?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/finetune_param',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取云服务状态
     * 查询cloud-service的启用状态，需要登录
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getInferServiceCloudStatus(): CancelablePromise<{
        /**
         * 是否启用
         */
        enabled?: boolean;
        /**
         * 状态消息
         */
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/infer-service/cloud/status',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 处理POST请求，关闭推理服务组。
     *
     * 验证权限，关闭服务组中的所有服务。
     *
     * Returns:
     * dict: 关闭结果的响应字典。
     *
     * Raises:
     * ValueError: 当权限不足或服务组不存在时抛出异常。
     * 关闭指定服务组中的所有服务，需要登录和写入权限
     * @param requestBody 服务组ID
     * @returns any 关闭成功
     * @throws ApiError
     */
    public static postInferServiceGroupClose(
        requestBody: {
            /**
             * 服务组ID
             */
            group_id: number;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/infer-service/group/close',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 处理POST请求，创建推理服务组。
     *
     * 验证模型信息，检查AMS支持，创建服务组。
     *
     * Returns:
     * dict: 创建结果的响应字典。
     *
     * Raises:
     * ValueError: 当模型不存在或AMS不支持时抛出异常。
     * 创建推理服务组，需要登录和写入权限，需要启用推理服务功能
     * @param requestBody 服务组数据
     * @returns any 创建成功
     * @throws ApiError
     */
    public static postInferServiceGroupCreate(
        requestBody: {
            /**
             * 模型ID
             */
            model_id: number;
            /**
             * 模型类型
             */
            model_type: string;
            /**
             * 服务配置列表
             */
            services: Array<{
                /**
                 * 服务名称
                 */
                name: string;
                /**
                 * GPU数量
                 */
                num_gpus?: number;
            }>;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/infer-service/group/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 处理POST请求，启动推理服务组。
     *
     * 验证权限，启动服务组中的所有服务。
     *
     * Returns:
     * dict: 启动结果的响应字典。
     *
     * Raises:
     * ValueError: 当权限不足或服务组不存在时抛出异常。
     * 启动指定服务组中的所有服务，需要登录和写入权限，需要启用推理服务功能
     * @param requestBody 服务组ID
     * @returns any 启动成功
     * @throws ApiError
     */
    public static postInferServiceGroupStart(
        requestBody: {
            /**
             * 服务组ID
             */
            group_id: number;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/infer-service/group/start',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 处理POST请求，分页获取推理服务列表。
     *
     * 解析请求中的分页参数，调用InferService获取服务列表和分页信息。
     *
     * Returns:
     * dict: 包含服务列表和分页信息的响应字典。
     *
     * Raises:
     * Exception: 当获取服务列表失败时抛出异常。
     * 分页获取推理服务列表，支持按名称、状态、用户ID、租户等条件筛选，需要登录
     * @param requestBody 查询参数
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postInferServiceList(
        requestBody?: {
            /**
             * 页码，从 1 开始
             */
            page?: number;
            /**
             * 每页数量
             */
            per_page?: number;
            /**
             * 查询类型：mine(我的)、group(组)、builtin(内置)、already(已有)
             */
            qtype?: 'mine' | 'group' | 'builtin' | 'already';
            /**
             * 搜索名称
             */
            search_name?: string;
            /**
             * 状态筛选
             */
            status?: Array<'Ready' | 'Pending' | 'Running' | 'Stopped' | 'Error'>;
            /**
             * 租户筛选
             */
            tenant?: string;
            /**
             * 用户ID筛选
             */
            user_id?: Array<string>;
        },
    ): CancelablePromise<{
        code?: number;
        data?: {
            /**
             * 当前页码
             */
            current_page?: number;
            /**
             * 下一页页码
             */
            next_page?: number;
            /**
             * 总页数
             */
            pages?: number;
            /**
             * 上一页页码
             */
            prev_page?: number;
            /**
             * 服务列表
             */
            result?: Array<{
                /**
                 * 创建者ID
                 */
                created_by?: string;
                /**
                 * 创建时间
                 */
                created_time?: string;
                /**
                 * 组ID
                 */
                gid?: string;
                /**
                 * 服务组ID
                 */
                group_id?: number;
                /**
                 * 服务ID
                 */
                id?: number;
                /**
                 * 任务ID
                 */
                job_id?: string;
                /**
                 * 模型ID
                 */
                model_id?: number;
                /**
                 * 模型名称
                 */
                model_name?: string;
                /**
                 * 模型类型
                 */
                model_type?: string;
                /**
                 * 服务名称
                 */
                name?: string;
                /**
                 * 服务状态
                 */
                status?: string;
                /**
                 * 租户ID
                 */
                tenant_id?: string;
                /**
                 * 更新时间
                 */
                updated_time?: string;
            }>;
            /**
             * 总记录数
             */
            total?: number;
        };
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/infer-service/list',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 处理GET请求，获取在线模型列表。
     *
     * 获取可用于绘图的在线推理服务列表。
     *
     * Returns:
     * dict: 包含在线模型列表的响应字典。
     *
     * Raises:
     * Exception: 当获取在线模型列表失败时抛出异常。
     * 获取可用于画布的在线推理服务列表，支持按模型种类筛选，需要登录
     * @param modelKind 模型种类
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getInferServiceListDraw(
        modelKind: string = '',
    ): CancelablePromise<{
        code?: number;
        data?: {
            result?: Array<{
                /**
                 * 服务ID
                 */
                id?: number;
                /**
                 * 模型名称
                 */
                model_name?: string;
                /**
                 * 服务名称
                 */
                name?: string;
                /**
                 * 服务状态
                 */
                status?: string;
            }>;
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/infer-service/list/draw',
            query: {
                'model_kind': modelKind,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 处理GET请求，获取模型列表。
     *
     * 根据查询参数获取本地模型列表，包括微调模型。
     *
     * Returns:
     * list: 模型列表。
     *
     * Raises:
     * Exception: 当获取模型列表失败时抛出异常。
     * 获取可用于创建推理服务的模型列表，支持按模型类型、模型种类筛选，需要登录
     * @param modelType 模型类型
     * @param modelKind 模型种类
     * @param qtype 查询类型
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getInferServiceModelList(
        modelType: string = 'local',
        modelKind: string = '',
        qtype: string = '',
    ): CancelablePromise<Array<{
        /**
         * 模型ID
         */
        id?: number;
        /**
         * 模型名称
         */
        model_name?: string;
        /**
         * 是否需要确认
         */
        need_confirm?: boolean;
    }>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/infer-service/model/list',
            query: {
                'model_type': modelType,
                'model_kind': modelKind,
                'qtype': qtype,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 处理GET请求，获取AMS支持的本地模型列表。
     *
     * 根据模型类型获取AMS支持的本地模型列表，包括微调模型。
     *
     * Returns:
     * list: AMS支持的模型列表。
     *
     * Raises:
     * Exception: 当获取AMS模型列表失败时抛出异常。
     * 获取AMS支持的本地模型列表，包括微调模型，需要登录
     * @param modelType 模型类型
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getInferServiceModelListAms(
        modelType: string = '',
    ): CancelablePromise<Array<{
        /**
         * 模型ID
         */
        id?: number;
        /**
         * 模型名称
         */
        model_name?: string;
        /**
         * 是否需要确认
         */
        need_confirm?: boolean;
    }>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/infer-service/model/list/ams',
            query: {
                'model_type': modelType,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 处理POST请求，创建推理服务。
     *
     * 验证权限，创建推理服务。
     *
     * Returns:
     * dict: 创建结果的响应字典。
     *
     * Raises:
     * ValueError: 当权限不足或服务组不存在时抛出异常。
     * 在指定服务组中创建推理服务，需要登录和写入权限，需要启用推理服务功能
     * @param requestBody 服务数据
     * @returns any 创建成功
     * @throws ApiError
     */
    public static postInferServiceServiceCreate(
        requestBody: {
            /**
             * 服务组ID
             */
            group_id: number;
            /**
             * 服务配置列表
             */
            services: Array<{
                /**
                 * 服务名称
                 */
                name: string;
                /**
                 * GPU数量
                 */
                num_gpus?: number;
            }>;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/infer-service/service/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 处理POST请求，删除推理服务。
     *
     * 验证权限，删除指定的推理服务。
     *
     * Returns:
     * dict: 删除结果的响应字典。
     *
     * Raises:
     * ValueError: 当权限不足或服务不存在时抛出异常。
     * 删除指定的推理服务，需要登录和写入权限
     * @param requestBody 服务ID
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postInferServiceServiceDelete(
        requestBody: {
            /**
             * 服务ID
             */
            service_id: number;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/infer-service/service/delete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
                500: `服务器错误`,
            },
        });
    }
    /**
     * 处理POST请求，启动推理服务。
     *
     * 验证权限，启动指定的推理服务。
     *
     * Returns:
     * dict: 启动结果的响应字典。
     *
     * Raises:
     * ValueError: 当权限不足或服务不存在时抛出异常。
     * 启动指定的推理服务，需要登录和写入权限，需要启用推理服务功能
     * @param requestBody 服务ID
     * @returns any 启动成功
     * @throws ApiError
     */
    public static postInferServiceServiceStart(
        requestBody: {
            /**
             * 服务ID
             */
            service_id: number;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/infer-service/service/start',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 处理POST请求，停止推理服务。
     *
     * 验证权限，停止指定的推理服务。
     *
     * Returns:
     * dict: 停止结果的响应字典。
     *
     * Raises:
     * ValueError: 当权限不足或服务不存在时抛出异常。
     * 停止指定的推理服务，需要登录和写入权限
     * @param requestBody 服务ID
     * @returns any 停止成功
     * @throws ApiError
     */
    public static postInferServiceServiceStop(
        requestBody: {
            /**
             * 服务ID
             */
            service_id: number;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/infer-service/service/stop',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 创建空的知识库。
     *
     * Returns:
     * dict: 创建的知识库信息
     * 创建新的空知识库，需要写入权限
     * @param requestBody
     * @returns any 创建成功
     * @throws ApiError
     */
    public static postKbCreate(
        requestBody: {
            /**
             * 知识库描述
             */
            description: string;
            /**
             * 知识库名称
             */
            name: string;
        },
    ): CancelablePromise<{
        code?: number;
        data?: {
            created_at?: string;
            /**
             * 知识库描述
             */
            description?: string;
            id?: string;
            /**
             * 知识库名称
             */
            name?: string;
            /**
             * 知识库路径
             */
            path?: string;
            /**
             * 是否被引用
             */
            ref_status?: boolean;
            /**
             * 标签列表
             */
            tags?: Array<string>;
            updated_at?: string;
            /**
             * 创建者用户ID
             */
            user_id?: string;
            /**
             * 创建者用户名
             */
            user_name?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/kb/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除知识库。
     *
     * Returns:
     * dict: 删除成功的响应消息
     * 删除指定的知识库，需要管理员权限
     * @param requestBody
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postKbDelete(
        requestBody: {
            /**
             * 知识库ID
             */
            id: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/kb/delete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 下载单个或多个文件。
     *
     * Returns:
     * Response: 文件下载响应，单个文件直接下载，多个文件打包为zip下载
     * 下载单个或多个文件。单个文件直接下载，多个文件打包为zip下载
     * @param requestBody
     * @returns binary 下载成功
     * @throws ApiError
     */
    public static postKbDownload(
        requestBody: {
            /**
             * 文件ID列表，单个文件直接下载，多个文件打包为zip下载
             */
            file_ids: Array<number>;
        },
    ): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/kb/download',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
            },
        });
    }
    /**
     * 往知识库添加文件。
     *
     * Returns:
     * dict: 添加成功的响应消息
     * 将已上传的文件添加到指定的知识库中，需要对该知识库有写入权限
     * @param requestBody
     * @returns any 添加成功
     * @throws ApiError
     */
    public static postKbFileAdd(
        requestBody: {
            /**
             * 文件ID列表
             */
            file_ids: Array<string>;
            /**
             * 知识库ID
             */
            knowledge_base_id: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/kb/file/add',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 批量删除文件。
     *
     * Returns:
     * dict: 删除成功的响应消息
     * 批量删除知识库中的文件，需要对该知识库有管理员权限
     * @param requestBody
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postKbFileDelete(
        requestBody: {
            /**
             * 要删除的文件ID列表
             */
            file_ids: Array<string>;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/kb/file/delete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取单个文件详情。
     *
     * Returns:
     * dict: 文件详细信息
     * 根据文件ID获取文件的详细信息
     * @param requestBody
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postKbFileGet(
        requestBody: {
            /**
             * 文件ID
             */
            file_id: string;
        },
    ): CancelablePromise<{
        code?: number;
        data?: {
            created_at?: string;
            /**
             * 文件MD5值
             */
            file_md5?: string;
            /**
             * 文件路径
             */
            file_path?: string;
            /**
             * 文件类型
             */
            file_type?: string;
            id?: string;
            /**
             * 所属知识库ID
             */
            knowledge_base_id?: string;
            /**
             * 文件名
             */
            name?: string;
            /**
             * 文件大小（字节）
             */
            size?: number;
            /**
             * 存储类型
             */
            storage_type?: string;
            updated_at?: string;
            /**
             * 是否已使用
             */
            used?: boolean;
            /**
             * 用户ID
             */
            user_id?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/kb/file/get',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取知识库详情与文件列表。
     *
     * Returns:
     * dict: 知识库信息和分页文件列表
     * 分页获取指定知识库中的文件列表，同时返回知识库的基本信息，需要对该知识库有读取权限
     * @param knowledgeBaseId 知识库ID
     * @param page 页码，从1开始
     * @param pageSize 每页数量
     * @param fileName 文件名搜索关键词
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getKbFileList(
        knowledgeBaseId: string,
        page: number = 1,
        pageSize: number = 20,
        fileName: string = '',
    ): CancelablePromise<{
        /**
         * 文件列表
         */
        data?: Array<{
            created_at?: string;
            /**
             * 文件MD5值
             */
            file_md5?: string;
            /**
             * 文件路径
             */
            file_path?: string;
            /**
             * 文件类型
             */
            file_type?: string;
            id?: string;
            /**
             * 所属知识库ID
             */
            knowledge_base_id?: string;
            /**
             * 文件名
             */
            name?: string;
            /**
             * 文件大小（字节）
             */
            size?: number;
            /**
             * 存储类型
             */
            storage_type?: string;
            updated_at?: string;
            /**
             * 是否已使用
             */
            used?: boolean;
            /**
             * 用户ID
             */
            user_id?: string;
        }>;
        /**
         * 是否有更多数据
         */
        has_more?: boolean;
        /**
         * 知识库信息
         */
        knowledge_base_info?: {
            created_at?: string;
            /**
             * 知识库描述
             */
            description?: string;
            id?: string;
            /**
             * 知识库名称
             */
            name?: string;
            /**
             * 知识库路径
             */
            path?: string;
            /**
             * 是否被引用
             */
            ref_status?: boolean;
            /**
             * 标签列表
             */
            tags?: Array<string>;
            updated_at?: string;
            /**
             * 创建者用户ID
             */
            user_id?: string;
            /**
             * 创建者用户名
             */
            user_name?: string;
        };
        /**
         * 当前页码
         */
        page?: number;
        /**
         * 每页数量
         */
        page_size?: number;
        /**
         * 总记录数
         */
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/kb/file/list',
            query: {
                'knowledge_base_id': knowledgeBaseId,
                'page': page,
                'page_size': pageSize,
                'file_name': fileName,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取知识库列表。
     *
     * Returns:
     * dict: 包含分页知识库列表的响应数据
     * 分页获取用户可访问的知识库列表，支持按知识库名称、查询类型、标签、用户ID等条件筛选
     * @param requestBody
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postKbList(
        requestBody: {
            /**
             * 页码，从1开始
             */
            page?: number;
            /**
             * 每页数量
             */
            page_size?: number;
            /**
             * 查询类型：mine（我的）/group（组内）/builtin（内置）/already（已访问）
             */
            qtype?: 'mine' | 'group' | 'builtin' | 'already';
            /**
             * 知识库名称搜索关键词
             */
            search_name?: string;
            /**
             * 标签筛选列表
             */
            search_tags?: Array<string>;
            /**
             * 用户ID筛选列表
             */
            user_id?: Array<string>;
        },
    ): CancelablePromise<{
        /**
         * 知识库列表
         */
        data?: Array<{
            created_at?: string;
            /**
             * 知识库描述
             */
            description?: string;
            id?: string;
            /**
             * 知识库名称
             */
            name?: string;
            /**
             * 知识库路径
             */
            path?: string;
            /**
             * 是否被引用
             */
            ref_status?: boolean;
            /**
             * 标签列表
             */
            tags?: Array<string>;
            updated_at?: string;
            /**
             * 创建者用户ID
             */
            user_id?: string;
            /**
             * 创建者用户名
             */
            user_name?: string;
        }>;
        /**
         * 是否有更多数据
         */
        has_more?: boolean;
        /**
         * 当前页码
         */
        page?: number;
        /**
         * 每页数量
         */
        page_size?: number;
        /**
         * 总记录数
         */
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/kb/list',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取知识库引用结果
     * 获取引用指定知识库的应用列表，需要对该知识库有读取权限
     * @param id 知识库ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getKbReferenceResult(
        id: string,
    ): CancelablePromise<{
        code?: number;
        /**
         * 引用该知识库的应用列表
         */
        data?: Array<{
            id?: string;
            /**
             * 是否公开
             */
            is_public?: boolean;
            /**
             * 应用名称
             */
            name?: string;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/kb/reference-result',
            query: {
                'id': id,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 修改知识库。
     *
     * Returns:
     * dict: 更新后的知识库信息
     * 更新指定知识库的名称和描述信息，需要写入权限
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static postKbUpdate(
        requestBody: {
            /**
             * 知识库描述
             */
            description: string;
            /**
             * 知识库ID
             */
            id: string;
            /**
             * 知识库名称
             */
            name: string;
        },
    ): CancelablePromise<{
        code?: number;
        data?: {
            created_at?: string;
            /**
             * 知识库描述
             */
            description?: string;
            id?: string;
            /**
             * 知识库名称
             */
            name?: string;
            /**
             * 知识库路径
             */
            path?: string;
            /**
             * 是否被引用
             */
            ref_status?: boolean;
            /**
             * 标签列表
             */
            tags?: Array<string>;
            updated_at?: string;
            /**
             * 创建者用户ID
             */
            user_id?: string;
            /**
             * 创建者用户名
             */
            user_name?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/kb/update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 上传单个文件。
     *
     * Returns:
     * dict: 上传成功的文件信息
     * 上传单个文件到系统，支持格式：.xls, .xlsx, .doc, .docx, .zip, .csv, .json, .txt, .pdf, .html, .tex, .md, .ppt, .pptx, .xml。单个文件最大50MB，zip文件最大500MB。需要写入权限
     * @param formData
     * @returns any 上传成功
     * @throws ApiError
     */
    public static postKbUpload(
        formData?: {
            /**
             * 要上传的文件，支持格式：.xls, .xlsx, .doc, .docx, .zip, .csv, .json, .txt, .pdf, .html, .tex, .md, .ppt, .pptx, .xml。单个文件最大50MB，zip文件最大500MB
             */
            file: Blob;
        },
    ): CancelablePromise<{
        code?: number;
        data?: {
            /**
             * 文件列表
             */
            files?: Array<{
                created_at?: string;
                /**
                 * 文件MD5值
                 */
                file_md5?: string;
                /**
                 * 文件路径
                 */
                file_path?: string;
                /**
                 * 文件类型
                 */
                file_type?: string;
                id?: string;
                /**
                 * 所属知识库ID
                 */
                knowledge_base_id?: string;
                /**
                 * 文件名
                 */
                name?: string;
                /**
                 * 文件大小（字节）
                 */
                size?: number;
                /**
                 * 存储类型
                 */
                storage_type?: string;
                updated_at?: string;
                /**
                 * 是否已使用
                 */
                used?: boolean;
                /**
                 * 用户ID
                 */
                user_id?: string;
            }>;
        };
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/kb/upload',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查询用户的操作日志。
     *
     * 所有时间参数均为北京时间（Asia/Shanghai），系统会自动转换为 UTC 进行查询。
     * 只有管理员才有权查看其他用户的操作日志，普通用户只能查看自己的日志。
     *
     * Args:
     * organization_id (int, optional): 组织的唯一标识符。如果有组织ID，查询该组织下所有用户的操作日志。
     * start_date (str, optional): 开始日期，格式为 'YYYY-MM-DD'。如果有开始日期，过滤该日期之后的操作日志。
     * end_date (str, optional): 结束日期，格式为 'YYYY-MM-DD'。如果有结束日期，过滤该日期之前的操作日志。
     * details (str, optional): 操作的详细信息。如果有详细信息，模糊匹配该信息的操作日志。
     * page (int, optional): 分页页码，默认为1。
     * per_page (int, optional): 每页记录数，默认为10。
     * account_id (str, optional): 用户账户ID。
     * user_name (str, optional): 用户名称。
     * module (str, optional): 操作模块名称。
     * action (str, optional): 操作动作名称。
     *
     * Returns:
     * dict: 包含操作日志数据的响应字典，包含data、total、page、per_page字段。
     *
     * Raises:
     * ValueError: 当日期格式不正确时抛出。
     * PermissionError: 当用户没有权限查看其他用户日志时抛出。
     * 查询用户的操作日志，支持按日期、用户、模块、动作等条件筛选。所有时间参数均为北京时间（Asia/Shanghai），系统会自动转换为 UTC 进行查询。只有管理员才有权查看其他用户的操作日志，普通用户只能查看自己的日志，需要登录
     * @param startDate 开始日期，格式为 YYYY-MM-DD，默认为今天。所有时间参数均为北京时间（Asia/Shanghai）
     * @param endDate 结束日期，格式为 YYYY-MM-DD，默认为今天。所有时间参数均为北京时间（Asia/Shanghai）
     * @param details 操作的详细信息，支持模糊匹配
     * @param page 分页页码，从 1 开始
     * @param perPage 每页记录数
     * @param organizationId 组织的唯一标识符。如果有组织ID，查询该组织下所有用户的操作日志（当前日志中并未记录日志所属的工作空间信息，故该参数无效）
     * @param accountId 用户账户ID。只有管理员才有权查看其他用户的操作日志，普通用户只能查看自己的日志
     * @param userName 用户名称，支持模糊匹配
     * @param module 操作模块名称，支持模糊匹配
     * @param action 操作动作名称，支持模糊匹配
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getLogs(
        startDate?: string,
        endDate?: string,
        details?: string,
        page: number = 1,
        perPage: number = 10,
        organizationId: string = '',
        accountId: string = '',
        userName?: string,
        module?: string,
        action?: string,
    ): CancelablePromise<{
        code?: number;
        data?: {
            /**
             * 日志列表
             */
            data?: Array<{
                /**
                 * 操作动作名称
                 */
                action?: string;
                /**
                 * 创建时间
                 */
                created_at?: string;
                /**
                 * 操作详细信息
                 */
                details?: string;
                /**
                 * 日志ID
                 */
                id?: number;
                /**
                 * 操作模块名称
                 */
                module?: string;
                /**
                 * 用户名
                 */
                username?: string;
            }>;
            /**
             * 当前页码
             */
            page?: number;
            /**
             * 每页数量
             */
            per_page?: number;
            /**
             * 总记录数
             */
            total?: number;
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/logs',
            query: {
                'start_date': startDate,
                'end_date': endDate,
                'details': details,
                'page': page,
                'per_page': perPage,
                'organization_id': organizationId,
                'account_id': accountId,
                'user_name': userName,
                'module': module,
                'action': action,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 检查模型名称是否合法。
     *
     * Args:
     * model_name (str): 模型名称（必需）。
     * model_from (str, optional): 模型来源。
     *
     * Returns:
     * dict: 包含检查结果的字典。
     *
     * Raises:
     * ValueError: 当模型名称已存在或模型已添加时抛出。
     * 检查模型名称是否合法，验证名称是否已存在，需要登录
     * @param requestBody 检查参数
     * @returns any 名称可用
     * @throws ApiError
     */
    public static postMhCheckModelName(
        requestBody: {
            /**
             * 模型来源
             */
            model_from?: string;
            /**
             * 模型名称（必需）
             */
            model_name: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/check/model_name',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建新模型。
     *
     * Args:
     * model_type (str): 模型类型（必需）。
     * model_icon (str, optional): 模型图标路径。
     * model_name (str, optional): 模型名称。
     * description (str, optional): 模型描述。
     * model_from (str, optional): 模型来源。
     * model_kind (str, optional): 模型种类。
     * model_key (str, optional): 模型密钥。
     * access_tokens (str, optional): 访问令牌。
     * prompt_keys (str, optional): 提示词密钥。
     * model_brand (str, optional): 模型品牌。
     * model_url (str, optional): 模型URL。
     * proxy_url (str, optional): 代理URL。
     * model_list (str, optional): 模型列表。
     * model_dir (str, optional): 模型目录。
     * tag_names (list, optional): 标签名称列表。
     *
     * Returns:
     * dict: 创建的模型信息，使用 model_fields 格式。
     *
     * Raises:
     * CommonError: 当不支持的模型品牌时抛出。
     * 创建新的模型，支持本地模型和在线模型，需要登录和写入权限
     * @param requestBody 模型数据
     * @returns any 创建成功
     * @throws ApiError
     */
    public static postMhCreate(
        requestBody: {
            /**
             * 访问令牌
             */
            access_tokens?: string;
            /**
             * 模型描述
             */
            description?: string;
            /**
             * 模型品牌
             */
            model_brand?: string;
            /**
             * 模型目录
             */
            model_dir?: string;
            /**
             * 模型来源
             */
            model_from?: 'localModel' | 'existModel' | 'hf' | 'ms';
            /**
             * 模型图标路径
             */
            model_icon?: string;
            /**
             * 模型密钥
             */
            model_key?: string;
            /**
             * 模型种类
             */
            model_kind?: string;
            /**
             * 模型列表
             */
            model_list?: string;
            /**
             * 模型名称
             */
            model_name?: string;
            /**
             * 模型类型（必需）
             */
            model_type: 'local' | 'online';
            /**
             * 模型URL
             */
            model_url?: string;
            /**
             * 提示词密钥
             */
            prompt_keys?: string;
            /**
             * 代理URL
             */
            proxy_url?: string;
            /**
             * 标签名称列表
             */
            tag_names?: Array<string>;
        },
    ): CancelablePromise<{
        /**
         * API密钥
         */
        api_key?: string;
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 模型描述
         */
        description?: string;
        /**
         * 下载消息
         */
        download_message?: string;
        /**
         * 模型ID
         */
        id?: string;
        /**
         * 模型品牌
         */
        model_brand?: string;
        /**
         * 模型目录
         */
        model_dir?: string;
        /**
         * 模型来源
         */
        model_from?: string;
        /**
         * 模型图标
         */
        model_icon?: string;
        /**
         * 模型密钥
         */
        model_key?: string;
        /**
         * 模型种类
         */
        model_kind?: string;
        /**
         * 模型种类显示
         */
        model_kind_display?: string;
        /**
         * 模型列表
         */
        model_list?: Array<{
            /**
             * 是否为微调模型
             */
            is_finetune_model?: boolean;
            /**
             * 模型密钥
             */
            model_key?: string;
            /**
             * 模型名称
             */
            model_name?: string;
        }>;
        /**
         * 模型名称
         */
        model_name?: string;
        /**
         * 模型路径
         */
        model_path?: string;
        /**
         * 模型状态
         */
        model_status?: string;
        /**
         * 模型类型
         */
        model_type?: string;
        /**
         * 模型URL
         */
        model_url?: string;
        /**
         * 提示词密钥
         */
        prompt_keys?: string;
        /**
         * 标签列表
         */
        tags?: Array<string>;
        /**
         * 更新时间
         */
        updated_at?: string;
        /**
         * 用户ID
         */
        user_id?: string;
        /**
         * 用户名
         */
        user_name?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建微调模型。
     *
     * Args:
     * base_model_id (int): 基础模型ID（必需）。
     * model_from (str): 模型来源（必需）。
     * model_key (str, optional): 模型密钥。
     * access_tokens (str, optional): 访问令牌。
     * prompt_keys (str, optional): 提示词密钥。
     * model_type (str, optional): 模型类型。
     * model_dir (str, optional): 模型目录。
     * model_name (str, optional): 模型名称。
     *
     * Returns:
     * dict: 创建的微调模型信息，使用 model_fields 格式。
     * 创建微调模型，基于指定的基础模型，需要登录和写入权限
     * @param requestBody 微调模型数据
     * @returns any 创建成功
     * @throws ApiError
     */
    public static postMhCreateFinetune(
        requestBody: {
            /**
             * 访问令牌
             */
            access_tokens?: string;
            /**
             * 基础模型ID（必需）
             */
            base_model_id: number;
            /**
             * 模型目录
             */
            model_dir?: string;
            /**
             * 模型来源（必需）
             */
            model_from: string;
            /**
             * 模型密钥
             */
            model_key?: string;
            /**
             * 模型名称
             */
            model_name?: string;
            /**
             * 模型类型
             */
            model_type?: string;
            /**
             * 提示词密钥
             */
            prompt_keys?: string;
        },
    ): CancelablePromise<{
        /**
         * API密钥
         */
        api_key?: string;
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 模型描述
         */
        description?: string;
        /**
         * 下载消息
         */
        download_message?: string;
        /**
         * 模型ID
         */
        id?: string;
        /**
         * 模型品牌
         */
        model_brand?: string;
        /**
         * 模型目录
         */
        model_dir?: string;
        /**
         * 模型来源
         */
        model_from?: string;
        /**
         * 模型图标
         */
        model_icon?: string;
        /**
         * 模型密钥
         */
        model_key?: string;
        /**
         * 模型种类
         */
        model_kind?: string;
        /**
         * 模型种类显示
         */
        model_kind_display?: string;
        /**
         * 模型列表
         */
        model_list?: Array<{
            /**
             * 是否为微调模型
             */
            is_finetune_model?: boolean;
            /**
             * 模型密钥
             */
            model_key?: string;
            /**
             * 模型名称
             */
            model_name?: string;
        }>;
        /**
         * 模型名称
         */
        model_name?: string;
        /**
         * 模型路径
         */
        model_path?: string;
        /**
         * 模型状态
         */
        model_status?: string;
        /**
         * 模型类型
         */
        model_type?: string;
        /**
         * 模型URL
         */
        model_url?: string;
        /**
         * 提示词密钥
         */
        prompt_keys?: string;
        /**
         * 标签列表
         */
        tags?: Array<string>;
        /**
         * 更新时间
         */
        updated_at?: string;
        /**
         * 用户ID
         */
        user_id?: string;
        /**
         * 用户名
         */
        user_name?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/create_finetune',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 保存在线模型列表。
     *
     * Args:
     * model_id (int): 基础模型ID。
     * model_list (list): 在线模型列表，每个元素包含 model_key 和 can_finetune 字段。
     *
     * Returns:
     * dict: 保存操作的结果。
     *
     * Raises:
     * ValueError: 当 model_id 或 model_list 为空时抛出。
     * 保存指定基础模型的在线模型列表，需要登录和写入权限
     * @param requestBody 在线模型列表数据
     * @returns any 保存成功
     * @throws ApiError
     */
    public static postMhCreateOnlineModelList(
        requestBody: {
            /**
             * 基础模型ID
             */
            model_id: number;
            /**
             * 在线模型列表
             */
            model_list: Array<{
                /**
                 * 是否可微调
                 */
                can_finetune?: boolean;
                /**
                 * 模型密钥
                 */
                model_key?: string;
            }>;
        },
    ): CancelablePromise<{
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/create_online_model_list',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取默认图标列表。
     *
     * Returns:
     * list: 默认图标列表。
     * 获取系统默认的图标列表，需要登录
     * @returns string 获取成功
     * @throws ApiError
     */
    public static getMhDefaultIconList(): CancelablePromise<Array<string>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/mh/default_icon_list',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除模型。
     *
     * Args:
     * model_id (str): 模型ID（必需）。
     * qtype (str, optional): 查询类型。默认为"mine"。
     *
     * Returns:
     * dict: 包含操作结果的字典。
     *
     * Raises:
     * ValueError: 当模型被引用时抛出。
     * 删除指定的模型，删除前会检查模型是否被引用，需要登录和管理员权限
     * @param requestBody 删除参数
     * @param qtype 查询类型
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postMhDelete(
        requestBody: {
            /**
             * 模型ID（必需）
             */
            model_id: string;
        },
        qtype: string = 'mine',
    ): CancelablePromise<{
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/delete',
            query: {
                'qtype': qtype,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 删除微调模型。
     *
     * Args:
     * model_id (int): 基础模型ID。
     * finetune_model_id (int): 微调模型ID。
     *
     * Returns:
     * dict: 删除操作的结果。
     * 删除指定的微调模型，需要登录和管理员权限
     * @param modelId 模型ID
     * @param finetuneModelId 微调模型ID
     * @returns any 删除成功
     * @throws ApiError
     */
    public static deleteMhDeleteFinetuneModel(
        modelId: number,
        finetuneModelId: number,
    ): CancelablePromise<{
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/mh/delete_finetune_model/{model_id}/{finetune_model_id}',
            path: {
                'model_id': modelId,
                'finetune_model_id': finetuneModelId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 删除在线模型列表中的指定模型。
     *
     * Args:
     * model_id (int): 基础模型ID。
     * model_keys (list): 要删除的模型密钥列表。
     *
     * Returns:
     * dict: 删除操作的结果。
     *
     * Raises:
     * ValueError: 当 model_id 或 model_keys 为空时抛出。
     * CommonError: 当删除操作失败时抛出。
     * 删除在线模型列表中的指定模型，需要登录和管理员权限
     * @param requestBody 删除参数
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postMhDeleteOnlineModelList(
        requestBody: {
            /**
             * 基础模型ID
             */
            model_id: number;
            /**
             * 要删除的模型密钥列表
             */
            model_keys: Array<string>;
        },
    ): CancelablePromise<{
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/delete_online_model_list',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除上传但未被引用的模型文件或分片临时目录。
     *
     * Args:
     * filename (str): 文件名（必需）。
     * file_dir (str): 文件目录（必需）。
     *
     * Returns:
     * dict: 删除操作的结果。
     *
     * Raises:
     * ValueError: 当 filename 或 file_dir 为空时抛出。
     * Exception: 当删除操作失败时抛出。
     * 删除上传但未被引用的模型文件或分片临时目录，需要登录和写入权限
     * @param requestBody 删除参数
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postMhDeleteUploadedFile(
        requestBody: {
            /**
             * 文件目录（必需）
             */
            file_dir: string;
            /**
             * 文件名（必需）
             */
            filename: string;
        },
    ): CancelablePromise<{
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/delete_uploaded_file',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取已存在的第三方模型列表。
     *
     * Returns:
     * list: 已存在的第三方模型列表。
     * 获取已存在的第三方模型列表，需要登录
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getMhExistModelList(): CancelablePromise<Array<Record<string, any>>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/mh/exist_model_list',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取微调模型分页列表。
     *
     * Args:
     * model_id (str, optional): 模型ID筛选条件。默认为0。
     * online_model_id (str, optional): 在线模型ID筛选条件。默认为0。
     * page (int, optional): 页码。默认为1。
     * page_size (int, optional): 每页大小。默认为20。
     * qtype (str, optional): 查询类型。默认为"already"。
     *
     * Returns:
     * dict: 包含微调模型列表的分页数据，使用 finetune_pagination_fields 格式。
     * 获取微调模型的分页列表，支持按模型ID筛选，需要登录
     * @param requestBody 查询参数
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postMhFinetuneModelPage(
        requestBody?: {
            /**
             * 模型ID筛选条件
             */
            model_id?: string;
            /**
             * 在线模型ID筛选条件
             */
            online_model_id?: string;
            /**
             * 页码
             */
            page?: number;
            /**
             * 每页大小
             */
            page_size?: number;
            /**
             * 查询类型
             */
            qtype?: 'mine' | 'group' | 'builtin' | 'already';
        },
    ): CancelablePromise<{
        /**
         * 微调模型列表
         */
        data?: Array<{
            /**
             * 创建时间
             */
            created_at?: string;
            /**
             * 模型描述
             */
            description?: string;
            /**
             * 微调任务ID
             */
            finetune_task_id?: number;
            /**
             * 模型ID
             */
            id?: string;
            /**
             * 模型密钥
             */
            model_key?: string;
            /**
             * 模型名称
             */
            model_name?: string;
            /**
             * 模型状态
             */
            model_status?: string;
            /**
             * 来源信息
             */
            source_info?: string;
            /**
             * 更新时间
             */
            updated_at?: string;
        }>;
        /**
         * 是否有更多数据
         */
        has_more?: boolean;
        /**
         * 当前页码
         */
        page?: number;
        /**
         * 每页数量
         */
        page_size?: number;
        /**
         * 总记录数
         */
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/finetune_model_page',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 重试下载微调模型。
     *
     * Args:
     * model_id (int): 基础模型ID。
     * finetune_model_id (int): 微调模型ID。
     *
     * Returns:
     * bool: 操作成功返回True。
     *
     * Raises:
     * CommonError: 当模型不支持重试下载或不是本地模型时抛出。
     * 重试下载指定的微调模型，只支持本地模型，需要登录和写入权限
     * @param modelId 模型ID
     * @param finetuneModelId 微调模型ID
     * @returns boolean 操作成功
     * @throws ApiError
     */
    public static getMhFinetuneRetryDownload(
        modelId: number,
        finetuneModelId: number,
    ): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/mh/finetune_retry_download/{model_id}/{finetune_model_id}',
            path: {
                'model_id': modelId,
                'finetune_model_id': finetuneModelId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查询模型翻页列表。
     *
     * Args:
     * model_type (str, optional): 模型类型筛选条件。默认为空字符串。
     * page (int, optional): 页码。默认为1。
     * page_size (int, optional): 每页大小。默认为20。
     * qtype (str, optional): 查询类型。默认为"already"。
     * search_tags (list, optional): 标签搜索条件。默认为空列表。
     * search_name (str, optional): 模型名称搜索条件。默认为空字符串。
     * available (int, optional): 可用性筛选条件。
     * status (str, optional): 状态筛选条件。默认为空字符串。
     * model_kind (str, optional): 模型种类筛选条件。默认为空字符串。
     * model_brand (str, optional): 模型品牌筛选条件。默认为空字符串。
     * tenant (str, optional): 租户筛选条件。默认为空字符串。
     *
     * Returns:
     * dict: 包含模型列表的分页数据，使用 model_pagination_fields 格式。
     * 根据传入的查询条件获取模型的分页列表，支持按模型类型、状态、标签、名称等条件进行筛选，需要登录
     * @param requestBody 查询参数
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postMhList(
        requestBody?: {
            /**
             * 可用性筛选条件
             */
            available?: number;
            /**
             * 模型品牌筛选条件
             */
            model_brand?: string;
            /**
             * 模型种类筛选条件
             */
            model_kind?: string;
            /**
             * 模型类型筛选条件
             */
            model_type?: string;
            /**
             * 页码，从 1 开始
             */
            page?: number;
            /**
             * 每页大小
             */
            page_size?: number;
            /**
             * 查询类型：mine(我的)、group(组)、builtin(内置)、already(已有)
             */
            qtype?: 'mine' | 'group' | 'builtin' | 'already';
            /**
             * 模型名称搜索条件
             */
            search_name?: string;
            /**
             * 标签搜索条件
             */
            search_tags?: Array<string>;
            /**
             * 状态筛选条件
             */
            status?: string;
            /**
             * 租户筛选条件
             */
            tenant?: string;
        },
    ): CancelablePromise<{
        /**
         * 模型列表
         */
        data?: Array<{
            /**
             * API密钥
             */
            api_key?: string;
            /**
             * 创建时间
             */
            created_at?: string;
            /**
             * 模型描述
             */
            description?: string;
            /**
             * 下载消息
             */
            download_message?: string;
            /**
             * 模型ID
             */
            id?: string;
            /**
             * 模型品牌
             */
            model_brand?: string;
            /**
             * 模型目录
             */
            model_dir?: string;
            /**
             * 模型来源
             */
            model_from?: string;
            /**
             * 模型图标
             */
            model_icon?: string;
            /**
             * 模型密钥
             */
            model_key?: string;
            /**
             * 模型种类
             */
            model_kind?: string;
            /**
             * 模型种类显示
             */
            model_kind_display?: string;
            /**
             * 模型列表
             */
            model_list?: Array<{
                /**
                 * 是否为微调模型
                 */
                is_finetune_model?: boolean;
                /**
                 * 模型密钥
                 */
                model_key?: string;
                /**
                 * 模型名称
                 */
                model_name?: string;
            }>;
            /**
             * 模型名称
             */
            model_name?: string;
            /**
             * 模型路径
             */
            model_path?: string;
            /**
             * 模型状态
             */
            model_status?: string;
            /**
             * 模型类型
             */
            model_type?: string;
            /**
             * 模型URL
             */
            model_url?: string;
            /**
             * 提示词密钥
             */
            prompt_keys?: string;
            /**
             * 标签列表
             */
            tags?: Array<string>;
            /**
             * 更新时间
             */
            updated_at?: string;
            /**
             * 用户ID
             */
            user_id?: string;
            /**
             * 用户名
             */
            user_name?: string;
        }>;
        /**
         * 是否有更多数据
         */
        has_more?: boolean;
        /**
         * 当前页码
         */
        page?: number;
        /**
         * 每页数量
         */
        page_size?: number;
        /**
         * 总记录数
         */
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/list',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取模型详细信息。
     *
     * Args:
     * model_id (int): 模型ID。
     * qtype (str, optional): 查询类型。默认为"mine"。
     * namespace (str, optional): 命名空间。默认为"already"。
     *
     * Returns:
     * dict: 模型详细信息。
     * 获取指定模型的详细信息，需要登录
     * @param modelId 模型ID
     * @param qtype 查询类型
     * @param namespace 命名空间
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getMhModelInfo(
        modelId: number,
        qtype: string = 'mine',
        namespace: string = 'already',
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/mh/model_info/{model_id}',
            path: {
                'model_id': modelId,
            },
            query: {
                'qtype': qtype,
                'namespace': namespace,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 获取模型树结构。
     *
     * Args:
     * qtype (str, optional): 查询类型。默认为"already"。
     * model_type (str, optional): 模型类型筛选条件。默认为空字符串。
     * model_kind (str, optional): 模型种类筛选条件。默认为空字符串。
     *
     * Returns:
     * dict: 模型树结构数据。
     * 获取模型的树形结构数据，支持按模型类型、模型种类筛选，需要登录
     * @param qtype 查询类型
     * @param modelType 模型类型筛选条件
     * @param modelKind 模型种类筛选条件
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getMhModelsTree(
        qtype: 'mine' | 'group' | 'builtin' | 'already' = 'already',
        modelType: string = '',
        modelKind: string = '',
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/mh/models_tree',
            query: {
                'qtype': qtype,
                'model_type': modelType,
                'model_kind': modelKind,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取支持的在线模型列表。
     *
     * Returns:
     * list: 支持的在线模型列表。
     * 获取系统支持的在线模型列表，需要登录
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getMhOnlineModelSupportList(): CancelablePromise<Array<Record<string, any>>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/mh/online_model_support_list',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 重试下载模型。
     *
     * Args:
     * model_id (int): 模型ID。
     *
     * Returns:
     * bool: 操作成功返回True。
     *
     * Raises:
     * CommonError: 当模型不支持重试下载时抛出。
     * 重试下载指定的模型，只支持从hf、ms导入的本地模型，需要登录
     * @param modelId 模型ID
     * @returns boolean 操作成功
     * @throws ApiError
     */
    public static getMhRetryDownload(
        modelId: number,
    ): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/mh/retry_download/{model_id}',
            path: {
                'model_id': modelId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 更新模型配置。
     *
     * Args:
     * model_id (str): 模型ID（必需）。
     * api_key (str): API密钥（必需）。
     *
     * Returns:
     * dict: 更新后的模型信息，使用 model_fields 格式。
     *
     * Raises:
     * CommonError: 当不支持的模型品牌时抛出。
     * 更新模型的配置信息，主要是API密钥，需要登录和写入权限
     * @param requestBody 更新数据
     * @returns any 更新成功
     * @throws ApiError
     */
    public static postMhUpdate(
        requestBody: {
            /**
             * API密钥（必需）
             */
            api_key: string;
            /**
             * 模型ID（必需）
             */
            model_id: string;
        },
    ): CancelablePromise<{
        /**
         * API密钥
         */
        api_key?: string;
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 模型描述
         */
        description?: string;
        /**
         * 下载消息
         */
        download_message?: string;
        /**
         * 模型ID
         */
        id?: string;
        /**
         * 模型品牌
         */
        model_brand?: string;
        /**
         * 模型目录
         */
        model_dir?: string;
        /**
         * 模型来源
         */
        model_from?: string;
        /**
         * 模型图标
         */
        model_icon?: string;
        /**
         * 模型密钥
         */
        model_key?: string;
        /**
         * 模型种类
         */
        model_kind?: string;
        /**
         * 模型种类显示
         */
        model_kind_display?: string;
        /**
         * 模型列表
         */
        model_list?: Array<{
            /**
             * 是否为微调模型
             */
            is_finetune_model?: boolean;
            /**
             * 模型密钥
             */
            model_key?: string;
            /**
             * 模型名称
             */
            model_name?: string;
        }>;
        /**
         * 模型名称
         */
        model_name?: string;
        /**
         * 模型路径
         */
        model_path?: string;
        /**
         * 模型状态
         */
        model_status?: string;
        /**
         * 模型类型
         */
        model_type?: string;
        /**
         * 模型URL
         */
        model_url?: string;
        /**
         * 提示词密钥
         */
        prompt_keys?: string;
        /**
         * 标签列表
         */
        tags?: Array<string>;
        /**
         * 更新时间
         */
        updated_at?: string;
        /**
         * 用户ID
         */
        user_id?: string;
        /**
         * 用户名
         */
        user_name?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 清除数据库中的 api_key。
     *
     * Args:
     * model_brand (str): 模型品牌（必需）。
     *
     * Returns:
     * dict: 包含操作状态和结果的字典。
     * 清除数据库中的 api_key，需要登录和写入权限
     * @param requestBody 删除参数
     * @returns any 清除成功
     * @throws ApiError
     */
    public static deleteMhUpdateApikey(
        requestBody: {
            /**
             * 模型品牌（必需）
             */
            model_brand: string;
        },
    ): CancelablePromise<{
        result?: Record<string, any>;
        status?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/mh/update_apikey',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 根据 model_brand 和 api_key 新增或更新 LazyModelConfigInfo 中的 api_key。
     *
     * Args:
     * model_brand (str): 模型品牌（必需）。
     * api_key (str): API密钥（必需）。
     * proxy_url (str, optional): 代理URL。
     * proxy_auth_info (dict, optional): 代理认证信息。
     *
     * Returns:
     * dict: 包含操作状态和结果的字典。
     * 根据 model_brand 和 api_key 新增或更新 LazyModelConfigInfo 中的 api_key，需要登录和写入权限
     * @param requestBody API密钥数据
     * @returns any 操作成功
     * @throws ApiError
     */
    public static postMhUpdateApikey(
        requestBody: {
            /**
             * API密钥
             */
            api_key?: string;
            /**
             * 模型品牌（必需）
             */
            model_brand: string;
            /**
             * 代理认证信息
             */
            proxy_auth_info?: Record<string, any>;
            /**
             * 代理URL
             */
            proxy_url?: string;
        },
    ): CancelablePromise<{
        result?: Record<string, any>;
        status?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/update_apikey',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 更新在线模型列表。
     *
     * Args:
     * base_model_id (int): 基础模型ID。
     * qtype (str, optional): 查询类型。默认为"already"。
     *
     * Returns:
     * dict: 更新操作的结果。
     *
     * Raises:
     * CommonError: 当模型不存在时抛出。
     * 更新指定基础模型的在线模型列表，需要登录和写入权限
     * @param requestBody 更新参数
     * @param qtype 查询类型
     * @returns any 更新成功
     * @throws ApiError
     */
    public static postMhUpdateOnlineModelList(
        requestBody: {
            /**
             * 基础模型ID
             */
            base_model_id: number;
        },
        qtype: string = 'already',
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/update_online_model_list',
            query: {
                'qtype': qtype,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 上传本地模型文件分片。
     *
     * Args:
     * file (FileStorage): 上传的文件分片。
     * chunk_number (int): 分片编号。
     * total_chunks (int): 总分片数。
     * filename (str): 文件名。
     * file_dir (str): 文件目录。
     *
     * Returns:
     * dict: 包含上传结果的字典。
     *
     * Raises:
     * ValueError: 当未上传文件或上传多个文件时抛出。
     * 上传本地模型文件的分片，支持大文件分片上传，需要登录和写入权限
     * @param formData
     * @returns any 上传成功
     * @throws ApiError
     */
    public static postMhUploadChunk(
        formData?: {
            /**
             * 上传的文件分片
             */
            file: Blob;
            /**
             * 分片编号
             */
            chunk_number: number;
            /**
             * 总分片数
             */
            total_chunks: number;
            /**
             * 文件名
             */
            file_name: string;
            /**
             * 文件目录
             */
            file_dir: string;
        },
    ): CancelablePromise<{
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/upload/chunk',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 上传模型图标文件。
     *
     * Args:
     * file (FileStorage): 上传的文件对象。
     *
     * Returns:
     * dict: 包含文件路径的字典。
     *
     * Raises:
     * ValueError: 当文件格式不支持或未上传文件时抛出。
     * 上传模型图标文件，支持jpg、jpeg、png、gif、bmp格式，需要登录和写入权限
     * @param formData
     * @returns any 上传成功
     * @throws ApiError
     */
    public static postMhUploadIcon(
        formData?: {
            /**
             * 图标文件
             */
            file: Blob;
        },
    ): CancelablePromise<{
        /**
         * 文件路径
         */
        file_path?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/upload/icon',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 合并本地模型文件分片。
     *
     * Args:
     * filename (str): 文件名（必需）。
     * file_dir (str): 文件目录（必需）。
     *
     * Returns:
     * dict: 合并后的文件信息，使用 file_fields 格式。
     *
     * Raises:
     * ValueError: 当文件名为空时抛出。
     * 合并上传的本地模型文件分片，需要登录和写入权限
     * @param requestBody 合并参数
     * @returns any 合并成功
     * @throws ApiError
     */
    public static postMhUploadMerge(
        requestBody: {
            /**
             * 文件目录（必需）
             */
            file_dir: string;
            /**
             * 文件名（必需）
             */
            filename: string;
        },
    ): CancelablePromise<{
        /**
         * 文件ID
         */
        id?: number;
        /**
         * 文件名
         */
        name?: string;
        /**
         * 文件路径
         */
        path?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mh/upload/merge',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取可用的评估模型列表。
     *
     * Returns:
     * dict: 评估模型列表。
     * 获取可用于评估的模型列表，需要登录
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getModelEvalutionAllModel(): CancelablePromise<{
        code?: number;
        /**
         * 模型列表
         */
        result?: Array<Record<string, any>>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/model_evalution/all_model',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取在线评估数据。
     *
     * Returns:
     * dict: 在线评估数据列表。
     * 获取可用的在线评估数据集列表，需要登录
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getModelEvalutionAllOnlineDatasets(): CancelablePromise<{
        code?: number;
        /**
         * 在线数据集列表
         */
        result?: Array<Record<string, any>>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/model_evalution/all_online_datasets',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建新的评估任务。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * name (str): 任务名称。
     * description (str, optional): 任务描述。
     * dataset_ids (list): 数据集ID列表。
     * model_ids (list): 模型ID列表。
     * evaluation_dimensions (list): 评估维度列表。
     *
     * Returns:
     * dict: 创建结果信息，包含任务ID。
     *
     * Raises:
     * ValueError: 当必要参数缺失时抛出异常。
     * 创建新的评估任务，支持人工测评和AI测评两种方式，需要登录和写入权限
     * @param requestBody
     * @returns any 创建成功
     * @throws ApiError
     */
    public static postModelEvalutionCreateTask(
        requestBody: {
            /**
             * AI评估器名称（当evaluation_method为ai时必填）
             */
            ai_evaluator_name?: string;
            /**
             * 数据集ID列表
             */
            dataset_id: Array<number>;
            /**
             * 评估维度列表
             */
            dimensions: Array<{
                ai_base_score?: number;
                dimension_description?: string;
                dimension_name?: string;
                options?: Array<{
                    option_description?: string;
                    value?: number;
                }>;
            }>;
            /**
             * 评估方法：manual（人工测评）/ai（AI测评）
             */
            evaluation_method: 'manual' | 'ai';
            /**
             * 评估类型：offline（离线）/online（在线）
             */
            evaluation_type: 'offline' | 'online';
            /**
             * 测评模型名称
             */
            model_name: string;
            /**
             * AI评估prompt（当evaluation_method为ai时可选，需包含{scene}、{scene_descrp}、{standard}、{instruction}、{output}、{response}占位符）
             */
            prompt?: string;
            /**
             * 任务名称
             */
            task_name: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/model_evalution/create_task',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除指定的评估任务。
     *
     * Args:
     * task_id (str): 评估任务ID。
     *
     * Returns:
     * dict: 删除结果信息。
     *
     * Raises:
     * ValueError: 当任务ID为空或任务不存在时抛出异常。
     * 删除指定的评估任务，需要登录和管理员权限
     * @param taskId 任务ID
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postModelEvalutionDeleteTask(
        taskId: number,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/model_evalution/delete_task/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 执行评估任务。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * task_id (str): 评估任务ID。
     * evaluation_data (list): 评估数据列表。
     *
     * Returns:
     * dict: 评估结果信息。
     *
     * Raises:
     * ValueError: 当必要参数缺失或任务不存在时抛出异常。
     * 提交评估结果，支持人工测评和AI测评，需要登录和管理员权限
     * @param requestBody
     * @returns any 提交成功
     * @throws ApiError
     */
    public static postModelEvalutionEvaluateSave(
        requestBody: {
            /**
             * 数据ID
             */
            data_id: number;
            /**
             * 评估数据列表
             */
            evaluations: Array<{
                /**
                 * 维度ID
                 */
                dimension_id?: number;
                /**
                 * 选项ID（人工测评）
                 */
                option_select_id?: number;
                /**
                 * 评分（AI测评）
                 */
                score?: number;
            }>;
            /**
             * 任务ID
             */
            task_id: number;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/model_evalution/evaluate_save',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取评估数据分页列表。
     *
     * Args:
     * task_id (str): 评估任务ID。
     * 通过URL参数传递：
     * page (int, optional): 页码，默认为1。
     * page_size (int, optional): 每页大小，默认为20。
     *
     * Returns:
     * dict: 分页结果，包含评估数据列表和分页信息。
     * 分页获取指定任务的评估数据，支持按选项筛选，需要登录
     * @param taskId 任务ID
     * @param page 页码
     * @param optionSelectId 选项ID（用于报告查看）
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getModelEvalutionEvaluationData(
        taskId: number,
        page?: number,
        optionSelectId?: number,
    ): CancelablePromise<{
        code?: number;
        /**
         * 评估数据分页结果
         */
        result?: Record<string, any>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/model_evalution/evaluation_data/{task_id}',
            path: {
                'task_id': taskId,
            },
            query: {
                'page': page,
                'option_select_id': optionSelectId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 下载指定类型的评估数据集模板。
     *
     * Args:
     * template_type (str): 模板类型。
     *
     * Returns:
     * Response: 模板文件下载响应。
     *
     * Raises:
     * ValueError: 当模板类型不支持时抛出异常。
     * 下载评估数据集的模板文件，支持xlsx、csv、json三种格式，不需要登录
     * @param templateType 模板类型：xlsx/csv/json
     * @returns binary 下载成功
     * @throws ApiError
     */
    public static getModelEvalutionEvaluationDatasettplDownload(
        templateType: 'xlsx' | 'csv' | 'json',
    ): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/model_evalution/evaluation_datasettpl_download/{template_type}',
            path: {
                'template_type': templateType,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 获取指定任务的评估总结信息。
     *
     * Args:
     * task_id (str): 评估任务ID。
     *
     * Returns:
     * dict: 评估总结信息。
     *
     * Raises:
     * ValueError: 当任务不存在时抛出异常。
     * 获取指定任务的评估总结信息，包括各维度的统计信息，需要登录
     * @param taskId 任务ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getModelEvalutionEvaluationSummary(
        taskId: number,
    ): CancelablePromise<{
        code?: number;
        result?: {
            /**
             * 创建者
             */
            created_by?: string;
            /**
             * 维度总结列表
             */
            dimensions?: Array<{
                /**
                 * 平均分
                 */
                average_score?: number;
                /**
                 * 维度名称
                 */
                dimension_name?: string;
                /**
                 * 指标列表（仅人工测评）
                 */
                indicators?: Array<{
                    name?: string;
                    option_id?: number;
                    percentage?: string;
                    score?: number;
                    total_score?: number;
                }>;
                /**
                 * 标准差
                 */
                std_dev?: number;
                /**
                 * 总分
                 */
                total_score?: number;
            }>;
            /**
             * 评估方法
             */
            evaluation_method?: string;
            /**
             * 任务进度
             */
            progress?: string;
            /**
             * 任务名称
             */
            task_name?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/model_evalution/evaluation_summary/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 下载评估任务的Excel报告。
     *
     * Args:
     * task_id (str): 评估任务ID。
     * 通过URL参数传递：
     * token (str, optional): 认证令牌。
     *
     * Returns:
     * Response: Excel文件下载响应。
     *
     * Raises:
     * ValueError: 当任务不存在或认证失败时抛出异常。
     * 下载评估任务的Excel报告文件，可通过token参数进行认证，不需要登录（通过token认证）
     * @param taskId 任务ID
     * @param token 认证令牌
     * @returns binary 下载成功
     * @throws ApiError
     */
    public static getModelEvalutionEvaluationSummaryDownload(
        taskId: number,
        token?: string,
    ): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/model_evalution/evaluation_summary_download/{task_id}',
            path: {
                'task_id': taskId,
            },
            query: {
                'token': token,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 获取指定任务的评估维度信息。
     *
     * Args:
     * task_id (str): 评估任务ID。
     *
     * Returns:
     * dict: 评估维度信息。
     *
     * Raises:
     * ValueError: 当任务不存在时抛出异常。
     * 获取指定任务的评估维度信息，包括维度选项，需要登录
     * @param taskId 任务ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getModelEvalutionGetEvaluationDimensions(
        taskId: number,
    ): CancelablePromise<{
        code?: number;
        /**
         * 评估维度列表
         */
        result?: Array<{
            /**
             * AI基础分值
             */
            ai_base_score?: number;
            /**
             * 维度描述
             */
            dimension_description?: string;
            /**
             * 维度名称
             */
            dimension_name?: string;
            /**
             * 维度ID
             */
            id?: number;
            /**
             * 维度选项列表
             */
            options?: Array<{
                /**
                 * 选项ID
                 */
                id?: number;
                /**
                 * 选项描述
                 */
                option_description?: string;
                /**
                 * 选项分值
                 */
                value?: number;
            }>;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/model_evalution/get_evaluation_dimensions/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取评估任务分页列表。
     *
     * Args:
     * 通过URL参数传递：
     * page (int, optional): 页码，默认为1。
     * page_size (int, optional): 每页大小，默认为20。
     *
     * Returns:
     * dict: 分页结果，包含任务列表和分页信息。
     * 分页获取评估任务列表，支持按关键词和查询类型筛选，需要登录
     * @param page 页码，从1开始
     * @param perPage 每页数量
     * @param keyword 搜索关键词
     * @param qtype 查询类型
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getModelEvalutionList(
        page: number = 1,
        perPage: number = 10,
        keyword?: string,
        qtype?: string,
    ): CancelablePromise<{
        code?: number;
        result?: {
            /**
             * 当前页码
             */
            current_page?: number;
            /**
             * 总页数
             */
            pages?: number;
            /**
             * 每页数量
             */
            per_page?: number;
            /**
             * 任务列表
             */
            tasks?: Array<{
                created_time?: string;
                /**
                 * 创建者
                 */
                creator?: string;
                /**
                 * 评估方法
                 */
                evaluation_method?: string;
                /**
                 * 任务ID
                 */
                id?: number;
                /**
                 * 模型名称
                 */
                model_name?: string;
                /**
                 * 任务名称
                 */
                name?: string;
                /**
                 * 任务进度
                 */
                process?: string;
                /**
                 * 任务状态
                 */
                status?: string;
                /**
                 * 任务状态（中文）
                 */
                status_zh?: string;
            }>;
            /**
             * 总记录数
             */
            total?: number;
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/model_evalution/list',
            query: {
                'page': page,
                'per_page': perPage,
                'keyword': keyword,
                'qtype': qtype,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取指定评估任务的详细信息。
     *
     * Args:
     * task_id (str): 评估任务ID。
     *
     * Returns:
     * dict: 任务详细信息。
     *
     * Raises:
     * ValueError: 当任务不存在时抛出异常。
     * 获取指定评估任务的详细信息，需要登录
     * @param taskId 任务ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getModelEvalutionTaskInfo(
        taskId: number,
    ): CancelablePromise<{
        code?: number;
        result?: {
            task_info?: {
                /**
                 * AI评估失败数
                 */
                ai_eva_fail?: number;
                /**
                 * AI评估成功数
                 */
                ai_eva_success?: number;
                /**
                 * AI评估器名称
                 */
                ai_evaluator_name?: string;
                created_time?: string;
                /**
                 * 评估方法（manual/ai）
                 */
                evaluation_method?: string;
                /**
                 * 任务ID
                 */
                id?: number;
                /**
                 * 模型名称
                 */
                model_name?: string;
                /**
                 * 任务名称
                 */
                name?: string;
                /**
                 * 任务进度
                 */
                process?: string;
                /**
                 * 任务状态
                 */
                status?: string;
                /**
                 * 任务状态（中文）
                 */
                status_zh?: string;
                /**
                 * 创建者用户名
                 */
                username?: string;
            };
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/model_evalution/task_info/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 上传评估数据集文件。
     *
     * Args:
     * 通过multipart/form-data传递参数：
     * files: 要上传的文件列表。
     *
     * Returns:
     * dict: 上传结果信息，包含数据集ID。
     *
     * Raises:
     * Exception: 当文件上传、解压或处理失败时抛出异常。
     * 上传评估数据集文件，支持格式：json、csv、xlsx、zip、tar.gz。单个文件最大1GB，需要登录
     * @param formData
     * @returns any 上传成功
     * @throws ApiError
     */
    public static postModelEvalutionUploadDataset(
        formData?: {
            /**
             * 要上传的文件列表，支持格式：json、csv、xlsx、zip、tar.gz。单个文件最大1GB
             */
            files: Blob;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
        result?: {
            /**
             * 数据集ID
             */
            dataset_id?: number;
        };
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/model_evalution/upload_dataset',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建新的通知。
     *
     * 创建包含用户通知和审批人通知的完整通知记录。
     *
     * Args:
     * module (str): 模块名称，如"quota_request"。
     * source_id (str): 源对象ID。
     * user_id (str): 用户ID。
     * user_body (str): 用户通知内容。
     * user_read (bool): 用户是否已读。
     * user_read_time (str): 用户阅读时间。
     * notify_user1_id (str): 通知用户1的ID。
     * notify_user1_body (str): 通知用户1的内容。
     * notify_user1_read (bool): 通知用户1是否已读。
     * notify_user1_read_time (str): 通知用户1的阅读时间。
     * notify_user2_id (str, optional): 通知用户2的ID。
     * notify_user2_body (str, optional): 通知用户2的内容。
     * notify_user2_read (bool, optional): 通知用户2是否已读。
     * notify_user2_read_time (str, optional): 通知用户2的阅读时间。
     * created_at (str): 创建时间。
     *
     * Returns:
     * dict: 创建的通知信息字典。
     *
     * Raises:
     * ValueError: 当必需参数缺失时。
     * Exception: 当创建通知失败时。
     * 创建新的通知，支持多用户通知场景，创建包含用户通知和审批人通知的完整通知记录，需要登录
     * @param requestBody 通知数据
     * @returns any 创建成功
     * @throws ApiError
     */
    public static postNotificationsCreate(
        requestBody: {
            /**
             * 创建时间
             */
            created_at?: string;
            /**
             * 模块名称，如"quota_request"
             */
            module: string;
            /**
             * 通知用户1的内容
             */
            notify_user1_body: string;
            /**
             * 通知用户1的ID
             */
            notify_user1_id: string;
            /**
             * 通知用户1是否已读
             */
            notify_user1_read?: boolean;
            /**
             * 通知用户1的阅读时间
             */
            notify_user1_read_time?: string;
            /**
             * 通知用户2的内容
             */
            notify_user2_body?: string;
            /**
             * 通知用户2的ID
             */
            notify_user2_id?: string;
            /**
             * 通知用户2是否已读
             */
            notify_user2_read?: boolean;
            /**
             * 通知用户2的阅读时间
             */
            notify_user2_read_time?: string;
            /**
             * 源对象ID
             */
            source_id: string;
            /**
             * 用户通知内容
             */
            user_body: string;
            /**
             * 用户ID
             */
            user_id: string;
            /**
             * 用户是否已读
             */
            user_read?: boolean;
            /**
             * 用户阅读时间
             */
            user_read_time?: string;
        },
    ): CancelablePromise<{
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 通知ID
         */
        id?: string;
        /**
         * 消息所属模块
         */
        module?: string;
        /**
         * 通知人1消息体
         */
        notify_user1_body?: string;
        /**
         * 通知人1的ID
         */
        notify_user1_id?: string;
        /**
         * 通知人1是否已读
         */
        notify_user1_read?: boolean;
        /**
         * 通知人1已读时间
         */
        notify_user1_read_time?: string;
        /**
         * 通知人2消息体
         */
        notify_user2_body?: string;
        /**
         * 通知人2的ID
         */
        notify_user2_id?: string;
        /**
         * 通知人2是否已读
         */
        notify_user2_read?: boolean;
        /**
         * 通知人2已读时间
         */
        notify_user2_read_time?: string;
        /**
         * 来源ID
         */
        source_id?: string;
        /**
         * 用户回执消息体
         */
        user_body?: string;
        /**
         * 用户ID
         */
        user_id?: string;
        /**
         * 用户是否已读回执消息
         */
        user_read?: boolean;
        /**
         * 用户已读回执时间
         */
        user_read_time?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/notifications/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取通知详情。
     *
     * 获取指定通知的详细信息。
     *
     * Args:
     * notification_id (str): 通知ID，通过查询参数传递。
     *
     * Returns:
     * dict: 通知详细信息字典。
     *
     * Raises:
     * ValueError: 当通知ID缺失或无权限查看时。
     * Exception: 当获取通知详情失败时。
     * 获取指定通知的详细信息，只有管理员或通知所属用户才能查看，需要登录
     * @param notificationId 通知ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getNotificationsDetail(
        notificationId: string,
    ): CancelablePromise<{
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 通知ID
         */
        id?: string;
        /**
         * 消息所属模块
         */
        module?: string;
        /**
         * 通知人1消息体
         */
        notify_user1_body?: string;
        /**
         * 通知人1的ID
         */
        notify_user1_id?: string;
        /**
         * 通知人1是否已读
         */
        notify_user1_read?: boolean;
        /**
         * 通知人1已读时间
         */
        notify_user1_read_time?: string;
        /**
         * 通知人2消息体
         */
        notify_user2_body?: string;
        /**
         * 通知人2的ID
         */
        notify_user2_id?: string;
        /**
         * 通知人2是否已读
         */
        notify_user2_read?: boolean;
        /**
         * 通知人2已读时间
         */
        notify_user2_read_time?: string;
        /**
         * 来源ID
         */
        source_id?: string;
        /**
         * 用户回执消息体
         */
        user_body?: string;
        /**
         * 用户ID
         */
        user_id?: string;
        /**
         * 用户是否已读回执消息
         */
        user_read?: boolean;
        /**
         * 用户已读回执时间
         */
        user_read_time?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/notifications/detail',
            query: {
                'notification_id': notificationId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 获取通知列表。
     *
     * 支持分页、所有字段过滤、时间区间过滤的消息列表查询。
     *
     * Args:
     * page (int, optional): 页码，默认为1。
     * page_size (int, optional): 每页数量，默认为100。
     * created_at_start (str, optional): 创建时间开始。
     * created_at_end (str, optional): 创建时间结束。
     * user_read (bool, optional): 用户是否已读过滤。
     * **filters: 其他过滤条件。
     *
     * Returns:
     * dict: 包含通知列表和分页信息的字典。
     *
     * Raises:
     * Exception: 当查询失败时。
     * 支持分页、所有字段过滤、时间区间过滤的消息列表查询，需要登录
     * @param requestBody 查询参数
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postNotificationsList(
        requestBody?: {
            /**
             * 创建时间结束
             */
            created_at_end?: string;
            /**
             * 创建时间开始
             */
            created_at_start?: string;
            /**
             * 模块名称过滤
             */
            module?: string;
            /**
             * 页码，从 1 开始
             */
            page?: number;
            /**
             * 每页数量
             */
            page_size?: number;
            /**
             * 来源ID过滤
             */
            source_id?: string;
            /**
             * 用户是否已读过滤
             */
            user_read?: boolean;
        },
    ): CancelablePromise<{
        /**
         * 通知列表
         */
        items?: Array<{
            /**
             * 创建时间
             */
            created_at?: string;
            /**
             * 通知ID
             */
            id?: string;
            /**
             * 消息所属模块
             */
            module?: string;
            /**
             * 通知人1消息体
             */
            notify_user1_body?: string;
            /**
             * 通知人1的ID
             */
            notify_user1_id?: string;
            /**
             * 通知人1是否已读
             */
            notify_user1_read?: boolean;
            /**
             * 通知人1已读时间
             */
            notify_user1_read_time?: string;
            /**
             * 通知人2消息体
             */
            notify_user2_body?: string;
            /**
             * 通知人2的ID
             */
            notify_user2_id?: string;
            /**
             * 通知人2是否已读
             */
            notify_user2_read?: boolean;
            /**
             * 通知人2已读时间
             */
            notify_user2_read_time?: string;
            /**
             * 来源ID
             */
            source_id?: string;
            /**
             * 用户回执消息体
             */
            user_body?: string;
            /**
             * 用户ID
             */
            user_id?: string;
            /**
             * 用户是否已读回执消息
             */
            user_read?: boolean;
            /**
             * 用户已读回执时间
             */
            user_read_time?: string;
        }>;
        /**
         * 当前页码
         */
        page?: number;
        /**
         * 每页数量
         */
        page_size?: number;
        /**
         * 总页数
         */
        pages?: number;
        /**
         * 总记录数
         */
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/notifications/list',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 标记通知为已读。
     *
     * 通过通知ID和用户ID将通知标记为已读。
     *
     * Args:
     * notification_id (str): 通知ID。
     *
     * Returns:
     * dict: 更新后的通知信息字典。
     *
     * Raises:
     * ValueError: 当通知ID为空时。
     * Exception: 当标记已读失败时。
     * 通过通知ID和用户ID将通知标记为已读，需要登录
     * @param requestBody 标记参数
     * @returns any 标记成功
     * @throws ApiError
     */
    public static postNotificationsRead(
        requestBody: {
            /**
             * 通知ID
             */
            notification_id: string;
        },
    ): CancelablePromise<{
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 通知ID
         */
        id?: string;
        /**
         * 消息所属模块
         */
        module?: string;
        /**
         * 通知人1消息体
         */
        notify_user1_body?: string;
        /**
         * 通知人1的ID
         */
        notify_user1_id?: string;
        /**
         * 通知人1是否已读
         */
        notify_user1_read?: boolean;
        /**
         * 通知人1已读时间
         */
        notify_user1_read_time?: string;
        /**
         * 通知人2消息体
         */
        notify_user2_body?: string;
        /**
         * 通知人2的ID
         */
        notify_user2_id?: string;
        /**
         * 通知人2是否已读
         */
        notify_user2_read?: boolean;
        /**
         * 通知人2已读时间
         */
        notify_user2_read_time?: string;
        /**
         * 来源ID
         */
        source_id?: string;
        /**
         * 用户回执消息体
         */
        user_body?: string;
        /**
         * 用户ID
         */
        user_id?: string;
        /**
         * 用户是否已读回执消息
         */
        user_read?: boolean;
        /**
         * 用户已读回执时间
         */
        user_read_time?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/notifications/read',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建新脚本。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * name (str): 脚本名称。
     * description (str, optional): 脚本描述。
     * icon (str, optional): 脚本图标，默认为"/app/upload/script.jpg"。
     * script_url (str, optional): 脚本URL。
     * script_type (str, optional): 脚本类型。
     * data_type (str, optional): 数据类型。
     *
     * Returns:
     * dict: 创建的脚本信息。
     *
     * Raises:
     * ValueError: 当缺少必要参数时抛出异常。
     * 创建新的脚本
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postScriptCreate(
        requestBody: {
            /**
             * 数据类型
             */
            data_type?: 'doc' | 'pic';
            /**
             * 脚本描述
             */
            description?: string;
            /**
             * 脚本图标
             */
            icon?: string;
            /**
             * 脚本名称
             */
            name: string;
            /**
             * 脚本类型
             */
            script_type?: string;
            /**
             * 脚本URL
             */
            script_url?: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/script/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除指定脚本。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * script_id (int): 脚本ID。
     *
     * Returns:
     * tuple: (响应数据, HTTP状态码)
     *
     * Raises:
     * ValueError: 当脚本ID为空时抛出异常。
     * 删除指定的脚本
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postScriptDelete(
        requestBody: {
            /**
             * 脚本ID
             */
            script_id: number;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/script/delete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取脚本分页列表。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * page (int, optional): 页码，默认为1。
     * page_size (int, optional): 每页大小，默认为20。
     * script_type (list, optional): 脚本类型列表。
     * name (str, optional): 脚本名称。
     * qtype (str, optional): 查询类型，默认为"already"。
     * search_tags (list, optional): 搜索标签列表。
     * search_name (str, optional): 搜索名称。
     * user_id (list, optional): 用户ID列表。
     *
     * Returns:
     * dict: 分页结果，包含脚本列表和分页信息。
     * 获取脚本分页列表，支持按脚本类型、名称、标签等条件筛选
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postScriptList(
        requestBody: {
            /**
             * 脚本名称
             */
            name?: string;
            /**
             * 页码，从1开始
             */
            page?: number;
            /**
             * 每页大小
             */
            page_size?: number;
            /**
             * 查询类型
             */
            qtype?: string;
            /**
             * 脚本类型列表
             */
            script_type?: Array<string>;
            /**
             * 搜索名称
             */
            search_name?: string;
            /**
             * 搜索标签列表
             */
            search_tags?: Array<string>;
            /**
             * 用户ID列表
             */
            user_id?: Array<string>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/script/list',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 根据脚本类型获取脚本列表。
     *
     * Args:
     * 通过URL参数传递：
     * script_type (str): 脚本类型。
     *
     * Returns:
     * list: 指定类型的脚本列表。
     * 根据脚本类型获取脚本列表
     * @param scriptType 脚本类型
     * @returns any 成功
     * @throws ApiError
     */
    public static getScriptListByType(
        scriptType?: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/script/list_by_type',
            query: {
                'script_type': scriptType,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 更新指定脚本信息。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * script_id (int): 脚本ID。
     * name (str, optional): 脚本名称。
     * description (str, optional): 脚本描述。
     * icon (str, optional): 脚本图标。
     * script_url (str, optional): 脚本URL。
     * script_type (str, optional): 脚本类型。
     * data_type (str, optional): 数据类型。
     *
     * Returns:
     * dict: 更新后的脚本信息。
     *
     * Raises:
     * ValueError: 当脚本ID为空时抛出异常。
     * 更新指定脚本的信息
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postScriptUpdate(
        requestBody: {
            /**
             * 数据类型
             */
            data_type?: 'doc' | 'pic';
            /**
             * 脚本描述
             */
            description?: string;
            /**
             * 脚本图标
             */
            icon?: string;
            /**
             * 脚本名称
             */
            name?: string;
            /**
             * 脚本ID
             */
            script_id: number;
            /**
             * 脚本类型
             */
            script_type?: string;
            /**
             * 脚本URL
             */
            script_url?: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/script/update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 上传脚本文件。
     *
     * Args:
     * 通过multipart/form-data传递参数：
     * file: 上传的脚本文件，必须是.py格式。
     *
     * Returns:
     * dict: 上传结果信息。
     *
     * Raises:
     * ValueError: 当没有上传文件、文件类型不支持或上传多个文件时抛出异常。
     * 上传脚本文件（.py格式），文件大小不能超过1MB
     * @param formData
     * @returns any 成功
     * @throws ApiError
     */
    public static postScriptUpload(
        formData?: {
            /**
             * 脚本文件（.py格式）
             */
            file: Blob;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/script/upload',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查询标签列表。
     *
     * 根据指定的标签类型和可选的关键词查询标签列表。
     *
     * Args:
     * type (str): 标签类型，必填，必须是预定义的标签类型之一。
     * keyword (str, optional): 搜索关键词，默认为空字符串。
     *
     * Returns:
     * list: 包含标签信息的列表。
     *
     * Raises:
     * ValueError: 当标签类型不在允许的选项中时抛出。
     * 根据标签类型和关键词查询标签列表
     * @param type 标签类型，必填
     * @param keyword 搜索关键词，可选
     * @returns any 成功
     * @throws ApiError
     */
    public static getTags(
        type: 'knowledgebase' | 'app' | 'model' | 'tool' | 'prompt' | 'dataset' | 'script' | 'mcp',
        keyword: string = '',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tags',
            query: {
                'type': type,
                'keyword': keyword,
            },
            errors: {
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 更新关系
     * 更新目标对象与标签的绑定关系
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postTagsBindingsUpdate(
        requestBody: {
            /**
             * 标签名称列表
             */
            tag_names: Array<string>;
            /**
             * 目标对象ID
             */
            target_id: string;
            /**
             * 标签类型
             */
            type: 'knowledgebase' | 'app' | 'model' | 'tool' | 'prompt' | 'dataset' | 'script' | 'mcp';
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tags/bindings/update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建内置标签。
     *
     * 创建一个新的内置标签，只有超级用户可以执行此操作。
     *
     * Args:
     * name (str): 标签名称，必填。
     * type (str): 标签类型，必填，必须是预定义的标签类型之一。
     *
     * Returns:
     * dict: 包含新创建标签的id、name、type信息的字典。
     *
     * Raises:
     * ValueError: 当参数错误或标签类型不合法时抛出。
     * PermissionError: 当用户不是超级用户时抛出。
     * 创建一个新的内置标签，只有超级用户可以执行此操作
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postTagsCreate(
        requestBody: {
            /**
             * 标签名称
             */
            name: string;
            /**
             * 标签类型
             */
            type: 'knowledgebase' | 'app' | 'model' | 'tool' | 'prompt' | 'dataset' | 'script' | 'mcp';
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tags/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除标签
     * 删除指定的标签
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postTagsDelete(
        requestBody: {
            /**
             * 标签名称
             */
            name: string;
            /**
             * 标签类型
             */
            type: 'knowledgebase' | 'app' | 'model' | 'tool' | 'prompt' | 'dataset' | 'script' | 'mcp';
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tags/delete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 授权回调
     * 处理OAuth授权回调，不需要登录
     * @param code 授权码
     * @param state 状态
     * @returns any 授权成功
     * @throws ApiError
     */
    public static getToolAuth(
        code?: string,
        state?: string,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tool/auth',
            query: {
                'code': code,
                'state': state,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 授权分享
     * 设置工具的授权分享状态，需要登录和写入权限
     * @param requestBody 分享参数
     * @returns any 操作成功
     * @throws ApiError
     */
    public static postToolAuthShare(
        requestBody: {
            /**
             * 分享状态
             */
            share_status: boolean;
            /**
             * 工具ID
             */
            tool_id: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/auth_share',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 发布工具
     * 取消工具的发布状态，需要登录和写入权限
     * @param requestBody 工具ID
     * @returns any 操作成功
     * @throws ApiError
     */
    public static postToolCancelPublish(
        requestBody: {
            /**
             * 工具ID
             */
            id: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/cancel_publish',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 检查名字重复
     * 验证指定的工具名称是否已经被使用，需要登录
     * @param requestBody 检查参数
     * @returns any 名称可用
     * @throws ApiError
     */
    public static postToolCheckName(
        requestBody: {
            /**
             * 要检查的工具名称
             */
            name: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/check_name',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 复制一份新的工具
     * 复制一份新的工具，需要登录和读取权限
     * @param requestBody 工具ID
     * @returns any 复制成功
     * @throws ApiError
     */
    public static postToolCopyTool(
        requestBody: {
            /**
             * 工具ID
             */
            id: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/copy_tool',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * field部分的页面编辑(API+IDE两种模式都有，每次都是新增数据)
     * 创建或更新工具的字段（API+IDE两种模式都有），每次都是新增数据，需要登录和写入权限
     * @param requestBody 工具字段数据
     * @returns any 操作成功
     * @throws ApiError
     */
    public static postToolCreateUpdateField(
        requestBody: {
            /**
             * 工具字段列表
             */
            fields: Array<{
                /**
                 * 默认值
                 */
                default_value?: string;
                /**
                 * 字段描述
                 */
                description?: string;
                /**
                 * 字段格式
                 */
                field_format?: string;
                /**
                 * 字段类型
                 */
                field_type?: string;
                /**
                 * 带入方法
                 */
                field_use_model?: string;
                /**
                 * 字段ID，如果提供则进行更新
                 */
                id?: number;
                /**
                 * 字段名称
                 */
                name?: string;
                /**
                 * 是否必填
                 */
                required?: boolean;
                /**
                 * 工具ID
                 */
                tool_id?: string;
                /**
                 * 是否可见
                 */
                visible?: boolean;
            }>;
        },
    ): CancelablePromise<{
        /**
         * 保存错误
         */
        save_error?: string;
        /**
         * 成功保存的字段列表
         */
        save_success_field?: Array<Record<string, any>>;
        /**
         * 更新错误
         */
        update_error?: string;
        /**
         * 成功更新的字段列表
         */
        update_success_field?: Array<Record<string, any>>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/create_update_field',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建与更新工具
     * 根据传入的数据创建新的工具或更新已存在的工具。如果数据中包含id字段则进行更新，否则创建新工具，需要登录和写入权限
     * @param requestBody 工具数据
     * @returns any 创建或更新成功
     * @throws ApiError
     */
    public static postToolCreateUpdateTool(
        requestBody: {
            /**
             * 工具描述
             */
            description?: string;
            /**
             * 工具图标
             */
            icon?: string;
            /**
             * 工具ID，如果提供则进行更新
             */
            id?: string;
            /**
             * 工具名称（必需）
             */
            name: string;
            /**
             * 工具IDE代码
             */
            tool_ide_code?: string;
            /**
             * 工具IDE代码类型
             */
            tool_ide_code_type?: string;
            /**
             * 工具类别
             */
            tool_kind?: string;
            /**
             * 工具模式：API 或 IDE
             */
            tool_mode?: 'API' | 'IDE';
            /**
             * 工具类型
             */
            tool_type?: '官方内置' | '自定义';
        },
    ): CancelablePromise<{
        /**
         * 是否授权 0-默认值 1-授权 2-未授权 3已过期
         */
        auth?: number;
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 工具描述
         */
        description?: string;
        /**
         * 是否启用
         */
        enable?: boolean;
        /**
         * 工具图标
         */
        icon?: string;
        /**
         * 工具ID
         */
        id?: string;
        /**
         * 工具名称
         */
        name?: string;
        /**
         * 是否展示共享按钮
         */
        need_share?: boolean;
        /**
         * 是否发布
         */
        publish?: boolean;
        /**
         * 发布时间
         */
        publish_at?: string;
        /**
         * 发布类型
         */
        publish_type?: string;
        /**
         * 引用状态
         */
        ref_status?: boolean;
        /**
         * 共享状态
         */
        share?: boolean;
        /**
         * 标签列表
         */
        tags?: Array<string>;
        /**
         * 测试状态
         */
        test_state?: string;
        /**
         * 工具API ID
         */
        tool_api_id?: string;
        /**
         * 工具字段输入ID列表
         */
        tool_field_input_ids?: Array<number>;
        /**
         * 工具字段输出ID列表
         */
        tool_field_output_ids?: Array<number>;
        /**
         * 工具IDE代码
         */
        tool_ide_code?: string;
        /**
         * 工具IDE代码类型
         */
        tool_ide_code_type?: string;
        /**
         * 工具类别
         */
        tool_kind?: string;
        /**
         * 工具模式
         */
        tool_mode?: string;
        /**
         * 工具类型
         */
        tool_type?: string;
        /**
         * 更新时间
         */
        updated_at?: string;
        /**
         * 用户ID
         */
        user_id?: string;
        /**
         * 用户名
         */
        user_name?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/create_update_tool',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除授权
     * 删除工具的用户授权，需要登录和写入权限
     * @param requestBody 授权参数
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postToolDeleteAuthByUser(
        requestBody: {
            /**
             * 工具ID
             */
            tool_id: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/delete_auth_by_user',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除工具
     * 删除指定的工具，需要登录和管理员权限
     * @param requestBody 工具ID
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postToolDeleteTool(
        requestBody: {
            /**
             * 工具ID
             */
            id: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/delete_tool',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 启用工具
     * 设置工具的启用状态，需要登录和写入权限
     * @param requestBody 启用参数
     * @returns any 操作成功
     * @throws ApiError
     */
    public static postToolEnableTool(
        requestBody: {
            /**
             * 是否启用工具
             */
            enable: boolean;
            /**
             * 工具ID
             */
            id: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/enable_tool',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 导出文件
     * 导出工具为JSON格式，支持直接返回JSON或下载文件，需要登录和读取权限
     * @param id 工具ID
     * @param format 导出格式：json 或 file
     * @returns any 导出成功
     * @throws ApiError
     */
    public static getToolExport(
        id: number,
        format?: string,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tool/export',
            query: {
                'id': id,
                'format': format,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取工具分页列表。
     *
     * 根据传入的查询条件获取工具的分页列表，支持按工具类型、发布状态、
     * 启用状态、标签、名称等条件进行筛选。
     *
     * Args:
     * page (int, optional): 页码，默认为1。
     * page_size (int, optional): 每页大小，默认为20。
     * tool_type (str, optional): 工具类型，默认为空字符串。
     * published (list, optional): 发布状态列表。
     * enabled (list, optional): 启用状态列表。
     * qtype (str, optional): 查询类型，可选值：mine/group/builtin/already，默认为already。
     * search_tags (list, optional): 搜索标签列表，默认为空列表。
     * search_name (str, optional): 搜索名称，默认为空字符串。
     * tool_mode (list, optional): 工具模式列表，默认为空列表。
     * user_id (list, optional): 用户ID列表，默认为空列表。
     *
     * Returns:
     * dict: 包含工具分页信息的字典。
     *
     * Raises:
     * ValueError: 当请求参数不合法时抛出。
     * 根据传入的查询条件获取工具的分页列表，支持按工具类型、发布状态、启用状态、标签、名称等条件进行筛选，需要登录
     * @param requestBody 查询参数
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postToolList(
        requestBody?: {
            /**
             * 启用状态列表
             */
            enabled?: Array<boolean>;
            /**
             * 是否为草稿
             */
            is_draft?: boolean;
            /**
             * 页码，从 1 开始
             */
            page?: number;
            /**
             * 每页大小
             */
            page_size?: number;
            /**
             * 发布状态列表
             */
            published?: Array<boolean>;
            /**
             * 查询类型：mine(我的)、group(组)、builtin(内置)、already(已有)
             */
            qtype?: 'mine' | 'group' | 'builtin' | 'already';
            /**
             * 名称搜索条件
             */
            search_name?: string;
            /**
             * 标签搜索条件
             */
            search_tags?: Array<string>;
            /**
             * 工具模式列表
             */
            tool_mode?: Array<string>;
            /**
             * 工具类型
             */
            tool_type?: string;
            /**
             * 用户ID列表
             */
            user_id?: Array<string>;
        },
    ): CancelablePromise<{
        /**
         * 工具列表
         */
        data?: Array<{
            /**
             * 是否授权 0-默认值 1-授权 2-未授权 3已过期
             */
            auth?: number;
            /**
             * 创建时间
             */
            created_at?: string;
            /**
             * 工具描述
             */
            description?: string;
            /**
             * 是否启用
             */
            enable?: boolean;
            /**
             * 工具图标
             */
            icon?: string;
            /**
             * 工具ID
             */
            id?: string;
            /**
             * 工具名称
             */
            name?: string;
            /**
             * 是否展示共享按钮
             */
            need_share?: boolean;
            /**
             * 是否发布
             */
            publish?: boolean;
            /**
             * 发布时间
             */
            publish_at?: string;
            /**
             * 发布类型
             */
            publish_type?: string;
            /**
             * 引用状态
             */
            ref_status?: boolean;
            /**
             * 共享状态
             */
            share?: boolean;
            /**
             * 标签列表
             */
            tags?: Array<string>;
            /**
             * 测试状态
             */
            test_state?: string;
            /**
             * 工具API ID
             */
            tool_api_id?: string;
            /**
             * 工具字段输入ID列表
             */
            tool_field_input_ids?: Array<number>;
            /**
             * 工具字段输出ID列表
             */
            tool_field_output_ids?: Array<number>;
            /**
             * 工具IDE代码
             */
            tool_ide_code?: string;
            /**
             * 工具IDE代码类型
             */
            tool_ide_code_type?: string;
            /**
             * 工具类别
             */
            tool_kind?: string;
            /**
             * 工具模式
             */
            tool_mode?: string;
            /**
             * 工具类型
             */
            tool_type?: string;
            /**
             * 更新时间
             */
            updated_at?: string;
            /**
             * 用户ID
             */
            user_id?: string;
            /**
             * 用户名
             */
            user_name?: string;
        }>;
        /**
         * 是否有更多数据
         */
        has_more?: boolean;
        /**
         * 当前页码
         */
        page?: number;
        /**
         * 每页数量
         */
        page_size?: number;
        /**
         * 总记录数
         */
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/list',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 发布工具
     * 将工具发布为可用状态，支持不同的发布类型，需要登录和写入权限
     * @param requestBody 发布参数
     * @returns any 发布成功
     * @throws ApiError
     */
    public static postToolPublishTool(
        requestBody: {
            /**
             * 工具ID
             */
            id: string;
            /**
             * 发布类型：预发布 或 正式发布
             */
            publish_type?: '预发布' | '正式发布';
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/publish_tool',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取工具引用结果
     * 获取引用指定工具的应用列表，不需要登录
     * @param id 工具ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getToolReferenceResult(
        id: number,
    ): CancelablePromise<Array<{
        /**
         * 应用ID
         */
        id?: string;
        /**
         * 是否公开
         */
        is_public?: boolean;
        /**
         * 应用名称
         */
        name?: string;
    }>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tool/reference-result',
            query: {
                'id': id,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 生成授权URL
     * 生成对应的授权URL，需要登录和写入权限
     * @param requestBody 授权参数
     * @returns any 生成成功
     * @throws ApiError
     */
    public static postToolReturnAuthUrl(
        requestBody: {
            /**
             * 工具ID
             */
            tool_id: string;
        },
    ): CancelablePromise<{
        /**
         * 授权URL
         */
        url?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/return_auth_url',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 测试工具日志
     * 测试工具日志功能，需要登录和写入权限
     * @param requestBody 工具ID
     * @returns any 操作成功
     * @throws ApiError
     */
    public static postToolTest(
        requestBody: {
            /**
             * 工具ID
             */
            id: string;
        },
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/test',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 测试工具
     * 使用指定的参数测试工具的功能，需要登录和写入权限，需要启用工具运行功能
     * @param requestBody 测试参数
     * @returns any 测试成功
     * @throws ApiError
     */
    public static postToolTestTool(
        requestBody: {
            /**
             * 工具ID
             */
            id: string;
            /**
             * 输入参数
             */
            input?: Record<string, any>;
            /**
             * 代码变量
             */
            vars_for_code?: Record<string, any>;
        },
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/test_tool',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 工具详情
     * 根据工具ID获取工具的详细信息，需要登录
     * @param toolId 工具ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getToolToolApi(
        toolId: string,
    ): CancelablePromise<{
        /**
         * 是否授权 0-默认值 1-授权 2-未授权 3已过期
         */
        auth?: number;
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 工具描述
         */
        description?: string;
        /**
         * 是否启用
         */
        enable?: boolean;
        /**
         * 工具图标
         */
        icon?: string;
        /**
         * 工具ID
         */
        id?: string;
        /**
         * 工具名称
         */
        name?: string;
        /**
         * 是否展示共享按钮
         */
        need_share?: boolean;
        /**
         * 是否发布
         */
        publish?: boolean;
        /**
         * 发布时间
         */
        publish_at?: string;
        /**
         * 发布类型
         */
        publish_type?: string;
        /**
         * 引用状态
         */
        ref_status?: boolean;
        /**
         * 共享状态
         */
        share?: boolean;
        /**
         * 标签列表
         */
        tags?: Array<string>;
        /**
         * 测试状态
         */
        test_state?: string;
        /**
         * 工具API ID
         */
        tool_api_id?: string;
        /**
         * 工具字段输入ID列表
         */
        tool_field_input_ids?: Array<number>;
        /**
         * 工具字段输出ID列表
         */
        tool_field_output_ids?: Array<number>;
        /**
         * 工具IDE代码
         */
        tool_ide_code?: string;
        /**
         * 工具IDE代码类型
         */
        tool_ide_code_type?: string;
        /**
         * 工具类别
         */
        tool_kind?: string;
        /**
         * 工具模式
         */
        tool_mode?: string;
        /**
         * 工具类型
         */
        tool_type?: string;
        /**
         * 更新时间
         */
        updated_at?: string;
        /**
         * 用户ID
         */
        user_id?: string;
        /**
         * 用户名
         */
        user_name?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tool/tool_api',
            query: {
                'tool_id': toolId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * HTTP部分的数据详情
     * 获取工具的HTTP API配置详情，需要登录
     * @param apiId API ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getToolToolApiInfo(
        apiId?: number,
    ): CancelablePromise<{
        /**
         * API密钥
         */
        api_key?: string;
        /**
         * 受众
         */
        audience?: string;
        /**
         * 认证方法
         */
        auth_method?: string;
        /**
         * 授权内容类型
         */
        authorization_content_type?: string;
        /**
         * 授权URL
         */
        authorization_url?: string;
        /**
         * 客户端ID
         */
        client_id?: string;
        /**
         * 客户端密钥
         */
        client_secret?: string;
        /**
         * 客户端URL
         */
        client_url?: string;
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 端点URL
         */
        endpoint_url?: string;
        /**
         * 授权类型
         */
        grant_type?: string;
        /**
         * 请求头
         */
        header?: Record<string, any>;
        /**
         * API ID
         */
        id?: string;
        /**
         * 位置
         */
        location?: string;
        /**
         * 参数名
         */
        param_name?: string;
        /**
         * 请求类型
         */
        request_type?: string;
        /**
         * 作用域
         */
        scope?: string;
        /**
         * 更新时间
         */
        updated_at?: string;
        /**
         * URL
         */
        url?: string;
        /**
         * 用户ID
         */
        user_id?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tool/tool_api_info',
            query: {
                'api_id': apiId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * field部分的数据详情(API+IDE两种模式都有)
     * 获取工具字段的数据详情（API+IDE两种模式都有），需要登录和写入权限
     * @param requestBody 查询参数
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postToolToolFields(
        requestBody?: {
            /**
             * 字段ID列表
             */
            fields?: Array<number>;
        },
    ): CancelablePromise<{
        /**
         * 工具字段列表
         */
        data?: Array<Record<string, any>>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/tool_fields',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * HTTP部分的页面编辑(每次都是新增就很诡异)
     * 创建或更新工具的HTTP API配置，需要登录和写入权限
     * @param requestBody API数据
     * @returns any 操作成功
     * @throws ApiError
     */
    public static postToolUpsertToolApi(
        requestBody: {
            /**
             * API密钥
             */
            api_key?: string;
            /**
             * 认证方法
             */
            auth_method?: string;
            /**
             * 请求头
             */
            header?: Record<string, any>;
            /**
             * API ID，如果提供则进行更新
             */
            id?: string;
            /**
             * 请求类型
             */
            request_type?: string;
            /**
             * 工具ID
             */
            tool_id?: string;
            /**
             * URL
             */
            url?: string;
        },
    ): CancelablePromise<{
        /**
         * API密钥
         */
        api_key?: string;
        /**
         * 受众
         */
        audience?: string;
        /**
         * 认证方法
         */
        auth_method?: string;
        /**
         * 授权内容类型
         */
        authorization_content_type?: string;
        /**
         * 授权URL
         */
        authorization_url?: string;
        /**
         * 客户端ID
         */
        client_id?: string;
        /**
         * 客户端密钥
         */
        client_secret?: string;
        /**
         * 客户端URL
         */
        client_url?: string;
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 端点URL
         */
        endpoint_url?: string;
        /**
         * 授权类型
         */
        grant_type?: string;
        /**
         * 请求头
         */
        header?: Record<string, any>;
        /**
         * API ID
         */
        id?: string;
        /**
         * 位置
         */
        location?: string;
        /**
         * 参数名
         */
        param_name?: string;
        /**
         * 请求类型
         */
        request_type?: string;
        /**
         * 作用域
         */
        scope?: string;
        /**
         * 更新时间
         */
        updated_at?: string;
        /**
         * URL
         */
        url?: string;
        /**
         * 用户ID
         */
        user_id?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tool/upsert_tool_api',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查看用户加入的租户。
     *
     * Returns:
     * dict: 用户加入的租户列表
     * 查看用户加入的租户，需要登录
     * @param accountId 账户ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesAccountTenants(
        accountId: string,
    ): CancelablePromise<{
        /**
         * 租户列表
         */
        tenants?: Array<{
            /**
             * 创建时间
             */
            created_at?: number;
            /**
             * 是否为当前租户
             */
            current?: boolean;
            /**
             * 是否启用AI
             */
            enable_ai?: boolean;
            /**
             * GPU配额
             */
            gpu_quota?: number;
            /**
             * 已使用GPU
             */
            gpu_used?: number;
            /**
             * 是否有资产
             */
            has_assets?: boolean;
            /**
             * 租户ID
             */
            id?: string;
            /**
             * 租户名称
             */
            name?: string;
            /**
             * 角色
             */
            role?: string;
            /**
             * 状态
             */
            status?: string;
            /**
             * 存储配额
             */
            storage_quota?: number;
            /**
             * 已使用存储
             */
            storage_used?: number;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/account/tenants',
            query: {
                'account_id': accountId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 添加租户。
     *
     * Returns:
     * dict: 创建的租户信息
     * 创建新的租户，需要登录和写入权限
     * @param requestBody 租户数据
     * @returns any 创建成功
     * @throws ApiError
     */
    public static postWorkspacesAdd(
        requestBody: {
            /**
             * 租户名称
             */
            name: string;
        },
    ): CancelablePromise<{
        /**
         * 创建时间
         */
        created_at?: number;
        /**
         * 是否为当前租户
         */
        current?: boolean;
        /**
         * 是否启用AI
         */
        enable_ai?: boolean;
        /**
         * GPU配额
         */
        gpu_quota?: number;
        /**
         * 已使用GPU
         */
        gpu_used?: number;
        /**
         * 是否有资产
         */
        has_assets?: boolean;
        /**
         * 租户ID
         */
        id?: string;
        /**
         * 租户名称
         */
        name?: string;
        /**
         * 角色
         */
        role?: string;
        /**
         * 状态
         */
        status?: string;
        /**
         * 存储配额
         */
        storage_quota?: number;
        /**
         * 已使用存储
         */
        storage_used?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/add',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取租户的AI能力配置。
     *
     * 该函数用于获取租户的AI工具配置信息。
     *
     * Args:
     * 无直接参数。请求体中应包含以下JSON字段：
     * tenant_id (str): 租户ID，选填，为空就代表设定当前租户。
     *
     * Returns:
     * - 若成功，返回({"message": "success", "code": 200, "data": 数据}, 200)
     * 获取租户的AI能力配置，需要登录
     * @param tenantId 租户ID，为空则使用当前租户
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesAiToolList(
        tenantId?: string,
    ): CancelablePromise<{
        code?: number;
        /**
         * JSON格式的配置数据
         */
        data?: string;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/ai-tool/list',
            query: {
                'tenant_id': tenantId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 设置租户的AI能力配置。
     *
     * 该函数用于批量更新指定租户的AI工具配置信息。首先删除该租户现有的所有AI工具配置，
     * 然后根据提供的数据创建新的AI工具配置记录。
     *
     * Args:
     * 无直接参数。请求体中应包含以下JSON字段：
     * data (list): AI工具配置数据列表，必填。
     * tenant_id (str): 租户ID，必填。
     *
     * Returns:
     * - 若成功，返回({"message": "success", "code": 200}, 200)
     * - 若失败，返回({"message": 错误信息, "code": 400}, 400)
     *
     * Raises:
     * 无直接抛出异常，所有异常均被捕获并返回错误信息。
     * 设置租户的AI能力配置，需要登录和超级管理员权限
     * @param requestBody AI工具配置数据
     * @returns any 设置成功
     * @throws ApiError
     */
    public static postWorkspacesAiToolSet(
        requestBody: {
            /**
             * AI工具配置数据列表
             */
            data: Array<Record<string, any>>;
            /**
             * 租户ID
             */
            tenant_id: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/ai-tool/set',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查看所有的用户。
     *
     * Returns:
     * dict: 包含分页用户列表的响应数据
     * 查看所有的用户，支持分页和搜索，需要登录
     * @param page 页码，从 1 开始
     * @param limit 每页数量
     * @param searchName 名称搜索
     * @param searchPhone 电话搜索
     * @param searchEmail 邮箱搜索
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesAllMembers(
        page: number = 1,
        limit: number = 20,
        searchName?: string,
        searchPhone?: string,
        searchEmail?: string,
    ): CancelablePromise<{
        /**
         * 账户列表
         */
        data?: Array<{
            /**
             * 头像
             */
            avatar?: string;
            /**
             * 创建时间
             */
            created_at?: number;
            /**
             * 邮箱
             */
            email?: string;
            /**
             * 账户ID
             */
            id?: string;
            /**
             * 最后活跃时间
             */
            last_active_at?: number;
            /**
             * 最后登录时间
             */
            last_login_at?: number;
            /**
             * 账户名称
             */
            name?: string;
            /**
             * 电话
             */
            phone?: string;
            /**
             * 角色
             */
            role?: string;
            /**
             * 状态
             */
            status?: string;
        }>;
        /**
         * 是否有更多数据
         */
        has_more?: boolean;
        /**
         * 每页数量
         */
        limit?: number;
        /**
         * 当前页码
         */
        page?: number;
        /**
         * 总记录数
         */
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/all/members',
            query: {
                'page': page,
                'limit': limit,
                'search_name': searchName,
                'search_phone': searchPhone,
                'search_email': searchEmail,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查看所有的租户。
     *
     * Returns:
     * dict: 包含分页租户列表的响应数据
     * 查看所有的租户，支持分页和搜索，需要登录
     * @param page 页码，从 1 开始
     * @param limit 每页数量
     * @param searchName 名称搜索
     * @param searchUser 用户搜索
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesAllTenants(
        page: number = 1,
        limit: number = 20,
        searchName?: string,
        searchUser?: string,
    ): CancelablePromise<{
        /**
         * 租户列表
         */
        data?: Array<{
            /**
             * 创建时间
             */
            created_at?: number;
            /**
             * 是否为当前租户
             */
            current?: boolean;
            /**
             * 是否启用AI
             */
            enable_ai?: boolean;
            /**
             * GPU配额
             */
            gpu_quota?: number;
            /**
             * 已使用GPU
             */
            gpu_used?: number;
            /**
             * 是否有资产
             */
            has_assets?: boolean;
            /**
             * 租户ID
             */
            id?: string;
            /**
             * 租户名称
             */
            name?: string;
            /**
             * 角色
             */
            role?: string;
            /**
             * 状态
             */
            status?: string;
            /**
             * 存储配额
             */
            storage_quota?: number;
            /**
             * 已使用存储
             */
            storage_used?: number;
        }>;
        /**
         * 是否有更多数据
         */
        has_more?: boolean;
        /**
         * 每页数量
         */
        limit?: number;
        /**
         * 当前页码
         */
        page?: number;
        /**
         * 总记录数
         */
        total?: number;
        /**
         * 用户ID
         */
        user_id?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/all/tenants',
            query: {
                'page': page,
                'limit': limit,
                'search_name': searchName,
                'search_user': searchUser,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 关闭协作
     * 关闭指定目标的协作功能，需要登录和写入权限
     * @param requestBody 关闭参数
     * @returns any 操作成功
     * @throws ApiError
     */
    public static postWorkspacesCoopClose(
        requestBody: {
            /**
             * 目标ID
             */
            target_id: string;
            /**
             * 目标类型
             */
            target_type: 'app' | 'dataset' | 'knowledge_base' | 'doc';
        },
    ): CancelablePromise<{
        /**
         * 账户列表
         */
        accounts?: Array<string>;
        /**
         * 创建者
         */
        created_by?: string;
        /**
         * 是否启用
         */
        enable?: boolean;
        /**
         * 目标ID
         */
        target_id?: string;
        /**
         * 目标类型
         */
        target_type?: string;
        /**
         * 租户ID
         */
        tenant_id?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/coop/close',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查看自己被加入协作的列表
     * 查看自己被加入协作的列表，需要登录
     * @param targetType 目标类型
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesCoopJoins(
        targetType: 'app' | 'dataset' | 'knowledge_base' | 'doc',
    ): CancelablePromise<{
        /**
         * ID列表
         */
        data?: Array<string>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/coop/joins',
            query: {
                'target_type': targetType,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 打开协作
     * 打开指定目标的协作功能，需要登录和写入权限
     * @param requestBody 协作参数
     * @returns any 操作成功
     * @throws ApiError
     */
    public static postWorkspacesCoopOpen(
        requestBody: {
            /**
             * 账户ID列表
             */
            accounts: Array<string>;
            /**
             * 目标ID
             */
            target_id: string;
            /**
             * 目标类型
             */
            target_type: 'app' | 'dataset' | 'knowledge_base' | 'doc';
        },
    ): CancelablePromise<{
        /**
         * 账户列表
         */
        accounts?: Array<string>;
        /**
         * 创建者
         */
        created_by?: string;
        /**
         * 是否启用
         */
        enable?: boolean;
        /**
         * 目标ID
         */
        target_id?: string;
        /**
         * 目标类型
         */
        target_type?: string;
        /**
         * 租户ID
         */
        tenant_id?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/coop/open',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查询协作的设置详情
     * 查询协作的设置详情，需要登录
     * @param targetType 目标类型
     * @param targetId 目标ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesCoopStatus(
        targetType: 'app' | 'dataset' | 'knowledge_base' | 'doc',
        targetId: string,
    ): CancelablePromise<{
        /**
         * 账户列表
         */
        accounts?: Array<string>;
        /**
         * 创建者
         */
        created_by?: string;
        /**
         * 是否启用
         */
        enable?: boolean;
        /**
         * 目标ID
         */
        target_id?: string;
        /**
         * 目标类型
         */
        target_type?: string;
        /**
         * 租户ID
         */
        tenant_id?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/coop/status',
            query: {
                'target_type': targetType,
                'target_id': targetId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查看当前用户加入的租户。
     *
     * Returns:
     * dict: 当前用户加入的租户列表
     * 查看当前用户加入的租户，需要登录
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesCurrentList(): CancelablePromise<{
        /**
         * 租户列表
         */
        tenants?: Array<{
            /**
             * 创建时间
             */
            created_at?: number;
            /**
             * 是否为当前租户
             */
            current?: boolean;
            /**
             * 是否启用AI
             */
            enable_ai?: boolean;
            /**
             * GPU配额
             */
            gpu_quota?: number;
            /**
             * 已使用GPU
             */
            gpu_used?: number;
            /**
             * 是否有资产
             */
            has_assets?: boolean;
            /**
             * 租户ID
             */
            id?: string;
            /**
             * 租户名称
             */
            name?: string;
            /**
             * 角色
             */
            role?: string;
            /**
             * 状态
             */
            status?: string;
            /**
             * 存储配额
             */
            storage_quota?: number;
            /**
             * 已使用存储
             */
            storage_used?: number;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/current/list',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查看当前租户。
     *
     * Returns:
     * dict: 当前租户ID
     * 查看当前租户ID，需要登录
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesCurrentTenant(): CancelablePromise<{
        /**
         * 当前租户ID
         */
        tenant_id?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/current/tenant',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除租户
     * 删除指定的租户，需要登录和超级管理员或创建者权限
     * @param requestBody 删除参数
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postWorkspacesDelete(
        requestBody: {
            /**
             * 租户ID
             */
            tenant_id: string;
        },
    ): CancelablePromise<{
        result?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/delete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 删除账户
     * 删除指定的账户，需要登录和超级管理员权限
     * @param requestBody 账户ID
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postWorkspacesDeleteAccount(
        requestBody: {
            /**
             * 账户ID
             */
            account_id: string;
        },
    ): CancelablePromise<{
        result?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/delete-account',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 从租户中删除用户
     * 从租户中删除用户，需要登录和管理员权限
     * @param requestBody 删除参数
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postWorkspacesDeleteRole(
        requestBody: {
            /**
             * 账户ID
             */
            account_id: string;
            /**
             * 租户ID
             */
            tenant_id: string;
        },
    ): CancelablePromise<{
        result?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/delete-role',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查看租户用户详细。
     *
     * Returns:
     * dict: 租户详细信息和用户列表
     * 查看租户详细信息和用户列表，需要登录和写入权限
     * @param tenantId 租户ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesDetail(
        tenantId: string,
    ): CancelablePromise<{
        /**
         * 账户列表
         */
        accounts?: Array<Record<string, any>>;
        /**
         * 创建时间
         */
        created_at?: number;
        /**
         * 是否为当前租户
         */
        current?: boolean;
        /**
         * 是否启用AI
         */
        enable_ai?: boolean;
        /**
         * GPU配额
         */
        gpu_quota?: number;
        /**
         * 已使用GPU
         */
        gpu_used?: number;
        /**
         * 是否有资产
         */
        has_assets?: boolean;
        /**
         * 租户ID
         */
        id?: string;
        /**
         * 租户名称
         */
        name?: string;
        /**
         * 角色
         */
        role?: string;
        /**
         * 状态
         */
        status?: string;
        /**
         * 存储配额
         */
        storage_quota?: number;
        /**
         * 已使用存储
         */
        storage_used?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/detail',
            query: {
                'tenant_id': tenantId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 退出租户
     * 退出指定的租户，超管和创建者不能退出，需要登录
     * @param requestBody 退出参数
     * @returns any 退出成功
     * @throws ApiError
     */
    public static postWorkspacesExit(
        requestBody: {
            /**
             * 租户ID
             */
            tenant_id: string;
        },
    ): CancelablePromise<{
        result?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/exit',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 迁移资产
     * 在租户内迁移用户资产，需要登录和超级管理员权限
     * @param requestBody 迁移参数
     * @returns any 迁移成功
     * @throws ApiError
     */
    public static postWorkspacesMoveAssets(
        requestBody: {
            /**
             * 源账户ID
             */
            source_account_id: string;
            /**
             * 目标账户ID
             */
            target_account_id: string;
            /**
             * 租户ID
             */
            tenant_id: string;
        },
    ): CancelablePromise<{
        result?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/move-assets',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取个人空间资源配置信息
     * 获取个人空间资源配置信息，需要登录
     * @param accountId 账户ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesPersonalSpaceResources(
        accountId: string,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/personal-space/resources',
            query: {
                'account_id': accountId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 修改个人空间GPU配额
     * 修改个人空间GPU配额，需要登录和超级管理员权限
     * @param requestBody 个人空间数据
     * @returns any 修改成功
     * @throws ApiError
     */
    public static postWorkspacesPersonalSpaceResources(
        requestBody: {
            /**
             * GPU配额
             */
            gpu_quota: number;
            /**
             * 存储配额（GB）
             */
            storage_quota: number;
            /**
             * 租户ID
             */
            tenant_id: string;
        },
    ): CancelablePromise<{
        result?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/personal-space/resources',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 获取配额申请详情
     * 获取配额申请详情，需要登录和超级管理员权限
     * @param requestId 申请ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesQuotaRequestsDetails(
        requestId: string,
    ): CancelablePromise<{
        /**
         * 账户ID
         */
        account_id?: string;
        /**
         * 账户名称
         */
        account_name?: string;
        /**
         * 批准数量
         */
        approved_amount?: number;
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 申请ID
         */
        id?: string;
        /**
         * 处理时间
         */
        processed_at?: string;
        /**
         * 申请原因
         */
        reason?: string;
        /**
         * 拒绝原因
         */
        reject_reason?: string;
        /**
         * 申请类型
         */
        request_type?: string;
        /**
         * 申请数量
         */
        requested_amount?: number;
        /**
         * 状态
         */
        status?: string;
        /**
         * 租户ID
         */
        tenant_id?: string;
        /**
         * 租户名称
         */
        tenant_name?: string;
        /**
         * 更新时间
         */
        updated_at?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/quota-requests/details',
            query: {
                'request_id': requestId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
                404: `资源不存在`,
            },
        });
    }
    /**
     * 获取配额申请列表
     * 获取工作空间配额申请列表，需要登录和超级管理员权限
     * @param requestBody 查询参数
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postWorkspacesQuotaRequestsList(
        requestBody?: {
            /**
             * 账户名称
             */
            account_name?: string;
            /**
             * 页码，从 1 开始
             */
            page?: number;
            /**
             * 每页数量
             */
            page_size?: number;
            /**
             * 申请类型
             */
            request_type?: 'storage' | 'gpu';
            /**
             * 状态
             */
            status?: 'pending' | 'approved' | 'rejected';
            /**
             * 租户名称
             */
            tenant_name?: string;
        },
    ): CancelablePromise<{
        /**
         * 配额申请列表
         */
        data?: Array<{
            /**
             * 账户ID
             */
            account_id?: string;
            /**
             * 账户名称
             */
            account_name?: string;
            /**
             * 批准数量
             */
            approved_amount?: number;
            /**
             * 创建时间
             */
            created_at?: string;
            /**
             * 申请ID
             */
            id?: string;
            /**
             * 处理时间
             */
            processed_at?: string;
            /**
             * 申请原因
             */
            reason?: string;
            /**
             * 拒绝原因
             */
            reject_reason?: string;
            /**
             * 申请类型
             */
            request_type?: string;
            /**
             * 申请数量
             */
            requested_amount?: number;
            /**
             * 状态
             */
            status?: string;
            /**
             * 租户ID
             */
            tenant_id?: string;
            /**
             * 租户名称
             */
            tenant_name?: string;
            /**
             * 更新时间
             */
            updated_at?: string;
        }>;
        /**
         * 是否有下一页
         */
        has_next?: boolean;
        /**
         * 是否有上一页
         */
        has_prev?: boolean;
        /**
         * 当前页码
         */
        page?: number;
        /**
         * 每页数量
         */
        page_size?: number;
        /**
         * 总页数
         */
        pages?: number;
        /**
         * 总记录数
         */
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/quota-requests/list',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 处理配额申请
     * 管理员处理配额申请（批准或拒绝），需要登录和超级管理员权限
     * @param requestBody 处理参数
     * @returns any 处理成功
     * @throws ApiError
     */
    public static postWorkspacesQuotaRequestsProcess(
        requestBody: {
            /**
             * 操作类型：approve 或 reject
             */
            action: 'approve' | 'reject';
            /**
             * 批准数量（仅当 action 为 approve 时必需）
             */
            amount?: number;
            /**
             * 拒绝原因（仅当 action 为 reject 时必需）
             */
            reason?: string;
            /**
             * 申请ID
             */
            request_id: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/quota-requests/process',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 提交配额申请
     * 提交配额申请（存储或GPU），需要登录和管理员权限
     * @param requestBody 申请数据
     * @returns any 提交成功
     * @throws ApiError
     */
    public static postWorkspacesQuotaRequestsRequests(
        requestBody: {
            /**
             * 申请数量
             */
            amount: number;
            /**
             * 申请原因
             */
            reason: string;
            /**
             * 租户ID
             */
            tenant_id: string;
            /**
             * 申请类型：storage 或 gpu
             */
            type: 'storage' | 'gpu';
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/quota-requests/requests',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查看所有的用户(仅在选择用户列表中使用)。
     *
     * Returns:
     * dict: 包含分页用户列表的响应数据
     * 查看所有的用户（仅在选择用户列表中使用），支持分页和搜索，需要登录
     * @param page 页码，从 1 开始
     * @param limit 每页数量
     * @param searchName 名称搜索
     * @param searchPhone 电话搜索
     * @param searchEmail 邮箱搜索
     * @param tenantId 租户ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesSelectMembers(
        page: number = 1,
        limit: number = 20,
        searchName?: string,
        searchPhone?: string,
        searchEmail?: string,
        tenantId?: string,
    ): CancelablePromise<{
        /**
         * 账户列表
         */
        data?: Array<{
            /**
             * 头像
             */
            avatar?: string;
            /**
             * 创建时间
             */
            created_at?: number;
            /**
             * 邮箱
             */
            email?: string;
            /**
             * 账户ID
             */
            id?: string;
            /**
             * 最后活跃时间
             */
            last_active_at?: number;
            /**
             * 最后登录时间
             */
            last_login_at?: number;
            /**
             * 账户名称
             */
            name?: string;
            /**
             * 电话
             */
            phone?: string;
            /**
             * 角色
             */
            role?: string;
            /**
             * 状态
             */
            status?: string;
        }>;
        /**
         * 是否有更多数据
         */
        has_more?: boolean;
        /**
         * 每页数量
         */
        limit?: number;
        /**
         * 当前页码
         */
        page?: number;
        /**
         * 总记录数
         */
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/select/members',
            query: {
                'page': page,
                'limit': limit,
                'search_name': searchName,
                'search_phone': searchPhone,
                'search_email': searchEmail,
                'tenant_id': tenantId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查看当前工作组的存储空间使用情况
     * 查看当前工作组的存储空间使用情况，需要登录
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesStorageCheck(): CancelablePromise<{
        /**
         * 是否有可用空间
         */
        data?: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/storage/check',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 切换租户。
     *
     * Returns:
     * dict: 切换成功的响应消息
     * 切换当前用户的租户，需要登录
     * @param requestBody 切换参数
     * @returns any 切换成功
     * @throws ApiError
     */
    public static postWorkspacesSwitch(
        requestBody: {
            /**
             * 租户ID
             */
            tenant_id: string;
        },
    ): CancelablePromise<{
        result?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/switch',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 设置是否开启租户的AI能力。
     *
     * Args:
     * 无直接参数。请求体中应包含以下JSON字段：
     * enable (bool): 是否开启，必填。
     * tenant_id (str): 租户ID，必填。
     *
     * Returns:
     * - 若成功，返回({"message": "success", "code": 200, "data": 数据}, 200)
     * 设置是否开启租户的AI能力，需要登录和超级管理员权限
     * @param requestBody 启用参数
     * @returns any 设置成功
     * @throws ApiError
     */
    public static postWorkspacesTenantEnableAi(
        requestBody: {
            /**
             * 是否启用AI
             */
            enable: boolean;
            /**
             * 租户ID
             */
            tenant_id: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/workspaces/tenant/enable_ai',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 查询当前租户下全部用户列表
     * 查询当前租户下全部用户列表，需要登录
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getWorkspacesTenantUserList(): CancelablePromise<Array<Record<string, any>>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workspaces/tenant/user_list',
            errors: {
                400: `参数错误`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 修改租户内的用户身份
     * "data_list": [
         * {
             * "account_id": "87079ad4-5bce-4f28-972c-644084d939e7",
             * "name": "名字",
             * "role": "owner"
             * },
             * ]
             * 修改租户内的用户身份和配额，需要登录和管理员权限
             * @param requestBody 角色数据
             * @returns any 更新成功
             * @throws ApiError
             */
            public static postWorkspacesUpdateRoles(
                requestBody: {
                    /**
                     * 用户角色列表
                     */
                    data_list?: Array<{
                        account_id?: string;
                        name?: string;
                        role?: string;
                    }>;
                    /**
                     * GPU配额
                     */
                    gpu_quota?: number;
                    /**
                     * 存储配额（GB）
                     */
                    storage_quota: number;
                    /**
                     * 租户ID
                     */
                    tenant_id: string;
                    /**
                     * 租户名称
                     */
                    tenant_name?: string;
                },
            ): CancelablePromise<{
                result?: string;
            }> {
                return __request(OpenAPI, {
                    method: 'POST',
                    url: '/workspaces/update-roles',
                    body: requestBody,
                    mediaType: 'application/json',
                    errors: {
                        400: `参数错误`,
                        401: `未授权`,
                        403: `无权限`,
                    },
                });
            }
        }

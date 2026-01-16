/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class McpService {
    /**
     * 获取MCP工具引用结果
     * 获取引用指定MCP工具的应用列表，需要登录
     * @param id MCP工具ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getMcpReferenceResult(
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
            url: '/mcp/reference-result',
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
     * 获取MCP服务器分页列表。
     *
     * 根据传入的查询条件获取MCP服务器的分页列表，支持按发布状态、
     * 启用状态、标签、名称等条件进行筛选。
     *
     * Args:
     * page (int, optional): 页码，默认为1。
     * page_size (int, optional): 每页大小，默认为20。
     * publish (list, optional): 发布状态列表。
     * enable (bool, optional): 启用状态。
     * qtype (str, optional): 查询类型，可选值：mine/group/builtin/already，默认为already。
     * search_tags (list, optional): 搜索标签列表，默认为空列表。
     * search_name (str, optional): 搜索名称，默认为空字符串。
     * user_id (list, optional): 用户ID列表，默认为空列表。
     *
     * Returns:
     * dict: 包含MCP服务器分页信息的字典。
     *
     * Raises:
     * ValueError: 当请求参数不合法时抛出。
     * 根据传入的查询条件获取MCP服务器的分页列表，支持按发布状态、启用状态、标签、名称等条件进行筛选，需要登录
     * @param requestBody 查询参数
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postMcpServers(
        requestBody?: {
            /**
             * 启用状态
             */
            enable?: boolean;
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
            publish?: Array<boolean>;
            /**
             * 查询类型：mine(我的)、group(组)、builtin(内置)、already(已有)
             */
            qtype?: 'mine' | 'group' | 'builtin' | 'already';
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
    ): CancelablePromise<{
        /**
         * MCP服务器列表
         */
        data?: Array<{
            /**
             * 创建时间
             */
            created_at?: string;
            /**
             * 服务器描述
             */
            description?: string;
            /**
             * 是否启用
             */
            enable?: boolean;
            /**
             * HTTP头
             */
            headers?: Record<string, any>;
            /**
             * HTTP URL
             */
            http_url?: string;
            /**
             * 服务器图标
             */
            icon?: string;
            /**
             * 服务器ID
             */
            id?: number;
            /**
             * 服务器名称
             */
            name?: string;
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
            publish_type?: 'group' | 'builtin';
            /**
             * 引用状态
             */
            ref_status?: boolean;
            /**
             * STDIO参数
             */
            stdio_arguments?: string;
            /**
             * STDIO命令
             */
            stdio_command?: string;
            /**
             * STDIO环境变量
             */
            stdio_env?: Record<string, any>;
            /**
             * 同步工具时间
             */
            sync_tools_at?: string;
            /**
             * 标签列表
             */
            tags?: Array<string>;
            /**
             * 租户ID
             */
            tenant_id?: string;
            /**
             * 测试状态
             */
            test_state?: 'success' | 'error' | 'pending';
            /**
             * 超时时间
             */
            timeout?: number;
            /**
             * 传输类型
             */
            transport_type?: 'stdio' | 'http';
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
            url: '/mcp/servers',
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
     * 检查MCP服务器名称是否已存在。
     *
     * 验证指定的服务器名称是否已经被使用。
     *
     * Args:
     * name (str): 要检查的服务器名称。
     *
     * Returns:
     * dict: 包含检查结果的字典，成功时返回{"message": "success", "code": 200}。
     *
     * Raises:
     * ValueError: 当输入参数格式有误或名称已存在时抛出。
     * 验证指定的服务器名称是否已经被使用，需要登录
     * @param requestBody 检查参数
     * @returns any 名称可用
     * @throws ApiError
     */
    public static postMcpServersCheckName(
        requestBody: {
            /**
             * 要检查的服务器名称
             */
            name: string;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mcp/servers/check-name',
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
     * 创建或更新MCP服务器。
     *
     * 根据传入的数据创建新的MCP服务器或更新已存在的服务器。
     * 如果数据中包含id字段则进行更新，否则创建新服务器。
     *
     * Args:
     * name (str): 服务器名称。
     * id (int, optional): 服务器ID，如果提供则进行更新。
     * description (str, optional): 服务器描述。
     * icon (str, optional): 服务器图标。
     * transport_type (str): 传输类型。
     * timeout (int, optional): 超时时间。
     * stdio_command (str, optional): STDIO命令。
     * stdio_arguments (str, optional): STDIO参数。
     * stdio_env (dict, optional): STDIO环境变量。
     * http_url (str, optional): HTTP URL。
     * headers (dict, optional): HTTP头。
     *
     * Returns:
     * dict: 包含创建或更新后服务器详细信息的字典。
     *
     * Raises:
     * ValueError: 当输入参数不合法或缺少必要参数时抛出。
     * 根据传入的数据创建新的MCP服务器或更新已存在的服务器。如果数据中包含id字段则进行更新，否则创建新服务器，需要登录和写入权限
     * @param requestBody 服务器数据
     * @returns any 创建或更新成功
     * @throws ApiError
     */
    public static postMcpServersCreateUpdate(
        requestBody: {
            /**
             * 服务器描述
             */
            description?: string;
            /**
             * HTTP头
             */
            headers?: Record<string, any>;
            /**
             * HTTP URL
             */
            http_url?: string;
            /**
             * 服务器图标
             */
            icon?: string;
            /**
             * 服务器ID，如果提供则进行更新
             */
            id?: number;
            /**
             * 服务器名称
             */
            name: string;
            /**
             * STDIO参数
             */
            stdio_arguments?: string;
            /**
             * STDIO命令
             */
            stdio_command?: string;
            /**
             * STDIO环境变量
             */
            stdio_env?: Record<string, any>;
            /**
             * 超时时间
             */
            timeout?: number;
            /**
             * 传输类型：stdio 或 http
             */
            transport_type: 'stdio' | 'http';
        },
    ): CancelablePromise<{
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 服务器描述
         */
        description?: string;
        /**
         * 是否启用
         */
        enable?: boolean;
        /**
         * HTTP头
         */
        headers?: Record<string, any>;
        /**
         * HTTP URL
         */
        http_url?: string;
        /**
         * 服务器图标
         */
        icon?: string;
        /**
         * 服务器ID
         */
        id?: number;
        /**
         * 服务器名称
         */
        name?: string;
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
        publish_type?: 'group' | 'builtin';
        /**
         * 引用状态
         */
        ref_status?: boolean;
        /**
         * STDIO参数
         */
        stdio_arguments?: string;
        /**
         * STDIO命令
         */
        stdio_command?: string;
        /**
         * STDIO环境变量
         */
        stdio_env?: Record<string, any>;
        /**
         * 同步工具时间
         */
        sync_tools_at?: string;
        /**
         * 标签列表
         */
        tags?: Array<string>;
        /**
         * 租户ID
         */
        tenant_id?: string;
        /**
         * 测试状态
         */
        test_state?: 'success' | 'error' | 'pending';
        /**
         * 超时时间
         */
        timeout?: number;
        /**
         * 传输类型
         */
        transport_type?: 'stdio' | 'http';
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
            url: '/mcp/servers/create-update',
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
     * 删除MCP服务器。
     *
     * 删除指定的MCP服务器，删除前会检查服务器是否被引用。
     *
     * Args:
     * id (int): 要删除的服务器ID。
     *
     * Returns:
     * dict: 包含删除结果的字典。
     *
     * Raises:
     * ValueError: 当输入参数不合法或服务器被引用时抛出。
     * 删除指定的MCP服务器，删除前会检查服务器是否被引用，需要登录和管理员权限
     * @param requestBody MCP服务器ID
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postMcpServersDelete(
        requestBody: {
            /**
             * MCP服务器ID
             */
            id: number;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mcp/servers/delete',
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
     * 获取MCP服务器详细信息。
     *
     * 根据MCP服务器ID获取服务器的详细信息。
     *
     * Args:
     * mcp_server_id (int): MCP服务器ID。
     *
     * Returns:
     * dict: 包含MCP服务器详细信息的字典。
     *
     * Raises:
     * ValueError: 当找不到指定的MCP服务器时抛出。
     * ForbiddenError: 当用户没有读取权限时抛出。
     * 根据MCP服务器ID获取服务器的详细信息，需要登录
     * @param mcpServerId MCP服务器ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getMcpServersDetail(
        mcpServerId: number,
    ): CancelablePromise<{
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 服务器描述
         */
        description?: string;
        /**
         * 是否启用
         */
        enable?: boolean;
        /**
         * HTTP头
         */
        headers?: Record<string, any>;
        /**
         * HTTP URL
         */
        http_url?: string;
        /**
         * 服务器图标
         */
        icon?: string;
        /**
         * 服务器ID
         */
        id?: number;
        /**
         * 服务器名称
         */
        name?: string;
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
        publish_type?: 'group' | 'builtin';
        /**
         * 引用状态
         */
        ref_status?: boolean;
        /**
         * STDIO参数
         */
        stdio_arguments?: string;
        /**
         * STDIO命令
         */
        stdio_command?: string;
        /**
         * STDIO环境变量
         */
        stdio_env?: Record<string, any>;
        /**
         * 同步工具时间
         */
        sync_tools_at?: string;
        /**
         * 标签列表
         */
        tags?: Array<string>;
        /**
         * 租户ID
         */
        tenant_id?: string;
        /**
         * 测试状态
         */
        test_state?: 'success' | 'error' | 'pending';
        /**
         * 超时时间
         */
        timeout?: number;
        /**
         * 传输类型
         */
        transport_type?: 'stdio' | 'http';
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
            url: '/mcp/servers/detail',
            query: {
                'mcp_server_id': mcpServerId,
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
     * 启用或禁用MCP服务器。
     *
     * 设置MCP服务器的启用状态。
     *
     * Args:
     * id (int): 服务器ID。
     * enable (bool): 是否启用服务器。
     *
     * Returns:
     * dict: 包含操作结果的字典。
     *
     * Raises:
     * ValueError: 当输入参数不合法或缺少必要参数时抛出。
     * 设置MCP服务器的启用状态，需要登录和写入权限
     * @param requestBody 启用参数
     * @returns any 操作成功
     * @throws ApiError
     */
    public static postMcpServersEnable(
        requestBody: {
            /**
             * 是否启用服务器
             */
            enable: boolean;
            /**
             * 服务器ID
             */
            id: number;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mcp/servers/enable',
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
     * 发布MCP服务器。
     *
     * 将MCP服务器发布为可用状态，支持不同的发布类型。
     *
     * Args:
     * id (str): 服务器ID。
     * publish_type (str): 发布类型。
     *
     * Returns:
     * dict: 包含发布结果的字典。
     *
     * Raises:
     * ValueError: 当输入参数不合法时抛出。
     * 将MCP服务器发布为可用状态，支持不同的发布类型，需要登录和写入权限
     * @param requestBody 发布参数
     * @returns any 发布成功
     * @throws ApiError
     */
    public static postMcpServersPublish(
        requestBody: {
            /**
             * 服务器ID
             */
            id: string;
            /**
             * 发布类型：group(组) 或 builtin(内置)
             */
            publish_type: 'group' | 'builtin';
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mcp/servers/publish',
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
     * 同步MCP服务器的工具。
     *
     * 从指定的MCP服务器同步工具，使用服务器端发送事件方式返回进度。
     *
     * Args:
     * id (int): MCP服务器ID。
     *
     * Returns:
     * Response: 服务器端发送事件流。
     *
     * Raises:
     * ValueError: 当输入参数不合法或MCP服务器ID为空时抛出。
     * ForbiddenError: 当用户没有写入权限时抛出。
     * 从指定的MCP服务器同步工具，使用服务器端发送事件方式返回进度，需要登录和写入权限
     * @param requestBody MCP服务器ID
     * @returns string 同步成功（服务器端发送事件流）
     * @throws ApiError
     */
    public static postMcpServersSyncTools(
        requestBody: {
            /**
             * MCP服务器ID
             */
            id: number;
        },
    ): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mcp/servers/sync-tools',
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
     * 获取MCP工具列表。
     *
     * 根据MCP服务器ID获取对应的工具列表。
     *
     * Args:
     * mcp_server_id (int): MCP服务器ID。
     *
     * Returns:
     * dict: 包含MCP工具列表的字典。
     *
     * Raises:
     * ValueError: 当输入参数不合法或MCP服务器ID为空时抛出。
     * ForbiddenError: 当用户没有读取权限时抛出。
     * 根据MCP服务器ID获取对应的工具列表，需要登录
     * @param requestBody 查询参数
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postMcpTools(
        requestBody: {
            /**
             * MCP服务器ID
             */
            mcp_server_id: number;
        },
    ): CancelablePromise<{
        /**
         * MCP工具列表
         */
        data?: Array<{
            /**
             * 附加属性
             */
            additional_properties?: Record<string, any>;
            /**
             * 注解
             */
            annotations?: Record<string, any>;
            /**
             * 创建时间
             */
            created_at?: string;
            /**
             * 工具描述
             */
            description?: string;
            /**
             * 工具ID
             */
            id?: number;
            /**
             * 输入schema
             */
            input_schema?: Record<string, any>;
            /**
             * MCP服务器ID
             */
            mcp_server_id?: number;
            /**
             * 工具名称
             */
            name?: string;
            /**
             * Schema
             */
            schema?: string;
            /**
             * 状态
             */
            status?: string;
            /**
             * 更新时间
             */
            updated_at?: string;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mcp/tools',
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
     * 获取MCP工具详细信息。
     *
     * 根据工具ID获取MCP工具的详细信息。
     *
     * Args:
     * tool_id (int): 工具ID。
     *
     * Returns:
     * dict: 包含MCP工具详细信息的字典。
     *
     * Raises:
     * ValueError: 当找不到指定的工具时抛出。
     * 根据工具ID获取MCP工具的详细信息，需要登录
     * @param toolId 工具ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getMcpToolsDetail(
        toolId: number,
    ): CancelablePromise<{
        /**
         * 附加属性
         */
        additional_properties?: Record<string, any>;
        /**
         * 注解
         */
        annotations?: Record<string, any>;
        /**
         * 创建时间
         */
        created_at?: string;
        /**
         * 工具描述
         */
        description?: string;
        /**
         * 工具ID
         */
        id?: number;
        /**
         * 输入schema
         */
        input_schema?: Record<string, any>;
        /**
         * MCP服务器ID
         */
        mcp_server_id?: number;
        /**
         * 工具名称
         */
        name?: string;
        /**
         * Schema
         */
        schema?: string;
        /**
         * 状态
         */
        status?: string;
        /**
         * 更新时间
         */
        updated_at?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/mcp/tools/detail',
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
     * 测试MCP工具。
     *
     * 使用指定的参数测试MCP工具的功能，并更新服务器的测试状态。
     *
     * Args:
     * mcp_server_id (int): MCP服务器ID。
     * tool_id (int): 工具ID。
     * param (dict, optional): 测试参数。
     *
     * Returns:
     * dict: 包含测试结果的字典。
     *
     * Raises:
     * ValueError: 当输入参数不合法或缺少必要参数时抛出。
     * ForbiddenError: 当用户没有写入权限时抛出。
     * 使用指定的参数测试MCP工具的功能，并更新服务器的测试状态，需要登录和写入权限
     * @param requestBody 测试参数
     * @returns any 测试成功
     * @throws ApiError
     */
    public static postMcpToolsTestTool(
        requestBody: {
            /**
             * MCP服务器ID
             */
            mcp_server_id: number;
            /**
             * 测试参数
             */
            param?: Record<string, any>;
            /**
             * 工具ID
             */
            tool_id: number;
        },
    ): CancelablePromise<{
        /**
         * 测试结果消息
         */
        message?: string;
        status?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/mcp/tools/test-tool',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `测试失败`,
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
}

/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PromptService {
    /**
     * 创建新的提示信息。
     *
     * 解析请求中的JSON数据，包括提示信息的名称、描述、内容和分类信息，
     * 调用PromptService创建新的提示信息并返回创建成功后的ID。
     *
     * Args:
     * name (str): 提示信息的名称，必填。
     * describe (str, optional): 提示信息的描述，默认为空字符串。
     * content (str): 提示信息的内容，必填。
     * category (str, optional): 提示信息的分类，默认为None。
     *
     * Returns:
     * dict: 包含创建成功的提示信息ID的响应字典。
     *
     * Raises:
     * ValueError: 当参数错误或名称为空时抛出。
     * 创建新的提示信息，支持包含名称、描述、内容和分类的提示信息，需要登录和写入权限
     * @param requestBody 提示信息数据
     * @returns any 创建成功
     * @throws ApiError
     */
    public static postPrompt(
        requestBody: {
            /**
             * 提示信息的分类
             */
            category?: string;
            /**
             * 提示信息的内容（必需）
             */
            content: string;
            /**
             * 提示信息的描述
             */
            describe?: string;
            /**
             * 提示信息的名称（必需）
             */
            name: string;
        },
    ): CancelablePromise<{
        code?: number;
        data?: {
            /**
             * 创建的提示信息ID
             */
            id?: number;
        };
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/prompt',
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
     * 处理POST请求，删除指定ID的提示信息。
     *
     * - 调用PromptService的delete_prompt方法删除提示信息。
     * - 如果删除成功，记录日志并返回成功消息。
     * - 如果提示信息不存在，记录错误日志并返回错误消息。
     * 根据提示信息ID删除提示信息，内置提示信息需要超级管理员权限，需要登录和管理员权限
     * @param id 提示信息ID
     * @returns any 删除成功
     * @throws ApiError
     */
    public static postPromptDelete(
        id: number,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/prompt/delete/{id}',
            path: {
                'id': id,
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
     * 处理GET请求，分页获取所有提示信息。
     *
     * - 解析请求中的分页参数，包括当前页码和每页数量。
     * - 调用PromptService的list_prompt方法获取提示信息列表和分页信息。
     * - 返回提示信息列表和分页信息。
     * 分页获取所有提示信息的列表，支持按查询类型、标签、名称、用户ID等条件筛选，需要登录
     * @param requestBody 查询参数
     * @returns any 获取成功
     * @throws ApiError
     */
    public static postPromptList(
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
             * 名称搜索条件
             */
            search_name?: string;
            /**
             * 标签搜索条件
             */
            search_tags?: Array<string>;
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
             * 提示信息列表
             */
            prompts?: Array<{
                /**
                 * 提示信息分类
                 */
                category?: string;
                /**
                 * 提示信息内容
                 */
                content?: string;
                /**
                 * 创建时间
                 */
                created_at?: string;
                /**
                 * 提示信息描述
                 */
                describe?: string;
                /**
                 * 提示信息ID
                 */
                id?: number;
                /**
                 * 提示信息名称
                 */
                name?: string;
                /**
                 * 更新时间
                 */
                updated_at?: string;
            }>;
            /**
             * 总记录数
             */
            total?: number;
        };
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/prompt/list',
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
     * 获取指定ID的提示信息。
     *
     * 调用PromptService获取提示信息的详细内容，包括权限检查。
     * 如果提示信息不存在则返回错误消息。
     *
     * Args:
     * id (int): 提示信息的唯一标识符。
     *
     * Returns:
     * dict: 包含提示信息详细内容的响应字典，包括id、name、describe、
     * content、category、created_at、updated_at字段。
     *
     * Raises:
     * ValueError: 当提示信息不存在时返回400状态码。
     * 根据提示信息ID获取其详细信息，包括名称、描述、内容、分类和时间戳等，需要登录
     * @param id 提示信息ID
     * @returns any 获取成功
     * @throws ApiError
     */
    public static getPrompt(
        id: number,
    ): CancelablePromise<{
        code?: number;
        data?: {
            /**
             * 提示信息分类
             */
            category?: string;
            /**
             * 提示信息内容
             */
            content?: string;
            /**
             * 创建时间
             */
            created_at?: string;
            /**
             * 提示信息描述
             */
            describe?: string;
            /**
             * 提示信息ID
             */
            id?: number;
            /**
             * 提示信息名称
             */
            name?: string;
            /**
             * 更新时间
             */
            updated_at?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/prompt/{id}',
            path: {
                'id': id,
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
     * 处理POST请求，更新指定ID的提示信息。
     *
     * - 解析请求中的JSON数据，包括提示信息的名称、描述、内容和模板ID。
     * - 调用PromptService的update_prompt方法更新提示信息。
     * - 如果更新成功，返回成功消息。
     * - 如果提示信息不存在，返回错误消息。
     * 根据提示信息ID和用户提交的数据更新提示信息，内置提示信息需要超级管理员权限，需要登录和写入权限
     * @param id 提示信息ID
     * @param requestBody 提示信息数据
     * @returns any 更新成功
     * @throws ApiError
     */
    public static postPrompt1(
        id: number,
        requestBody: {
            /**
             * 提示信息的分类
             */
            category?: string;
            /**
             * 提示信息的内容
             */
            content?: string;
            /**
             * 提示信息的描述
             */
            describe?: string;
            /**
             * 提示信息的名称
             */
            name?: string;
            /**
             * 模板ID
             */
            template_id?: number;
        },
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/prompt/{id}',
            path: {
                'id': id,
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
}

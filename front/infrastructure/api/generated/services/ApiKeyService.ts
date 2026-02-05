/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ApiKeyService {
    /**
     * 删除指定的API Key。
     *
     * Args:
     * id (int, required): 要删除的API Key的ID
     *
     * Returns:
     * dict: 删除操作的结果
     *
     * Raises:
     * CommonError: 当API Key不存在或不属于当前用户时抛出
     * 删除指定的 API Key
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static deleteApikey(
        requestBody: {
            /**
             * API Key ID
             */
            id: number;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/apikey',
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
     * 获取当前用户的所有API Key列表。
     *
     * Returns:
     * dict: 包含API Key详细信息的字典，使用apikey_detail_fields格式化
     *
     * Raises:
     * CommonError: 当查询失败时抛出
     * 获取当前用户的所有 API Key 列表
     * @returns any 成功
     * @throws ApiError
     */
    public static getApikey(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/apikey',
            errors: {
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 创建新的API Key。
     *
     * Args:
     * description (str, optional): API Key的描述信息
     * expire_date (str, optional): 过期时间，格式为YYYY-MM-DD
     * tenant_id (str, required): 空间ID，多个空间ID用逗号分隔
     *
     * Returns:
     * dict: 新创建的API Key详细信息
     *
     * Raises:
     * CommonError: 当参数验证失败或创建失败时抛出
     * 创建新的 API Key
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postApikey(
        requestBody: {
            /**
             * API Key 描述
             */
            description?: string;
            /**
             * 过期日期，格式：YYYY-MM-DD
             */
            expire_date?: string;
            /**
             * 空间ID，多个空间ID用逗号分隔
             */
            tenant_id: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apikey',
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
     * 更新API Key的状态。
     *
     * Args:
     * id (int, required): 要更新的API Key的ID
     * status (str, required): 新的状态，可选值：active, disabled, deleted, expired
     *
     * Returns:
     * dict: 更新后的API Key详细信息
     *
     * Raises:
     * CommonError: 当API Key不存在、不属于当前用户或状态转换不允许时抛出
     * 更新 API Key 的状态（active, disabled, deleted, expired）
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static putApikey(
        requestBody: {
            /**
             * API Key ID
             */
            id: number;
            /**
             * 状态：active, disabled, deleted, expired
             */
            status: 'active' | 'disabled' | 'deleted' | 'expired';
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/apikey',
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
     * 使用API Key与指定应用进行对话。
     *
     * Args:
     * app_id (str): 应用ID
     * inputs (list, required): 输入内容列表
     * mode (str, optional): 运行模式，默认为"publish"
     * files (list, optional): 文件列表，可为空
     *
     * Returns:
     * dict: 对话结果数据
     *
     * Raises:
     * CommonError: 当API Key验证失败、应用不存在或服务未开启时抛出
     * 使用 API Key 与指定应用进行对话
     * @param appId 应用ID
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postApikeyChat(
        appId: string,
        requestBody: {
            /**
             * 文件列表，可为空
             */
            files?: Array<string>;
            /**
             * 输入内容列表
             */
            inputs: Array<string>;
            /**
             * 运行模式，默认为 publish
             */
            mode?: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/apikey/chat/{app_id}',
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
}

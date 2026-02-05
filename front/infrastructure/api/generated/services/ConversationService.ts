/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ConversationService {
    /**
     * 对对话的结果进行反馈。
     *
     * Args:
     * app_id (str): 应用ID
     * sessionid (str, required): 会话ID
     * speak_id (int, required): 对话消息ID
     * is_satisfied (bool, required): 是否满意
     * user_feedback (str, required): 用户反馈内容
     *
     * Returns:
     * dict: 反馈结果
     *
     * Raises:
     * Exception: 当反馈处理失败时抛出
     * 对对话结果进行用户反馈
     * @param appId 应用ID
     * @param authorization 认证令牌，格式: Bearer <token> 或直接 <token>
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postConversationFeedback(
        appId: string,
        authorization: string,
        requestBody: {
            /**
             * 是否满意
             */
            is_satisfied: boolean;
            /**
             * 会话ID
             */
            sessionid: string;
            /**
             * 对话消息ID
             */
            speak_id: number;
            /**
             * 用户反馈内容
             */
            user_feedback: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/conversation/{app_id}/feedback',
            path: {
                'app_id': appId,
            },
            headers: {
                'Authorization': authorization,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
            },
        });
    }
    /**
     * 获取某个会话的历史记录。
     *
     * Args:
     * app_id (str): 应用ID
     * sessionid (str, required): 会话ID
     * start_id (int, optional): 起始消息ID
     *
     * Returns:
     * dict: 包含历史记录的字典
     *
     * Raises:
     * Exception: 当获取历史记录失败时抛出
     * 获取指定会话的历史对话记录
     * @param appId 应用ID
     * @param sessionid 会话ID
     * @param authorization 认证令牌，格式: Bearer <token> 或直接 <token>
     * @param startId 起始消息ID，用于分页
     * @returns any 成功
     * @throws ApiError
     */
    public static getConversationHistory(
        appId: string,
        sessionid: string,
        authorization: string,
        startId?: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/conversation/{app_id}/history',
            path: {
                'app_id': appId,
            },
            headers: {
                'Authorization': authorization,
            },
            query: {
                'sessionid': sessionid,
                'start_id': startId,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
            },
        });
    }
    /**
     * 换取用户信息。
     *
     * Args:
     * app_id (str): 应用ID
     *
     * Returns:
     * dict: 包含认证令牌的字典
     *
     * Raises:
     * Exception: 当初始化失败时抛出
     * 初始化用户身份并获取认证令牌，用于后续对话接口的认证
     * @param appId 应用ID
     * @param tempToken 临时令牌（可选）
     * @param token 认证令牌（可选）
     * @returns any 成功
     * @throws ApiError
     */
    public static getConversationInit(
        appId: string,
        tempToken?: string,
        token?: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/conversation/{app_id}/init',
            path: {
                'app_id': appId,
            },
            headers: {
                'TempToken': tempToken,
            },
            query: {
                '_token': token,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
            },
        });
    }
    /**
     * 跟app对话。
     *
     * Args:
     * app_id (str): 应用ID
     * sessionid (str, required): 会话ID
     * inputs (list, required): 输入内容列表
     * files (list, optional): 文件列表
     * mode (str, optional): 运行模式，默认为publish
     *
     * Returns:
     * Response: SSE流式响应
     *
     * Raises:
     * ValueError: 当应用服务关闭时抛出
     * 向应用发送消息并获取流式响应（SSE格式）
     * @param appId 应用ID
     * @param authorization 认证令牌，格式: Bearer <token> 或直接 <token>
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postConversationRun(
        appId: string,
        authorization: string,
        requestBody: {
            /**
             * 文件列表（可选）
             */
            files?: Array<string>;
            /**
             * 输入内容列表
             */
            inputs: Array<string>;
            /**
             * 运行模式，publish为发布模式，draft为草稿模式
             */
            mode?: 'publish' | 'draft';
            /**
             * 会话ID
             */
            sessionid: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/conversation/{app_id}/run',
            path: {
                'app_id': appId,
            },
            headers: {
                'Authorization': authorization,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
            },
        });
    }
    /**
     * 获取会话列表。
     *
     * Args:
     * app_id (str): 应用ID
     *
     * Returns:
     * dict: 包含会话列表的字典
     *
     * Raises:
     * Exception: 当获取会话列表失败时抛出
     * 获取当前用户的所有对话会话列表
     * @param appId 应用ID
     * @param authorization 认证令牌，格式: Bearer <token> 或直接 <token>
     * @returns any 成功
     * @throws ApiError
     */
    public static getConversationSessions(
        appId: string,
        authorization: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/conversation/{app_id}/sessions',
            path: {
                'app_id': appId,
            },
            headers: {
                'Authorization': authorization,
            },
            errors: {
                400: `参数错误`,
                401: `未授权`,
            },
        });
    }
}

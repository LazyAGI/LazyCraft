/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiRequestOptions } from './ApiRequestOptions';
import { API_PREFIX } from '@/app-specs';

type Resolver<T> = (options: ApiRequestOptions) => Promise<T>;
type Headers = Record<string, string>;

export type OpenAPIConfig = {
    BASE: string;
    VERSION: string;
    WITH_CREDENTIALS: boolean;
    CREDENTIALS: 'include' | 'omit' | 'same-origin';
    TOKEN?: string | Resolver<string> | undefined;
    USERNAME?: string | Resolver<string> | undefined;
    PASSWORD?: string | Resolver<string> | undefined;
    HEADERS?: Headers | Resolver<Headers> | undefined;
    ENCODE_PATH?: ((path: string) => string) | undefined;
};

// 获取BASE URL，优先使用环境变量或DOM中的配置
const getBaseUrl = (): string => {
    if (typeof window !== 'undefined') {
        // 浏览器环境：从DOM或环境变量获取
        const apiBaseUrl = window.document?.body?.getAttribute('data-api-base-url');
        if (apiBaseUrl) {
            return apiBaseUrl;
        }
    }
    // 使用API_PREFIX，如果是相对路径则使用当前origin
    if (API_PREFIX.startsWith('http')) {
        return API_PREFIX;
    }
    if (typeof window !== 'undefined') {
        return `${window.location.origin}${API_PREFIX}`;
    }
    return API_PREFIX;
};

// 获取认证token，与项目现有的AuthManager保持一致
const getAuthToken = (): string => {
    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('console_token') || '';
    }
    return '';
};

export const OpenAPI: OpenAPIConfig = {
    BASE: getBaseUrl(),
    VERSION: '1.0.0',
    WITH_CREDENTIALS: true,
    CREDENTIALS: 'include',
    TOKEN: getAuthToken,
    USERNAME: undefined,
    PASSWORD: undefined,
    HEADERS: undefined,
    ENCODE_PATH: undefined,
};

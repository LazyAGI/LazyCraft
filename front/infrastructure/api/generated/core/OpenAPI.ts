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
    // 优先从环境变量读取完整 BASE URL
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
        return process.env.NEXT_PUBLIC_API_BASE_URL;
    }

    // 从环境变量读取各个配置项
    const envHost = process.env.NEXT_PUBLIC_API_HOST;
    const envPort = process.env.NEXT_PUBLIC_API_PORT;
    const envPrefix = process.env.NEXT_PUBLIC_API_PREFIX;
    const envHttps = process.env.NEXT_PUBLIC_API_HTTPS === 'true';

    // 如果配置了环境变量，使用环境变量构建 URL
    if (envHost || envPort || envPrefix) {
        const protocol = envHttps ? 'https' : 'http';
        const host = envHost || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
        const port = envPort ? parseInt(envPort, 10) : (envHttps ? 443 : 80);
        const prefix = envPrefix || '/console/api';

        // 如果是标准端口（80/443），不显示端口号
        const portStr = ((envHttps && port === 443) || (!envHttps && port === 80)) ? '' : `:${port}`;

        return `${protocol}://${host}${portStr}${prefix}`;
    }

    // 浏览器环境：从DOM获取
    if (typeof window !== 'undefined') {
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

/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthService {
    /**
     * 管理员添加用户。
     *
     * 允许管理员创建新用户账号，不需要短信验证码。
     * 只有具有管理员权限的用户才能调用此接口。
     *
     * Returns:
     * dict: 包含创建成功结果和用户ID的字典
     *
     * Raises:
     * ValueError: 当非管理员调用或输入信息无效时抛出
     * 管理员创建新用户账号，不需要短信验证码
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAccountAddUser(
        requestBody: {
            /**
             * 确认密码
             */
            confirm_password: string;
            /**
             * 邮箱（可选）
             */
            email?: string;
            /**
             * 用户名
             */
            name: string;
            /**
             * 密码
             */
            password: string;
            /**
             * 手机号（可选）
             */
            phone?: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/account/add_user',
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
     * 修改用户密码。
     *
     * 允许用户修改自己的登录密码，需要提供当前密码进行验证。
     * 修改成功后记录密码变更日志。
     *
     * Returns:
     * dict: 密码修改成功的结果字典
     *
     * Raises:
     * ValueError: 当新密码确认不一致或当前密码验证失败时抛出
     * 修改当前用户的登录密码
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAccountPassword(
        requestBody: {
            /**
             * 新密码
             */
            new_password: string;
            /**
             * 当前密码（可选）
             */
            password?: string;
            /**
             * 确认新密码
             */
            repeat_new_password: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/account/password',
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
     * 获取当前用户资料信息。
     *
     * 返回当前登录用户的详细信息以及当前租户信息和权限角色。
     * 包括用户基本信息、租户状态、用户在租户中的角色等。
     *
     * Returns:
     * dict: 包含用户信息和租户信息的字典
     * 获取当前登录用户的详细信息和租户信息
     * @returns any 成功
     * @throws ApiError
     */
    public static getAccountProfile(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/account/profile',
            errors: {
                401: `未授权`,
                403: `无权限`,
            },
        });
    }
    /**
     * 更新用户基本信息。
     *
     * 允许用户修改姓名、邮箱、手机号等基本信息。
     * 会验证信息格式和唯一性约束，修改成功后记录更新日志。
     *
     * Returns:
     * dict: 用户信息更新成功的结果字典
     *
     * Raises:
     * ValueError: 当输入格式无效或违反唯一性约束时抛出
     * 更新当前用户的基本信息（姓名、邮箱、手机号）
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAccountUpdate(
        requestBody: {
            /**
             * 邮箱（可选）
             */
            email?: string;
            /**
             * 用户名（可选）
             */
            name?: string;
            /**
             * 手机号（可选）
             */
            phone?: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/account/update',
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
     * 校验用户信息唯一性。
     *
     * 验证用户名、手机号或邮箱是否已被其他用户使用。
     * 用于注册前的重复性检查。
     *
     * Returns:
     * dict: 包含验证结果的字典，success表示可用，failed表示已存在
     *
     * Note:
     * 即使验证失败也不会抛出异常，而是返回包含错误信息的字典
     * 验证用户名、手机号或邮箱是否已被使用
     * @param requestBody
     * @returns any 成功
     * @throws ApiError
     */
    public static postAccountValidateExist(
        requestBody: {
            /**
             * 邮箱（可选）
             */
            email?: string;
            /**
             * 用户名（可选）
             */
            name?: string;
            /**
             * 手机号（可选）
             */
            phone?: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/account/validate_exist',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数错误`,
                401: `未授权`,
            },
        });
    }
    /**
     * 发送密码重置邮件。
     *
     * 向用户注册邮箱发送包含重置链接的邮件。在调试模式下，
     * 响应中会包含重置令牌用于测试目的。
     *
     * Request Body:
     * email (str): 用户注册邮箱地址
     *
     * Returns:
     * dict: 包含操作结果的字典
     * - result (str): 操作结果状态
     * - token (str, optional): 调试模式下的重置令牌
     *
     * Raises:
     * InvalidEmailError: 邮箱格式无效
     * ValueError: 邮箱未注册
     *
     * Example:
     * POST /forgot-password
     * {
         * "email": "user@example.com"
         * }
         * 向用户注册邮箱发送包含重置链接的邮件
         * @param requestBody
         * @returns any 成功
         * @throws ApiError
         */
        public static postForgotPassword(
            requestBody: {
                /**
                 * 用户邮箱
                 */
                email: string;
            },
        ): CancelablePromise<any> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/forgot-password',
                body: requestBody,
                mediaType: 'application/json',
                errors: {
                    400: `参数错误`,
                    401: `未授权`,
                },
            });
        }
        /**
         * 管理员强制重置用户密码。
         *
         * 允许具有管理员权限的用户为任意指定用户重置密码，
         * 无需密码重置令牌。操作会被详细记录在审计日志中。
         *
         * Request Body:
         * name (str): 目标用户名
         * new_password (str): 新密码
         * password_confirm (str): 新密码确认
         *
         * Returns:
         * dict: 包含操作结果的字典
         * - result (str): 操作结果状态
         *
         * Raises:
         * PasswordMismatchError: 密码确认不一致
         * ValueError: 权限不足、用户不存在或密码强度不足
         *
         * Example:
         * POST /forgot-password/admin-resets
         * {
             * "name": "target_user",
             * "new_password": "new_secure_password",
             * "password_confirm": "new_secure_password"
             * }
             * 管理员强制重置指定用户的密码
             * @param requestBody
             * @returns any 成功
             * @throws ApiError
             */
            public static postForgotPasswordAdminResets(
                requestBody: {
                    /**
                     * 目标用户名
                     */
                    name: string;
                    /**
                     * 新密码
                     */
                    new_password: string;
                    /**
                     * 确认新密码
                     */
                    password_confirm: string;
                },
            ): CancelablePromise<any> {
                return __request(OpenAPI, {
                    method: 'POST',
                    url: '/forgot-password/admin-resets',
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
             * 重置用户密码。
             *
             * 使用有效的重置令牌更新用户密码。验证新密码的强度和一致性，
             * 生成新的密码哈希，更新数据库并记录操作日志。
             *
             * Request Body:
             * token (str): 密码重置令牌（管理员重置时可为特殊值）
             * new_password (str): 新密码
             * password_confirm (str): 新密码确认
             *
             * Returns:
             * dict: 包含操作结果的字典
             * - result (str): 操作结果状态
             *
             * Raises:
             * PasswordMismatchError: 密码确认不一致
             * InvalidTokenError: 令牌无效或已过期
             * ValueError: 密码强度不足或其他验证错误
             *
             * Example:
             * POST /forgot-password/resets
             * {
                 * "token": "reset_token_string",
                 * "new_password": "new_secure_password",
                 * "password_confirm": "new_secure_password"
                 * }
                 * 使用有效的重置令牌更新用户密码
                 * @param requestBody
                 * @returns any 成功
                 * @throws ApiError
                 */
                public static postForgotPasswordResets(
                    requestBody: {
                        /**
                         * 新密码
                         */
                        new_password: string;
                        /**
                         * 确认新密码
                         */
                        password_confirm: string;
                        /**
                         * 密码重置令牌
                         */
                        token: string;
                    },
                ): CancelablePromise<any> {
                    return __request(OpenAPI, {
                        method: 'POST',
                        url: '/forgot-password/resets',
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
                 * 验证密码重置令牌的有效性。
                 *
                 * 检查用户提供的重置令牌是否有效且未过期。
                 * 返回令牌状态和关联的邮箱地址。
                 *
                 * Request Body:
                 * token (str): 密码重置令牌
                 *
                 * Returns:
                 * dict: 包含验证结果的字典
                 * - is_valid (bool): 令牌是否有效
                 * - email (str or None): 关联的邮箱地址
                 *
                 * Example:
                 * POST /forgot-password/validity
                 * {
                     * "token": "reset_token_string"
                     * }
                     * 验证密码重置令牌的有效性
                     * @param requestBody
                     * @returns any 成功
                     * @throws ApiError
                     */
                    public static postForgotPasswordValidity(
                        requestBody: {
                            /**
                             * 密码重置令牌
                             */
                            token: string;
                        },
                    ): CancelablePromise<any> {
                        return __request(OpenAPI, {
                            method: 'POST',
                            url: '/forgot-password/validity',
                            body: requestBody,
                            mediaType: 'application/json',
                            errors: {
                                400: `参数错误`,
                                401: `未授权`,
                            },
                        });
                    }
                    /**
                     * 进行 ECDH 密钥交换
                     *
                     * 请求格式：
                     * {
                         * "frontend_public_key": "Base64编码的前端公钥"
                         * }
                         *
                         * 响应格式：
                         * {
                             * "backend_public_key": "Base64编码的后端公钥",
                             * "session_id": "会话ID（UUID）",
                             * "expires_in": 300,
                             * "algorithm": "ECDH-P256 + AES-256-GCM"
                             * }
                             *
                             * Returns:
                             * dict: 包含后端公钥和会话 ID 的字典
                             *
                             * Raises:
                             * ValueError: 当前端公钥格式错误时抛出
                             * 进行 ECDH 密钥交换，获取会话密钥用于数据加密
                             * @param requestBody
                             * @returns any 成功
                             * @throws ApiError
                             */
                            public static postKeyExchange(
                                requestBody: {
                                    /**
                                     * 前端公钥（Base64编码）
                                     */
                                    frontend_public_key: string;
                                },
                            ): CancelablePromise<any> {
                                return __request(OpenAPI, {
                                    method: 'POST',
                                    url: '/key_exchange',
                                    body: requestBody,
                                    mediaType: 'application/json',
                                    errors: {
                                        400: `参数错误`,
                                        401: `未授权`,
                                    },
                                });
                            }
                            /**
                             * 用户密码登录。
                             *
                             * 接收 encrypted_data 和 session_id 参数，使用 ECDH 会话密钥解密。
                             * 请求数据应包含：name 或 email 或 phone（至少一个），以及 password
                             *
                             * 使用用户名/邮箱和密码进行身份验证并登录系统。
                             * 验证成功后记录登录日志并返回访问令牌。
                             *
                             * Returns:
                             * dict: 包含登录成功结果和访问令牌的字典
                             *
                             * Raises:
                             * ValueError: 当身份验证失败时抛出
                             * 使用用户名/邮箱/手机号和密码进行登录
                             * @param requestBody
                             * @returns any 成功
                             * @throws ApiError
                             */
                            public static postLogin(
                                requestBody: {
                                    /**
                                     * 加密后的登录数据（Base64编码）
                                     */
                                    encrypted_data: string;
                                    /**
                                     * 会话ID（从密钥交换接口获取）
                                     */
                                    session_id: string;
                                },
                            ): CancelablePromise<any> {
                                return __request(OpenAPI, {
                                    method: 'POST',
                                    url: '/login',
                                    body: requestBody,
                                    mediaType: 'application/json',
                                    errors: {
                                        400: `参数错误`,
                                        401: `未授权`,
                                    },
                                });
                            }
                            /**
                             * 短信验证码登录。
                             *
                             * 接收 encrypted_data 和 session_id 参数，使用 ECDH 会话密钥解密。
                             * 请求数据应包含：phone, verify_code
                             *
                             * 使用手机号和短信验证码进行身份验证并登录系统。
                             * 如果用户账号不存在，会缓存验证码用于后续注册流程。
                             *
                             * Returns:
                             * dict: 包含登录成功结果和访问令牌的字典
                             *
                             * Raises:
                             * ValueError: 当验证码验证失败或用户认证失败时抛出
                             * 使用手机号和短信验证码进行登录
                             * @param requestBody
                             * @returns any 成功
                             * @throws ApiError
                             */
                            public static postLoginSms(
                                requestBody: {
                                    /**
                                     * 加密后的登录数据（Base64编码）
                                     */
                                    encrypted_data: string;
                                    /**
                                     * 会话ID（从密钥交换接口获取）
                                     */
                                    session_id: string;
                                },
                            ): CancelablePromise<any> {
                                return __request(OpenAPI, {
                                    method: 'POST',
                                    url: '/login_sms',
                                    body: requestBody,
                                    mediaType: 'application/json',
                                    errors: {
                                        400: `参数错误`,
                                        401: `未授权`,
                                    },
                                });
                            }
                            /**
                             * 用户退出登录。
                             *
                             * 注销当前用户会话，删除访问令牌并记录退出日志。
                             *
                             * Returns:
                             * dict: 退出成功的结果字典
                             * 注销当前用户会话
                             * @returns any 成功
                             * @throws ApiError
                             */
                            public static getLogout(): CancelablePromise<any> {
                                return __request(OpenAPI, {
                                    method: 'GET',
                                    url: '/logout',
                                    errors: {
                                        401: `未授权`,
                                    },
                                });
                            }
                            /**
                             * 处理OAuth回调请求。
                             *
                             * 处理OAuth授权完成后的回调，获取用户信息并进行登录或绑定流程。
                             * 如果用户账号不存在或未绑定手机号，将跳转到手机绑定页面。
                             * 如果账号已存在，则直接登录并返回访问令牌。
                             *
                             * Args:
                             * provider (str): OAuth提供商名称（如'github'）
                             *
                             * Returns:
                             * Response: 重定向响应，跳转到绑定页面或登录成功页面
                             *
                             * Raises:
                             * ValueError: 当提供商不存在时抛出
                             * HTTPError: 当OAuth授权失败时抛出
                             * 处理 OAuth 授权完成后的回调请求
                             * @param provider OAuth 提供商名称
                             * @param code OAuth 授权码
                             * @returns any 成功
                             * @throws ApiError
                             */
                            public static getOauthAuthorize(
                                provider: 'github',
                                code: string,
                            ): CancelablePromise<any> {
                                return __request(OpenAPI, {
                                    method: 'GET',
                                    url: '/oauth/authorize/{provider}',
                                    path: {
                                        'provider': provider,
                                    },
                                    query: {
                                        'code': code,
                                    },
                                    errors: {
                                        302: `重定向到绑定页面或登录成功页面`,
                                        400: `参数错误`,
                                        401: `未授权`,
                                    },
                                });
                            }
                            /**
                             * 完成OAuth账号与手机号绑定。
                             *
                             * 处理OAuth账号绑定手机号的请求，验证短信验证码后创建或关联账号。
                             * 支持以下场景：
                             * 1. 手机号已存在账号：直接关联
                             * 2. 邮箱已存在账号：更新手机号
                             * 3. 全新用户：创建新账号
                             *
                             * Args:
                             * provider (str): OAuth提供商名称（如'github'）
                             *
                             * Returns:
                             * dict: 包含登录成功结果和访问令牌的字典
                             *
                             * Raises:
                             * ValueError: 当提供商不存在、信息过期或验证码错误时抛出
                             * 完成 OAuth 账号与手机号的绑定
                             * @param provider OAuth 提供商名称
                             * @param requestBody
                             * @returns any 成功
                             * @throws ApiError
                             */
                            public static postOauthAuthorize(
                                provider: 'github',
                                requestBody: {
                                    /**
                                     * OAuth 用户ID
                                     */
                                    openid: string;
                                    /**
                                     * 手机号
                                     */
                                    phone: string;
                                    /**
                                     * 短信验证码
                                     */
                                    verify_code: string;
                                },
                            ): CancelablePromise<any> {
                                return __request(OpenAPI, {
                                    method: 'POST',
                                    url: '/oauth/authorize/{provider}',
                                    path: {
                                        'provider': provider,
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
                             * 启动OAuth登录流程。
                             *
                             * 生成OAuth授权URL并重定向用户到OAuth提供商的授权页面。
                             *
                             * Args:
                             * provider (str): OAuth提供商名称（如'github'）
                             *
                             * Returns:
                             * Response: 重定向响应，跳转到OAuth授权页面
                             *
                             * Raises:
                             * ValueError: 当提供商不存在或配置无效时抛出
                             * 启动 OAuth 登录流程，重定向到 OAuth 提供商授权页面
                             * @param provider OAuth 提供商名称
                             * @returns any 成功
                             * @throws ApiError
                             */
                            public static getOauthLogin(
                                provider: 'github',
                            ): CancelablePromise<any> {
                                return __request(OpenAPI, {
                                    method: 'GET',
                                    url: '/oauth/login/{provider}',
                                    path: {
                                        'provider': provider,
                                    },
                                    errors: {
                                        302: `重定向到 OAuth 授权页面`,
                                        400: `参数错误`,
                                        401: `未授权`,
                                    },
                                });
                            }
                            /**
                             * 注册新用户账号。
                             *
                             * 接收 encrypted_data 和 session_id 参数，使用 ECDH 会话密钥解密。
                             * 请求数据应包含：name, email, phone, password, confirm_password, verify_code
                             *
                             * Returns:
                             * dict: 登录成功后的令牌信息
                             *
                             * Raises:
                             * ValueError: 当输入信息无效或密码不一致时抛出
                             * 注册新用户账号，需要提供加密后的用户信息和短信验证码
                             * @param requestBody
                             * @returns any 成功
                             * @throws ApiError
                             */
                            public static postRegister(
                                requestBody: {
                                    /**
                                     * 加密后的注册数据（Base64编码）
                                     */
                                    encrypted_data: string;
                                    /**
                                     * 会话ID（从密钥交换接口获取）
                                     */
                                    session_id: string;
                                },
                            ): CancelablePromise<any> {
                                return __request(OpenAPI, {
                                    method: 'POST',
                                    url: '/register',
                                    body: requestBody,
                                    mediaType: 'application/json',
                                    errors: {
                                        400: `参数错误`,
                                        401: `未授权`,
                                    },
                                });
                            }
                            /**
                             * 发送短信验证码。
                             *
                             * 根据指定的操作类型向手机号发送短信验证码。
                             * 支持的操作类型包括：login、register、reset、relate。
                             *
                             * Returns:
                             * dict: 发送成功的结果字典
                             *
                             * Raises:
                             * ValueError: 当发送频率过快或其他验证失败时抛出
                             * 向指定手机号发送短信验证码
                             * @param requestBody
                             * @returns any 成功
                             * @throws ApiError
                             */
                            public static postSendsms(
                                requestBody: {
                                    /**
                                     * 操作类型
                                     */
                                    operation: 'login' | 'register' | 'reset' | 'relate';
                                    /**
                                     * 手机号
                                     */
                                    phone: string;
                                },
                            ): CancelablePromise<any> {
                                return __request(OpenAPI, {
                                    method: 'POST',
                                    url: '/sendsms',
                                    body: requestBody,
                                    mediaType: 'application/json',
                                    errors: {
                                        400: `参数错误`,
                                        401: `未授权`,
                                    },
                                });
                            }
                        }

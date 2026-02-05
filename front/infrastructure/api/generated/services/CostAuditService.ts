/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CostAuditService {
    /**
     * 获取指定app_id的统计指标，优先从redis缓存读取。
     *
     * Args:
     * 通过JSON请求体传递参数：
     * app_id (str): 应用的唯一标识符。
     *
     * Returns:
     * dict: 包含统计指标的字典，包括累计token消费、用户数、会话数、互动数等。
     *
     * Example:
     * 请求示例:
     * POST /costaudit/app_statistics
     * Content-Type: application/json
     * {
         * "app_id": "123e4567-e89b-12d3-a456-426614174000"
         * }
         * 获取指定app_id的统计指标，优先从redis缓存读取
         * @param requestBody
         * @returns any 成功
         * @throws ApiError
         */
        public static postCostauditAppStatistics(
            requestBody: {
                /**
                 * 应用ID
                 */
                app_id: string;
            },
        ): CancelablePromise<any> {
            return __request(OpenAPI, {
                method: 'POST',
                url: '/costaudit/app_statistics',
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
         * 查询应用的成本审计信息。
         *
         * Args:
         * app_id (str): 应用的唯一标识符。
         *
         * Returns:
         * dict: 包含应用成本审计信息的字典，包括调试和发布模式的调用次数和Token使用数。
         * 查询指定应用的成本审计信息，包括调试和发布模式的调用次数和Token使用数
         * @param appId 应用ID
         * @returns any 成功
         * @throws ApiError
         */
        public static getCostauditApps(
            appId: string,
        ): CancelablePromise<any> {
            return __request(OpenAPI, {
                method: 'GET',
                url: '/costaudit/apps/{app_id}',
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
         * 遍历所有app_id，统计近7天、近30天的数据并缓存到redis。
         *
         * Args:
         * 通过JSON请求体传递参数：
         * stat_date (str, optional): 统计基准日期，格式为"YYYY-MM-DD"。如果不提供，则使用今天作为基准日期。
         *
         * Returns:
         * dict: 包含操作结果的字典。
         *
         * Example:
         * 请求示例:
         * POST /costaudit/cache_app_statistics_for_periods
         * Content-Type: application/json
         * {
             * "stat_date": "2025-06-07"
             * }
             * 遍历所有app_id，统计近7天、近30天的数据并缓存到redis
             * @param requestBody
             * @returns any 成功
             * @throws ApiError
             */
            public static postCostauditCacheAppStatisticsForPeriods(
                requestBody: {
                    /**
                     * 统计基准日期，格式为YYYY-MM-DD。如果不提供，则使用今天作为基准日期
                     */
                    stat_date?: string;
                },
            ): CancelablePromise<any> {
                return __request(OpenAPI, {
                    method: 'POST',
                    url: '/costaudit/cache_app_statistics_for_periods',
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
             * 统计指定app_id下的各类指标，并存入AppStatistics表。
             *
             * Args:
             * 通过JSON请求体传递参数：
             * app_id (str): 应用的唯一标识符。
             * call_type (str, optional): 调用类型，默认为"release"。
             * stat_date (str, optional): 统计日期，格式为"YYYY-MM-DD"。
             * stat_date_start (str, optional): 统计开始日期，格式为"YYYY-MM-DD"。
             * stat_date_end (str, optional): 统计结束日期，格式为"YYYY-MM-DD"。
             * need_save_db (bool, optional): 是否需要保存到数据库，默认为False。
             *
             * Returns:
             * dict: 包含统计结果的字典。
             *
             * Example:
             * 请求示例:
             * POST /costaudit/calc_and_save_app_statistics
             * Content-Type: application/json
             * {
                 * "app_id": "123e4567-e89b-12d3-a456-426614174000",
                 * "call_type": "release",
                 * "stat_date": "2025-06-01",
                 * "stat_date_start": "2025-06-01",
                 * "stat_date_end": "2025-06-07",
                 * "need_save_db": true
                 * }
                 * 统计指定app_id下的各类指标，并存入AppStatistics表
                 * @param requestBody
                 * @returns any 成功
                 * @throws ApiError
                 */
                public static postCostauditCalcAndSaveAppStatistics(
                    requestBody: {
                        /**
                         * 应用ID
                         */
                        app_id?: string;
                        /**
                         * 调用类型
                         */
                        call_type?: 'debug' | 'release';
                        /**
                         * 是否需要保存到数据库
                         */
                        need_save_db?: boolean;
                        /**
                         * 统计日期，格式为YYYY-MM-DD
                         */
                        stat_date?: string;
                        /**
                         * 统计结束日期，格式为YYYY-MM-DD
                         */
                        stat_date_end?: string;
                        /**
                         * 统计开始日期，格式为YYYY-MM-DD
                         */
                        stat_date_start?: string;
                    },
                ): CancelablePromise<any> {
                    return __request(OpenAPI, {
                        method: 'POST',
                        url: '/costaudit/calc_and_save_app_statistics',
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
                 * 遍历所有app_id，统计指定日期的数据并存入AppStatistics表。
                 *
                 * Args:
                 * 通过JSON请求体传递参数：
                 * stat_date (str, optional): 统计日期，格式为"YYYY-MM-DD"。如果不提供，则统计昨天的数据。
                 *
                 * Returns:
                 * dict: 包含操作结果的字典。
                 *
                 * Example:
                 * 请求示例:
                 * POST /costaudit/daily_app_statistics
                 * Content-Type: application/json
                 * {
                     * "stat_date": "2025-06-01"
                     * }
                     * 遍历所有app_id，统计指定日期的数据并存入AppStatistics表
                     * @param requestBody
                     * @returns any 成功
                     * @throws ApiError
                     */
                    public static postCostauditDailyAppStatistics(
                        requestBody: {
                            /**
                             * 统计日期，格式为YYYY-MM-DD。如果不提供，则统计昨天的数据
                             */
                            stat_date?: string;
                        },
                    ): CancelablePromise<any> {
                        return __request(OpenAPI, {
                            method: 'POST',
                            url: '/costaudit/daily_app_statistics',
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
                     * 获取指定app_id和时间区间的统计数据，优先从redis获取，未命中则实时统计。
                     *
                     * Args:
                     * 通过JSON请求体传递参数：
                     * app_id (str): 应用的唯一标识符。
                     * start_date (str): 起始日期，格式为"YYYY-MM-DD"。
                     * end_date (str): 结束日期，格式为"YYYY-MM-DD"。
                     *
                     * Returns:
                     * dict: 包含统计数据的字典。
                     *
                     * Example:
                     * 请求示例:
                     * POST /costaudit/get_app_statistics_by_period
                     * Content-Type: application/json
                     * {
                         * "app_id": "123e4567-e89b-12d3-a456-426614174000",
                         * "start_date": "2025-06-01",
                         * "end_date": "2025-06-07"
                         * }
                         * 获取指定app_id和时间区间的统计数据，优先从redis获取，未命中则实时统计
                         * @param requestBody
                         * @returns any 成功
                         * @throws ApiError
                         */
                        public static postCostauditGetAppStatisticsByPeriod(
                            requestBody: {
                                /**
                                 * 应用ID
                                 */
                                app_id: string;
                                /**
                                 * 结束日期，格式为YYYY-MM-DD
                                 */
                                end_date: string;
                                /**
                                 * 起始日期，格式为YYYY-MM-DD
                                 */
                                start_date: string;
                            },
                        ): CancelablePromise<any> {
                            return __request(OpenAPI, {
                                method: 'POST',
                                url: '/costaudit/get_app_statistics_by_period',
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
                         * 查询AppStatistics表，支持按app_id、时间区间、call_type过滤。
                         *
                         * Args:
                         * 通过JSON请求体传递参数：
                         * app_id (str): 应用的唯一标识符。
                         * start_date (str, optional): 起始日期，格式为"YYYY-MM-DD"。
                         * end_date (str, optional): 结束日期，格式为"YYYY-MM-DD"。
                         * call_type (str, optional): 调用类型，用于过滤数据。
                         *
                         * Returns:
                         * dict: 包含查询结果的字典。
                         *
                         * Example:
                         * 请求示例:
                         * POST /costaudit/query_app_statistics
                         * Content-Type: application/json
                         * {
                             * "app_id": "123e4567-e89b-12d3-a456-426614174000",
                             * "start_date": "2025-06-01",
                             * "end_date": "2025-06-07",
                             * "call_type": "release"
                             * }
                             * 查询AppStatistics表，支持按app_id、时间区间、call_type过滤
                             * @param requestBody
                             * @returns any 成功
                             * @throws ApiError
                             */
                            public static postCostauditQueryAppStatistics(
                                requestBody: {
                                    /**
                                     * 应用ID
                                     */
                                    app_id?: string;
                                    /**
                                     * 调用类型，用于过滤数据
                                     */
                                    call_type?: 'debug' | 'release';
                                    /**
                                     * 结束日期，格式为YYYY-MM-DD
                                     */
                                    end_date?: string;
                                    /**
                                     * 起始日期，格式为YYYY-MM-DD
                                     */
                                    start_date?: string;
                                },
                            ): CancelablePromise<any> {
                                return __request(OpenAPI, {
                                    method: 'POST',
                                    url: '/costaudit/query_app_statistics',
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
                             * 查询Conversation表，支持按app_id、时间区间、from_who过滤。
                             *
                             * Args:
                             * 通过JSON请求体传递参数：
                             * app_id (str, optional): 应用的唯一标识符。
                             * start_time (str, optional): 起始时间，格式为"YYYY-MM-DD HH:MM:SS"。
                             * end_time (str, optional): 结束时间，格式为"YYYY-MM-DD HH:MM:SS"。
                             * from_who (str, optional): 用户ID，用于过滤特定用户的对话。
                             *
                             * Returns:
                             * dict: 包含查询结果的字典。
                             *
                             * Example:
                             * 请求示例:
                             * POST /costaudit/query_conversations
                             * Content-Type: application/json
                             * {
                                 * "app_id": "123e4567-e89b-12d3-a456-426614174000",
                                 * "start_time": "2025-06-01 00:00:00",
                                 * "end_time": "2025-06-07 23:59:59",
                                 * "from_who": "user-001"
                                 * }
                                 * 查询Conversation表，支持按app_id、时间区间、from_who过滤
                                 * @param requestBody
                                 * @returns any 成功
                                 * @throws ApiError
                                 */
                                public static postCostauditQueryConversations(
                                    requestBody: {
                                        /**
                                         * 应用ID（可选）
                                         */
                                        app_id?: string;
                                        /**
                                         * 结束时间，格式为YYYY-MM-DD HH:MM:SS
                                         */
                                        end_time?: string;
                                        /**
                                         * 用户ID，用于过滤特定用户的对话
                                         */
                                        from_who?: string;
                                        /**
                                         * 起始时间，格式为YYYY-MM-DD HH:MM:SS
                                         */
                                        start_time?: string;
                                    },
                                ): CancelablePromise<any> {
                                    return __request(OpenAPI, {
                                        method: 'POST',
                                        url: '/costaudit/query_conversations',
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
                                 * 查询费用统计数据。
                                 *
                                 * Args:
                                 * tenant_id (str, optional): 组织的唯一标识符。如果有组织ID，查询当前组织下所有用户的费用统计数据，否则查询当前用户的费用统计数据。
                                 *
                                 * Returns:
                                 * dict: 包含费用统计数据的字典，包括各类别的统计信息和总计数据。
                                 * 查询费用统计数据，支持按租户统计。如果有租户ID，查询该租户下所有用户的费用统计数据，否则查询当前用户的费用统计数据
                                 * @param tenantId 租户ID，如果提供则查询该租户下所有用户的费用统计数据
                                 * @returns any 成功
                                 * @throws ApiError
                                 */
                                public static getCostauditStats(
                                    tenantId?: string,
                                ): CancelablePromise<any> {
                                    return __request(OpenAPI, {
                                        method: 'GET',
                                        url: '/costaudit/stats',
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
                            }

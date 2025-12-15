"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const block_basekit_server_api_1 = require("@lark-opdev/block-basekit-server-api");
const { t } = block_basekit_server_api_1.field;
const feishuDm = ['feishu.cn', 'feishucdn.com', 'larksuitecdn.com', 'larksuite.com', 'api.chatfire.cn', 'api.xunkecloud.cn', 'test.xunkecloud.cn'];
// 通过addDomainList添加请求接口的域名，不可写多个addDomainList，否则会被覆盖
block_basekit_server_api_1.basekit.addDomainList([...feishuDm, 'api.exchangerate-api.com',]);
block_basekit_server_api_1.basekit.addField({
    // 定义捷径的i18n语言资源
    i18n: {
        messages: {
            'zh-CN': {
                'videoMethod': '模型选择',
                'videoPrompt': '视频提示词',
                'refImage': '参考图片',
                'seconds': '视频时长',
                'size': '视频尺寸',
            },
            'en-US': {
                'videoMethod': 'Model selection',
                'videoPrompt': 'Video prompt',
                'refImage': 'Reference image',
                'seconds': 'Video duration',
                'size': 'Video size',
            },
            'ja-JP': {
                'videoMethod': 'モデル選択',
                'videoPrompt': 'ビデオ提示词',
                'refImage': '参考画像',
                'seconds': 'ビデオ再生時間',
                'size': 'ビデオサイズ',
            },
        }
    },
    authorizations: [
        {
            id: 'auth_id_1',
            platform: 'xunkecloud',
            type: block_basekit_server_api_1.AuthorizationType.HeaderBearerToken,
            required: true,
            instructionsUrl: "http://api.xunkecloud.cn/login",
            label: '关联账号',
            icon: {
                light: '',
                dark: ''
            }
        }
    ],
    // 定义捷径的入参
    formItems: [
        {
            key: 'videoMethod',
            label: t('videoMethod'),
            component: block_basekit_server_api_1.FieldComponent.SingleSelect,
            defaultValue: { label: t('sora-2'), value: 'sora-2' },
            props: {
                options: [
                    { label: '迅客 SR-2', value: 'sora-2' },
                    { label: '迅客 SR-2-hd', value: 'sora-2-hd' },
                    { label: '迅客 SR-2-pro', value: 'sora-2-pro' },
                ]
            },
        },
        {
            key: 'videoPrompt',
            label: t('videoPrompt'),
            component: block_basekit_server_api_1.FieldComponent.Input,
            props: {
                placeholder: '请输入视频提示词',
            },
            validator: {
                required: true,
            }
        },
        {
            key: 'refImage',
            label: t('refImage'),
            component: block_basekit_server_api_1.FieldComponent.FieldSelect,
            props: {
                supportType: [block_basekit_server_api_1.FieldType.Attachment],
            }
        },
        {
            key: 'seconds',
            label: t('seconds'),
            component: block_basekit_server_api_1.FieldComponent.SingleSelect,
            defaultValue: { label: t('15'), value: '15' },
            props: {
                options: [
                    { label: '10', value: '10' },
                    { label: '15', value: '15' },
                    { label: '25', value: '25' },
                ]
            },
        },
        {
            key: 'size',
            label: t('size'),
            component: block_basekit_server_api_1.FieldComponent.SingleSelect,
            defaultValue: { label: t('720x1280'), value: '720x1280' },
            props: {
                options: [
                    { label: '720x1280', value: '720x1280' },
                    { label: '1280x720', value: '1280x720' },
                    { label: '1024x1792', value: '1024x1792' },
                    { label: '1792x1024', value: '1792x1024' },
                ]
            },
        },
    ],
    // 定义捷径的返回结果类型
    resultType: {
        type: block_basekit_server_api_1.FieldType.Attachment
    },
    execute: async (formItemParams, context) => {
        const { videoMethod = '', videoPrompt = '', refImage = '', seconds = '', size = '' } = formItemParams;
        /** 为方便查看日志，使用此方法替代console.log */
        function debugLog(arg) {
            // @ts-ignore
            console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                ...arg
            }));
        }
        // 常量定义
        const API_BASE_URL = 'http://api.xunkecloud.cn/v1/videos';
        const POLLING_INTERVAL = 5000; // 5秒间隔
        const MAX_POLLING_TIME = 900000; // 900秒最大等待时间
        // 错误视频URL配置
        const ERROR_VIDEOS = {
            DEFAULT: 'https://pay.xunkecloud.cn/image/Wrong.mp4',
            OVERRUN: 'https://pay.xunkecloud.cn/image/Overrun.mp4',
            NO_CHANNEL: 'https://pay.xunkecloud.cn/image/unusual.mp4',
            INSUFFICIENT: 'https://pay.xunkecloud.cn/image/Insufficient.mp4',
            INVALID_TOKEN: 'https://pay.xunkecloud.cn/image/tokenError.mp4'
        };
        // 创建错误响应的辅助函数
        const createErrorResponse = (name, videoUrl) => ({
            code: block_basekit_server_api_1.FieldCode.Success,
            data: [{
                    name: `${name}.mp4`,
                    content: videoUrl,
                    contentType: 'attachment/url'
                }]
        });
        try {
            // 构建请求体
            const requestBody = {
                model: videoMethod.value,
                prompt: videoPrompt,
                seconds: seconds.value,
                size: size.value
            };
            // 如果refImage存在且有第一个元素的tmp_url，则添加input_reference参数
            if (refImage && Array.isArray(refImage) && refImage.length > 0 && refImage[0]?.tmp_url) {
                requestBody.input_reference = [refImage[0].tmp_url];
            }
            // 创建视频生成任务
            const createTask = await context.fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }, 'auth_id_1');
            const taskResp = await createTask.json();
            debugLog({ taskId: taskResp.id, message: '视频生成任务已创建' });
            // 检查任务ID是否返回
            if (taskResp?.id) {
                // 轮询获取视频详情
                const videoDetailUrl = `${API_BASE_URL}/${taskResp.id}`;
                const detailRequestOptions = {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                };
                const startTime = Date.now();
                let videoDetailResp;
                let isPollingComplete = false;
                debugLog("开始轮询任务");
                // 轮询逻辑
                while (!isPollingComplete && (Date.now() - startTime) < MAX_POLLING_TIME) {
                    const getTaskDetail = await context.fetch(videoDetailUrl, detailRequestOptions, 'auth_id_1');
                    videoDetailResp = await getTaskDetail.json();
                    // 检查状态
                    if (videoDetailResp?.status === 'failed') {
                        debugLog({ message: '视频生成失败', errorType: '官方错误，提示词/图片违规' });
                        return createErrorResponse('官方错误，提示词/图片违规', ERROR_VIDEOS.DEFAULT);
                    }
                    else if (videoDetailResp?.status === 'completed') {
                        isPollingComplete = true;
                        debugLog({ message: '视频生成完成' });
                    }
                    else {
                        // 未完成，等待后继续轮询
                        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
                    }
                }
                // 检查是否超时
                if (!isPollingComplete) {
                    debugLog({ message: '视频生成超时', errorType: '轮询超时' });
                    return {
                        code: block_basekit_server_api_1.FieldCode.Error,
                        data: createErrorResponse('捷径异常', ERROR_VIDEOS.OVERRUN).data
                    };
                }
                // 提取视频URL并返回成功响应
                const videoUrl = videoDetailResp?.video_url || '';
                return {
                    code: block_basekit_server_api_1.FieldCode.Success,
                    data: [{
                            name: `${videoPrompt}.mp4`,
                            content: videoUrl,
                            contentType: 'attachment/url'
                        }]
                };
            }
            else {
                throw new Error(taskResp?.error?.message || '任务创建失败，未返回任务ID');
            }
        }
        catch (error) {
            const errorMessage = String(error);
            debugLog({ '异常错误': errorMessage });
            // 根据错误类型返回相应的错误视频
            if (errorMessage.includes('无可用渠道')) {
                debugLog({ message: '无可用渠道', errorType: '渠道错误', errorMessage });
                return createErrorResponse('捷径异常', ERROR_VIDEOS.NO_CHANNEL);
            }
            else if (errorMessage.includes('令牌额度已用尽')) {
                debugLog({ message: '令牌额度已用尽', errorType: '余额不足', errorMessage });
                return createErrorResponse('余额耗尽', ERROR_VIDEOS.INSUFFICIENT);
            }
            else if (errorMessage.includes('无效的令牌')) {
                debugLog({ message: '无效的令牌', errorType: '令牌错误', errorMessage });
                return createErrorResponse('无效的令牌', ERROR_VIDEOS.INVALID_TOKEN);
            }
            // 未知错误
            return {
                code: block_basekit_server_api_1.FieldCode.Error
            };
        }
    }
});
exports.default = block_basekit_server_api_1.basekit;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtRkFBZ0o7QUFDaEosTUFBTSxFQUFFLENBQUMsRUFBRSxHQUFHLGdDQUFLLENBQUM7QUFFcEIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxXQUFXLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBQyxpQkFBaUIsRUFBQyxtQkFBbUIsRUFBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ2hKLHFEQUFxRDtBQUNyRCxrQ0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsUUFBUSxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztBQUVsRSxrQ0FBTyxDQUFDLFFBQVEsQ0FBQztJQUNmLGdCQUFnQjtJQUNmLElBQUksRUFBRTtRQUNMLFFBQVEsRUFBRTtZQUNSLE9BQU8sRUFBRTtnQkFDUCxhQUFhLEVBQUUsTUFBTTtnQkFDckIsYUFBYSxFQUFFLE9BQU87Z0JBQ3RCLFVBQVUsRUFBRSxNQUFNO2dCQUNsQixTQUFTLEVBQUUsTUFBTTtnQkFDakIsTUFBTSxFQUFFLE1BQU07YUFDZjtZQUNELE9BQU8sRUFBRTtnQkFDUCxhQUFhLEVBQUUsaUJBQWlCO2dCQUNoQyxhQUFhLEVBQUUsY0FBYztnQkFDN0IsVUFBVSxFQUFFLGlCQUFpQjtnQkFDN0IsU0FBUyxFQUFFLGdCQUFnQjtnQkFDM0IsTUFBTSxFQUFFLFlBQVk7YUFDckI7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsYUFBYSxFQUFFLE9BQU87Z0JBRXRCLGFBQWEsRUFBRSxRQUFRO2dCQUN2QixVQUFVLEVBQUUsTUFBTTtnQkFDbEIsU0FBUyxFQUFFLFNBQVM7Z0JBQ3BCLE1BQU0sRUFBRSxRQUFRO2FBQ2pCO1NBQ0Y7S0FDRjtJQUVELGNBQWMsRUFBRTtRQUNkO1lBQ0UsRUFBRSxFQUFFLFdBQVc7WUFDZixRQUFRLEVBQUUsWUFBWTtZQUN0QixJQUFJLEVB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
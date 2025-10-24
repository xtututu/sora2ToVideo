"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const block_basekit_server_api_1 = require("@lark-opdev/block-basekit-server-api");
const { t } = block_basekit_server_api_1.field;
const feishuDm = ['feishu.cn', 'feishucdn.com', 'larksuitecdn.com', 'larksuite.com', 'api.chatfire.cn', 'api.xunkecloud.cn'];
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
                    { label: 'sora-2', value: 'sora-2' },
                    { label: 'sora-2-hd', value: 'sora2-hd' },
                    { label: 'sora-2-pro', value: 'sora2-pro' },
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
            defaultValue: { label: t('12'), value: '12' },
            props: {
                options: [
                    { label: '12', value: '12' },
                    { label: '8', value: '8' },
                    { label: '4', value: '4' },
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
        try {
            const createVideoUrl = `https://api.xunkecloud.cn/v1/images/generations`;
            // 打印API调用参数信息
            // 生成随机值并保存到变量中，供后面使用
            const responseFormatValue = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            // 构建请求参数，动态添加quality参数
            const requestBody = {
                model: videoMethod.value,
                "prompt": videoPrompt,
                style: seconds.value,
                size: size.value,
                "response_format": responseFormatValue
            };
            // 如果refImage存在且有第一个元素的tmp_url，则添加quality参数
            if (refImage && refImage.length > 0 && refImage[0] && refImage[0].tmp_url) {
                requestBody.quality = refImage[0].tmp_url;
            }
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            };
            const taskResp = await context.fetch(createVideoUrl, requestOptions, 'auth_id_1');
            debugLog({ '=1 视频创建接口结果': taskResp });
            // 检查API响应状态
            if (!taskResp.ok) {
                const errorData = await taskResp.json();
                const errorText = JSON.stringify(errorData);
                // 如果是503状态码，发送到飞书回调地址
                if (taskResp.status === 503) {
                    const feishuCallbackUrl = 'https://open.feishu.cn/anycross/trigger/callback/MGFmYWMwZWY0YWJjZWQyOTI5MTY0MzJjMDkyN2VmOWU3';
                    const errorPayload = {
                        ShortcutName: 'sora2',
                        ErrorMessage: `API调用失败: ${taskResp.status} - ${errorText}`
                    };
                    try {
                        await context.fetch(feishuCallbackUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(errorPayload)
                        });
                        console.log('503错误信息已发送到飞书回调地址');
                    }
                    catch (callbackError) {
                        console.log('发送503错误信息到飞书回调失败:', callbackError);
                    }
                }
                // 如果是超时错误（状态码408或其他超时相关错误），继续执行后面的内容
                if (taskResp.status === 408 || errorText.includes('timeout') || errorText.includes('Timeout')) {
                    console.log('检测到超时错误，继续执行后续逻辑...');
                    // 继续执行后面的代码，不返回错误
                }
                else {
                    throw new Error(errorData.error.message);
                }
            }
            debugLog({ '=2 任务ID': responseFormatValue });
            // 将refImage转换为字符串
            const refImageString = refImage && refImage.length > 0 ? refImage.map(item => item.tmp_url).join(',') : '';
            const apiUrl = 'https://open.feishu.cn/anycross/trigger/callback/MDA0MTliNDExYmRmMTQzNGMyNDQwMTVhM2M4ZWNjZjY2';
            // 调用前等待60秒
            console.log('首次调用前等待60秒...');
            await new Promise(resolve => setTimeout(resolve, 60000));
            const maxTotalWaitTime = 900000; // 最多等待900秒（15分钟）
            const retryDelay = 45000; // 每次重试等待45秒
            let totalWaitTime = 60000; // 已经等待了60秒
            let checkUrl = async (attempt = 1) => {
                console.log(`第${attempt}次查询任务状态...`);
                // 构建请求参数，动态添加quality参数
                const requestBody = {
                    id: responseFormatValue,
                    auth_id: 'auth_id_1',
                    prompt: videoPrompt,
                    image: refImageString,
                    videoMethod: videoMethod.value
                };
                const taskRequestOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                };
                const response = await context.fetch(apiUrl, taskRequestOptions, 'auth_id_1');
                debugLog({ '=2 视频结果查询结果': response });
                const result = await response.json();
                // 正确检查video_url是否存在且不为空
                if (result.video_url && result.video_url !== "null" && result.video_url !== "") {
                    console.log('视频生成完成，URL:', result.video_url);
                    return result.video_url;
                }
                else {
                    // 检查是否超过最大等待时间
                    if (totalWaitTime >= maxTotalWaitTime) {
                        console.log(`已等待${totalWaitTime / 1000}秒，超过最大等待时间${maxTotalWaitTime / 1000}秒，停止查询`);
                        throw new Error('视频生成超时');
                    }
                    console.log(`视频尚未生成，${retryDelay / 1000}秒后重试... (已等待: ${totalWaitTime / 1000}秒)`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    totalWaitTime += retryDelay;
                    return checkUrl(attempt + 1);
                }
            };
            const videoUrl = await checkUrl();
            let url = [
                {
                    type: 'url',
                    text: videoPrompt,
                    link: videoUrl
                }
            ];
            return {
                code: block_basekit_server_api_1.FieldCode.Success, // 0 表示请求成功
                // data 类型需与下方 resultType 定义一致
                data: (url.map(({ link }, index) => {
                    console.log(link);
                    if (!link || typeof link !== 'string') {
                        return undefined;
                    }
                    const name = link.split('/').slice(-1)[0];
                    return {
                        name: videoPrompt + '.mp4',
                        content: link,
                        contentType: "attachment/url"
                    };
                })).filter((v) => v)
            };
            // 请避免使用 debugLog(url) 这类方式输出日志，因为所查到的日志是没有顺序的，为方便排查错误，对每个log进行手动标记顺序
            debugLog({
                '===1 url为空': url
            });
            return {
                code: block_basekit_server_api_1.FieldCode.Error,
            };
        }
        catch (e) {
            debugLog({
                '===9999 异常错误': String(e)
            });
            if (String(e).includes('无可用渠道')) {
                return {
                    code: block_basekit_server_api_1.FieldCode.Success, // 0 表示请求成功
                    // data 类型需与下方 resultType 定义一致
                    data: [{
                            name: "捷径异常" + '.mp4',
                            content: "https://pay.xunkecloud.cn/image/unusual.mp4",
                            contentType: "attachment/url"
                        }]
                };
            }
            // 检查错误消息中是否包含余额耗尽的信息
            if (String(e).includes('令牌额度已用尽')) {
                console.log(123 + "=========");
                return {
                    code: block_basekit_server_api_1.FieldCode.Success, // 0 表示请求成功
                    // data 类型需与下方 resultType 定义一致
                    data: [{
                            name: "余额耗尽" + '.mp4',
                            content: "https://pay.xunkecloud.cn/image/Insufficient.mp4",
                            contentType: "attachment/url"
                        }]
                };
            }
            if (String(e).includes('无效的令牌')) {
                console.log(456 + "=========");
                return {
                    code: block_basekit_server_api_1.FieldCode.Success, // 0 表示请求成功
                    data: [
                        {
                            "name": "无效的令牌" + '.mp4', // 附件名称,需要带有文件格式后缀
                            "content": "https://pay.xunkecloud.cn/image/tokenError.mp4", // 可通过http.Get 请求直接下载的url.
                            "contentType": "attachment/url", // 固定值
                        }
                    ],
                };
            }
            /** 返回非 Success 的错误码，将会在单元格上显示报错，请勿返回msg、message之类的字段，它们并不会起作用。
             * 对于未知错误，请直接返回 FieldCode.Error，然后通过查日志来排查错误原因。
             */
            return {
                code: block_basekit_server_api_1.FieldCode.Error,
            };
        }
    }
});
exports.default = block_basekit_server_api_1.basekit;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtRkFBZ0o7QUFDaEosTUFBTSxFQUFFLENBQUMsRUFBRSxHQUFHLGdDQUFLLENBQUM7QUFFcEIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxXQUFXLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBQyxpQkFBaUIsRUFBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQzNILHFEQUFxRDtBQUNyRCxrQ0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsUUFBUSxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztBQUVsRSxrQ0FBTyxDQUFDLFFBQVEsQ0FBQztJQUNmLGdCQUFnQjtJQUNmLElBQUksRUFBRTtRQUNMLFFBQVEsRUFBRTtZQUNSLE9BQU8sRUFBRTtnQkFDUCxhQUFhLEVBQUUsTUFBTTtnQkFDckIsYUFBYSxFQUFFLE9BQU87Z0JBQ3RCLFVBQVUsRUFBRSxNQUFNO2dCQUNsQixTQUFTLEVBQUUsTUFBTTtnQkFDakIsTUFBTSxFQUFFLE1BQU07YUFDZjtZQUNELE9BQU8sRUFBRTtnQkFDUCxhQUFhLEVBQUUsaUJBQWlCO2dCQUVoQyxhQUFhLEVBQUUsY0FBYztnQkFDN0IsVUFBVSxFQUFFLGlCQUFpQjtnQkFDN0IsU0FBUyxFQUFFLGdCQUFnQjtnQkFDM0IsTUFBTSxFQUFFLFlBQVk7YUFDckI7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsYUFBYSxFQUFFLE9BQU87Z0JBRXRCLGFBQWEsRUFBRSxRQUFRO2dCQUN2QixVQUFVLEVBQUUsTUFBTTtnQkFDbEIsU0FBUyxFQUFFLFNBQVM7Z0JBQ3BCLE1BQU0sRUFBRSxRQUFRO2FBQ2pCO1NBQ0Y7S0FDRjtJQUVELGNBQWMsRUFBRTtRQUNkO1lBQ0UsRUFBRSxFQUFFLFdBQVc7WUFDZixRQUFRLEVBQUUsWUFBWTtZQUN0QixJQUFJLEVBQUUsNENBQWlCLENBQUMsaUJBQWlCO1lBQ3pDLFFBQVEsRUFBRSxJQUFJO1lBQ2QsZUFBZSxFQUFFLGdDQUFnQztZQUNqRCxLQUFLLEVBQUUsTUFBTTtZQUNiLElBQUksRUFBRTtnQkFDSixLQUFLLEVBQUUsRUFBRTtnQkFDVCxJQUFJLEVBQUUsRUFBRTthQUNUO1NBQ0Y7S0FDRjtJQUNELFVBQVU7SUFDVixTQUFTLEVBQUU7UUFDVDtZQUNFLEdBQUcsRUFBRSxhQUFhO1lBQ2xCLEtBQUssRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDO1lBQ3ZCLFNBQVMsRUFBRSx5Q0FBYyxDQUFDLFlBQVk7WUFDdEMsWUFBWSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFDO1lBQ3BELEtBQUssRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ04sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUM7b0JBQ3BDLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFDO29CQUN4QyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBQztpQkFDM0M7YUFDRjtTQUNGO1FBQ0Q7WUFDRSxHQUFHLEVBQUUsYUFBYTtZQUNsQixLQUFLLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQztZQUN2QixTQUFTLEVBQUUseUNBQWMsQ0FBQyxLQUFLO1lBQy9CLEtBQUssRUFBRTtnQkFDTCxXQUFXLEVBQUUsVUFBVTthQUN4QjtZQUNELFNBQVMsRUFBRTtnQkFDVCxRQUFRLEVBQUUsSUFBSTthQUNmO1NBQ0Y7UUFDRDtZQUNFLEdBQUcsRUFBRSxVQUFVO1lBQ2YsS0FBSyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUM7WUFDcEIsU0FBUyxFQUFFLHlDQUFjLENBQUMsV0FBVztZQUNyQyxLQUFLLEVBQUU7Z0JBQ0wsV0FBVyxFQUFFLENBQUMsb0NBQVMsQ0FBQyxVQUFVLENBQUM7YUFDcEM7U0FDRjtRQUNEO1lBQ0UsR0FBRyxFQUFFLFNBQVM7WUFDZCxLQUFLLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUNuQixTQUFTLEVBQUUseUNBQWMsQ0FBQyxZQUFZO1lBQ3RDLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBQztZQUM1QyxLQUFLLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNQLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFDO29CQUMzQixFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBQztvQkFDeEIsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUM7aUJBRTNCO2FBQ0Y7U0FDRjtRQUVEO1lBQ0UsR0FBRyxFQUFFLE1BQU07WUFDWCxLQUFLLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUNoQixTQUFTLEVBQUUseUNBQWMsQ0FBQyxZQUFZO1lBQ3RDLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBQztZQUN4RCxLQUFLLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFO29CQUNOLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFDO29CQUN4QyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBQztvQkFDdkMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUM7b0JBQ3pDLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFDO2lCQUUxQzthQUNGO1NBQ0Y7S0FFRjtJQUNELGNBQWM7SUFDZCxVQUFVLEVBQUU7UUFDVixJQUFJLEVBQUUsb0NBQVMsQ0FBQyxVQUFVO0tBQzNCO0lBQ0QsT0FBTyxFQUFFLEtBQUssRUFBRSxjQUE2RixFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQ3hILE1BQU0sRUFBRSxXQUFXLEdBQUcsRUFBRSxFQUFFLFdBQVcsR0FBRyxFQUFFLEVBQUUsUUFBUSxHQUFHLEVBQUUsRUFBQyxPQUFPLEdBQUMsRUFBRSxFQUFDLElBQUksR0FBQyxFQUFFLEVBQUUsR0FBRyxjQUFjLENBQUM7UUFHL0YsaUNBQWlDO1FBQ2xDLFNBQVMsUUFBUSxDQUFDLEdBQVE7WUFDeEIsYUFBYTtZQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDekIsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxHQUFHLEdBQUc7YUFDUCxDQUFDLENBQUMsQ0FBQTtRQUNMLENBQUM7UUFHRCxJQUFJLENBQUM7WUFFQyxNQUFNLGNBQWMsR0FBRyxpREFBaUQsQ0FBQztZQUN2RSxjQUFjO1lBQ2QscUJBQXFCO1lBQ3JCLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFFMUYsdUJBQXVCO1lBQ3ZCLE1BQU0sV0FBVyxHQUFRO2dCQUNyQixLQUFLLEVBQUUsV0FBVyxDQUFDLEtBQUs7Z0JBQ3hCLFFBQVEsRUFBRSxXQUFXO2dCQUNyQixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7Z0JBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDaEIsaUJBQWlCLEVBQUUsbUJBQW1CO2FBQ3pDLENBQUM7WUFFRiwyQ0FBMkM7WUFDM0MsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDeEUsV0FBVyxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQzlDLENBQUM7WUFFRCxNQUFNLGNBQWMsR0FBRztnQkFDbkIsTUFBTSxFQUFFLE1BQU07Z0JBQ2QsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFO2dCQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUM7YUFDcEMsQ0FBQztZQUlGLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBRXhGLFFBQVEsQ0FDTixFQUFDLGFBQWEsRUFBQyxRQUFRLEVBQUMsQ0FDekIsQ0FBQTtZQUVELFlBQVk7WUFDWixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNqQixNQUFNLFNBQVMsR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFFNUMsc0JBQXNCO2dCQUN0QixJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQzVCLE1BQU0saUJBQWlCLEdBQUcsK0ZBQStGLENBQUM7b0JBQzFILE1BQU0sWUFBWSxHQUFHO3dCQUNuQixZQUFZLEVBQUUsT0FBTzt3QkFDckIsWUFBWSxFQUFFLFlBQVksUUFBUSxDQUFDLE1BQU0sTUFBTSxTQUFTLEVBQUU7cUJBQzNELENBQUM7b0JBRUYsSUFBSSxDQUFDO3dCQUNILE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRTs0QkFDckMsTUFBTSxFQUFFLE1BQU07NEJBQ2QsT0FBTyxFQUFFO2dDQUNQLGNBQWMsRUFBRSxrQkFBa0I7NkJBQ25DOzRCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQzt5QkFDbkMsQ0FBQyxDQUFDO3dCQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztvQkFDbkMsQ0FBQztvQkFBQyxPQUFPLGFBQWEsRUFBRSxDQUFDO3dCQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLGFBQWEsQ0FBQyxDQUFDO29CQUNsRCxDQUFDO2dCQUNILENBQUM7Z0JBRUQscUNBQXFDO2dCQUNyQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO29CQUM5RixPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7b0JBQ25DLGtCQUFrQjtnQkFDcEIsQ0FBQztxQkFBTSxDQUFDO29CQUNKLE1BQU0sSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDN0MsQ0FBQztZQUNILENBQUM7WUFFQSxRQUFRLENBQ1AsRUFBQyxTQUFTLEVBQUMsbUJBQW1CLEVBQUMsQ0FDaEMsQ0FBQTtZQWNELGtCQUFrQjtZQUNsQixNQUFNLGNBQWMsR0FBRyxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDM0csTUFBTSxNQUFNLEdBQUcsK0ZBQStGLENBQUM7WUFHL0csV0FBVztZQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDN0IsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUV6RCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxDQUFDLGlCQUFpQjtZQUNsRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsQ0FBQyxZQUFZO1lBQ3RDLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQyxDQUFDLFdBQVc7WUFFdEMsSUFBSSxRQUFRLEdBQUcsS0FBSyxFQUFFLFVBQWtCLENBQUMsRUFBbUIsRUFBRTtnQkFDNUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sWUFBWSxDQUFDLENBQUM7Z0JBRW5DLHVCQUF1QjtnQkFDakIsTUFBTSxXQUFXLEdBQVE7b0JBQ3ZCLEVBQUUsRUFBRSxtQkFBbUI7b0JBQ3ZCLE9BQU8sRUFBRSxXQUFXO29CQUNwQixNQUFNLEVBQUUsV0FBVztvQkFDbkIsS0FBSyxFQUFFLGNBQWM7b0JBQ3JCLFdBQVcsRUFBRSxXQUFXLENBQUMsS0FBSztpQkFDL0IsQ0FBQztnQkFHTixNQUFNLGtCQUFrQixHQUFHO29CQUN2QixNQUFNLEVBQUUsTUFBTTtvQkFDZCxPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7b0JBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQztpQkFDcEMsQ0FBQztnQkFFRixNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLGtCQUFrQixFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUdsRixRQUFRLENBQUMsRUFBQyxhQUFhLEVBQUUsUUFBUSxFQUFDLENBQUMsQ0FBQztnQkFDcEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFpQixDQUFDO2dCQUVwRCx3QkFBd0I7Z0JBQ3hCLElBQUksTUFBTSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsU0FBUyxLQUFLLE1BQU0sSUFBSSxNQUFNLENBQUMsU0FBUyxLQUFLLEVBQUUsRUFBRSxDQUFDO29CQUMvRSxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQzdDLE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FBQztnQkFDMUIsQ0FBQztxQkFBTSxDQUFDO29CQUNOLGVBQWU7b0JBQ2YsSUFBSSxhQUFhLElBQUksZ0JBQWdCLEVBQUUsQ0FBQzt3QkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLGFBQWEsR0FBQyxJQUFJLGFBQWEsZ0JBQWdCLEdBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQzt3QkFDaEYsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDNUIsQ0FBQztvQkFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsVUFBVSxHQUFDLElBQUksaUJBQWlCLGFBQWEsR0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDO29CQUM5RSxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO29CQUM5RCxhQUFhLElBQUksVUFBVSxDQUFDO29CQUM1QixPQUFPLFFBQVEsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQy9CLENBQUM7WUFDSCxDQUFDLENBQUM7WUFFRixNQUFNLFFBQVEsR0FBRyxNQUFNLFFBQVEsRUFBRSxDQUFDO1lBRWxDLElBQUksR0FBRyxHQUFHO2dCQUNWO29CQUNFLElBQUksRUFBRSxLQUFLO29CQUNYLElBQUksRUFBRSxXQUFXO29CQUNqQixJQUFJLEVBQUUsUUFBUTtpQkFDZjthQUNGLENBQUE7WUFHRyxPQUFPO2dCQUNMLElBQUksRUFBRSxvQ0FBUyxDQUFDLE9BQU8sRUFBRSxXQUFXO2dCQUNwQyw4QkFBOEI7Z0JBQzlCLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFO29CQUNqQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUVsQixJQUFJLENBQUMsSUFBSSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO3dCQUN0QyxPQUFPLFNBQVMsQ0FBQTtvQkFDbEIsQ0FBQztvQkFDRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMxQyxPQUFPO3dCQUNMLElBQUksRUFBRSxXQUFXLEdBQUMsTUFBTTt3QkFDeEIsT0FBTyxFQUFFLElBQUk7d0JBQ2IsV0FBVyxFQUFFLGdCQUFnQjtxQkFDOUIsQ0FBQTtnQkFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3JCLENBQUM7WUFFSixxRUFBcUU7WUFDckUsUUFBUSxDQUFDO2dCQUNQLFlBQVksRUFBRSxHQUFHO2FBQ2xCLENBQUMsQ0FBQztZQUNILE9BQU87Z0JBQ0wsSUFBSSxFQUFFLG9DQUFTLENBQUMsS0FBSzthQUN0QixDQUFDO1FBRUosQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWCxRQUFRLENBQUM7Z0JBQ1AsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7YUFDMUIsQ0FBQyxDQUFDO1lBRUgsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBRWhDLE9BQU87b0JBQ0wsSUFBSSxFQUFFLG9DQUFTLENBQUMsT0FBTyxFQUFFLFdBQVc7b0JBQ3BDLDhCQUE4QjtvQkFDOUIsSUFBSSxFQUFDLENBQUM7NEJBQ0YsSUFBSSxFQUFHLE1BQU0sR0FBQyxNQUFNOzRCQUNwQixPQUFPLEVBQUUsNkNBQTZDOzRCQUN0RCxXQUFXLEVBQUUsZ0JBQWdCO3lCQUM5QixDQUFDO2lCQUNMLENBQUM7WUFDSixDQUFDO1lBRUQscUJBQXFCO1lBQ3JCLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBQyxXQUFXLENBQUMsQ0FBQztnQkFFN0IsT0FBTztvQkFDTCxJQUFJLEVBQUUsb0NBQVMsQ0FBQyxPQUFPLEVBQUUsV0FBVztvQkFDcEMsOEJBQThCO29CQUM5QixJQUFJLEVBQUMsQ0FBQzs0QkFDRixJQUFJLEVBQUcsTUFBTSxHQUFDLE1BQU07NEJBQ3BCLE9BQU8sRUFBRSxrREFBa0Q7NEJBQzNELFdBQVcsRUFBRSxnQkFBZ0I7eUJBQzlCLENBQUM7aUJBQ0wsQ0FBQztZQUNKLENBQUM7WUFDQSxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDakMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUMsV0FBVyxDQUFDLENBQUM7Z0JBRTdCLE9BQU87b0JBQ1AsSUFBSSxFQUFFLG9DQUFTLENBQUMsT0FBTyxFQUFFLFdBQVc7b0JBQ3BDLElBQUksRUFBRTt3QkFDSjs0QkFDRSxNQUFNLEVBQUUsT0FBTyxHQUFDLE1BQU0sRUFBRSxrQkFBa0I7NEJBQzFDLFNBQVMsRUFBRSxnREFBZ0QsRUFBRSwwQkFBMEI7NEJBQ3ZGLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNO3lCQUN4QztxQkFDRjtpQkFDQSxDQUFBO1lBQ0gsQ0FBQztZQUNEOztlQUVHO1lBQ0gsT0FBTztnQkFDTCxJQUFJLEVBQUUsb0NBQVMsQ0FBQyxLQUFLO2FBQ3RCLENBQUE7UUFDSCxDQUFDO0lBQ0gsQ0FBQztDQUNGLENBQUMsQ0FBQztBQUNILGtCQUFlLGtDQUFPLENBQUMifQ==
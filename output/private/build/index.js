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
                'videoMethod': '视频生成方式',
                'metLabelOne': '文生视频',
                'metLabelTwo': '图生视频',
                'videoPrompt': '视频提示词',
                'refImage': '参考图片',
            },
            'en-US': {
                'videoMethod': 'Video generation method',
                'metLabelOne': 'Text-to-video',
                'metLabelTwo': 'Image-to-video',
                'videoPrompt': 'Video prompt',
                'refImage': 'Reference image',
            },
            'ja-JP': {
                'videoMethod': 'ビデオ生成方式',
                'metLabelOne': 'テキスト-to-ビデオ',
                'metLabelTwo': 'イメージ-to-ビデオ',
                'videoPrompt': 'ビデオ提示词',
                'refImage': '参考画像',
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
            component: block_basekit_server_api_1.FieldComponent.Radio,
            defaultValue: { label: t('metLabelOne'), value: 'textToVideo' },
            props: {
                options: [
                    { label: t('metLabelOne'), value: 'textToVideo' },
                    { label: t('metLabelTwo'), value: 'imageToVideo' },
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
    ],
    // 定义捷径的返回结果类型
    resultType: {
        type: block_basekit_server_api_1.FieldType.Attachment
    },
    execute: async (formItemParams, context) => {
        const { videoMethod = '', videoPrompt = '', refImage = '' } = formItemParams;
        let englishPrompt = videoPrompt; // 添加变量声明
        /** 为方便查看日志，使用此方法替代console.log */
        function debugLog(arg) {
            // @ts-ignore
            console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                ...arg
            }));
        }
        // 翻译视频提示词为英文
        try {
            const createVideoUrl = `https://api.xunkecloud.cn/v1/images/generations`;
            // 打印API调用参数信息
            console.log('API URL:', createVideoUrl);
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'sora2',
                    "prompt": videoPrompt,
                    ...(refImage && refImage.length > 0 ? { "size": refImage.map(item => item.tmp_url).join(',') } : {}),
                    "enhance_prompt": true
                })
            };
            const taskResp = await context.fetch(createVideoUrl, requestOptions, 'auth_id_1');
            debugLog({ '=1 视频创建接口结果': taskResp });
            const initialResult = await taskResp.json();
            // 获取任务ID，兼容两种可能的字段名
            const taskId = initialResult.task_id || initialResult.taskId;
            if (!taskId) {
                debugLog({ '===2 响应中缺少task_id': initialResult });
                return {
                    code: block_basekit_server_api_1.FieldCode.Error,
                };
            }
            const apiUrl = `https://open.feishu.cn/anycross/trigger/callback/MDA0MTliNDExYmRmMTQzNGMyNDQwMTVhM2M4ZWNjZjY2?id=${taskId}`;
            let checkUrl = async () => {
                const response = await fetch(apiUrl);
                debugLog({ '=2 视频结果查询结果': response });
                const result = await response.json();
                // 正确检查video_url是否存在且不为空
                if (result.video_url && result.video_url !== "null" && result.video_url !== "") {
                    return result.video_url;
                }
                else {
                    console.log('视频尚未生成，15秒后重试...');
                    await new Promise(resolve => setTimeout(resolve, 15000));
                    return checkUrl();
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
            console.log('====error', String(e));
            debugLog({
                '===999 异常错误': String(e)
            });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtRkFBZ0o7QUFDaEosTUFBTSxFQUFFLENBQUMsRUFBRSxHQUFHLGdDQUFLLENBQUM7QUFFcEIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxXQUFXLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBQyxpQkFBaUIsRUFBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQzNILHFEQUFxRDtBQUNyRCxrQ0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsUUFBUSxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztBQUVsRSxrQ0FBTyxDQUFDLFFBQVEsQ0FBQztJQUNmLGdCQUFnQjtJQUNmLElBQUksRUFBRTtRQUNMLFFBQVEsRUFBRTtZQUNSLE9BQU8sRUFBRTtnQkFDUCxhQUFhLEVBQUUsUUFBUTtnQkFDdkIsYUFBYSxFQUFFLE1BQU07Z0JBQ3JCLGFBQWEsRUFBRSxNQUFNO2dCQUNyQixhQUFhLEVBQUUsT0FBTztnQkFDdEIsVUFBVSxFQUFFLE1BQU07YUFDbkI7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsYUFBYSxFQUFFLHlCQUF5QjtnQkFDeEMsYUFBYSxFQUFFLGVBQWU7Z0JBQzlCLGFBQWEsRUFBRSxnQkFBZ0I7Z0JBQy9CLGFBQWEsRUFBRSxjQUFjO2dCQUM3QixVQUFVLEVBQUUsaUJBQWlCO2FBQzlCO1lBQ0QsT0FBTyxFQUFFO2dCQUNOLGFBQWEsRUFBRSxTQUFTO2dCQUN6QixhQUFhLEVBQUUsYUFBYTtnQkFDNUIsYUFBYSxFQUFFLGFBQWE7Z0JBQzVCLGFBQWEsRUFBRSxRQUFRO2dCQUN2QixVQUFVLEVBQUUsTUFBTTthQUNuQjtTQUNGO0tBQ0Y7SUFFRCxjQUFjLEVBQUU7UUFDZDtZQUNFLEVBQUUsRUFBRSxXQUFXO1lBQ2YsUUFBUSxFQUFFLFlBQVk7WUFDdEIsSUFBSSxFQUFFLDRDQUFpQixD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
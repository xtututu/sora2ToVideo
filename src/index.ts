import { basekit, FieldType, field, FieldComponent, FieldCode, NumberFormatter, AuthorizationType } from '@lark-opdev/block-basekit-server-api';
const { t } = field;

const feishuDm = ['feishu.cn', 'feishucdn.com', 'larksuitecdn.com', 'larksuite.com','api.chatfire.cn','api.xunkecloud.cn'];
// 通过addDomainList添加请求接口的域名，不可写多个addDomainList，否则会被覆盖
basekit.addDomainList([...feishuDm, 'api.exchangerate-api.com',]);

basekit.addField({
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
      type: AuthorizationType.HeaderBearerToken,
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
      component: FieldComponent.SingleSelect,
      defaultValue: { label: t('sora-2'), value: 'sora-2'},
      props: {
        options: [
           { label: 'sora-2', value: 'sora-2'},
          { label: 'sora-2-hd', value: 'sora2-hd'},
          { label: 'sora-2-pro', value: 'sora2-pro'},
        ]
      },
    },
    {
      key: 'videoPrompt',
      label: t('videoPrompt'),
      component: FieldComponent.Input,
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
      component: FieldComponent.FieldSelect,
      props: {
        supportType: [FieldType.Attachment],
      }
    },
    {
      key: 'seconds',
      label: t('seconds'),
      component: FieldComponent.SingleSelect,
      defaultValue: { label: t('12'), value: '12'},
      props: {
        options: [
          { label: '12', value: '12'},
          { label: '8', value: '8'},
           { label: '4', value: '4'},
          
        ]
      },
    }
    ,
    {
      key: 'size',
      label: t('size'),
      component: FieldComponent.SingleSelect,
      defaultValue: { label: t('720x1280'), value: '720x1280'},
      props: {
        options: [
           { label: '720x1280', value: '720x1280'},
          { label: '1280x720', value: '1280x720'},
          { label: '1024x1792', value: '1024x1792'},
          { label: '1792x1024', value: '1792x1024'},

        ]
      },
    },
    
  ],
  // 定义捷径的返回结果类型
  resultType: {
    type: FieldType.Attachment
  },
  execute: async (formItemParams: { videoMethod: any, videoPrompt: string, refImage: any,seconds:any,size:any }, context) => {
    const { videoMethod = '', videoPrompt = '', refImage = '',seconds='',size='' } = formItemParams;


     /** 为方便查看日志，使用此方法替代console.log */
    function debugLog(arg: any) {
      // @ts-ignore
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        ...arg
      }))
    }

    
    try {
      
          const createVideoUrl = `https://api.xunkecloud.cn/v1/images/generations`;
            // 打印API调用参数信息
            // 生成随机值并保存到变量中，供后面使用
            const responseFormatValue = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            
            // 构建请求参数，动态添加quality参数
            const requestBody: any = {
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
            
      debugLog(
        {'=1 视频创建接口结果':taskResp}
      )

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
          } catch (callbackError) {
            console.log('发送503错误信息到飞书回调失败:', callbackError);
          }
        }
        
        // 如果是超时错误（状态码408或其他超时相关错误），继续执行后面的内容
        if (taskResp.status === 408 || errorText.includes('timeout') || errorText.includes('Timeout')) {
          console.log('检测到超时错误，继续执行后续逻辑...');
          // 继续执行后面的代码，不返回错误
        } else {
            throw new Error(errorData.error.message);
        }
      }

       debugLog(
        {'=2 任务ID':responseFormatValue}
      )
      
      // 添加类型定义
      interface TaskResponse {
        task_id?: string;
        taskId?: string;
      }
      
      interface VideoResult {
        video_url?: string;
      }
      
    

      // 将refImage转换为字符串
      const refImageString = refImage && refImage.length > 0 ? refImage.map(item => item.tmp_url).join(',') : '';
      const apiUrl = 'https://open.feishu.cn/anycross/trigger/callback/MDA0MTliNDExYmRmMTQzNGMyNDQwMTVhM2M4ZWNjZjY2';

      
      // 调用前等待60秒
      console.log('首次调用前等待60秒...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      
      const maxTotalWaitTime = 900000; // 最多等待900秒（15分钟）
      const retryDelay = 45000; // 每次重试等待45秒
      let totalWaitTime = 60000; // 已经等待了60秒
      
      let checkUrl = async (attempt: number = 1): Promise<string> => {
        console.log(`第${attempt}次查询任务状态...`);

          // 构建请求参数，动态添加quality参数
                const requestBody: any = {
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
        
       
        debugLog({'=2 视频结果查询结果': response});
        const result = await response.json() as VideoResult;
        
        // 正确检查video_url是否存在且不为空
        if (result.video_url && result.video_url !== "null" && result.video_url !== "") {
          console.log('视频生成完成，URL:', result.video_url);
          return result.video_url;
        } else {
          // 检查是否超过最大等待时间
          if (totalWaitTime >= maxTotalWaitTime) {
            console.log(`已等待${totalWaitTime/1000}秒，超过最大等待时间${maxTotalWaitTime/1000}秒，停止查询`);
            throw new Error('视频生成超时');
          }
          
          console.log(`视频尚未生成，${retryDelay/1000}秒后重试... (已等待: ${totalWaitTime/1000}秒)`);
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
    ]
      
      
        return {
          code: FieldCode.Success, // 0 表示请求成功
          // data 类型需与下方 resultType 定义一致
          data: (url.map(({ link }, index) => {
            console.log(link);
            
            if (!link || typeof link !== 'string') {
              return undefined
            }
            const name = link.split('/').slice(-1)[0];
            return {
              name: videoPrompt+'.mp4',
              content: link,
              contentType: "attachment/url"
            }
          })).filter((v) => v)
        };

      // 请避免使用 debugLog(url) 这类方式输出日志，因为所查到的日志是没有顺序的，为方便排查错误，对每个log进行手动标记顺序
      debugLog({
        '===1 url为空': url
      });
      return {
        code: FieldCode.Error,
      };
   
    } catch (e) {
      debugLog({
        '===9999 异常错误': String(e)
      });

      if (String(e).includes('无可用渠道')) {
        
        return {
          code: FieldCode.Success, // 0 表示请求成功
          // data 类型需与下方 resultType 定义一致
          data:[{
              name:  "捷径异常"+'.mp4',
              content: "https://pay.xunkecloud.cn/image/unusual.mp4",
              contentType: "attachment/url"
            }] 
        };
      }

      // 检查错误消息中是否包含余额耗尽的信息
      if (String(e).includes('令牌额度已用尽')) {
        console.log(123+"=========");
        
        return {
          code: FieldCode.Success, // 0 表示请求成功
          // data 类型需与下方 resultType 定义一致
          data:[{
              name:  "余额耗尽"+'.mp4',
              content: "https://pay.xunkecloud.cn/image/Insufficient.mp4",
              contentType: "attachment/url"
            }] 
        };
      }
       if (String(e).includes('无效的令牌')) {
        console.log(456+"=========");
        
        return {
        code: FieldCode.Success, // 0 表示请求成功
        data: [
          {
            "name": "无效的令牌"+'.mp4', // 附件名称,需要带有文件格式后缀
            "content": "https://pay.xunkecloud.cn/image/tokenError.mp4", // 可通过http.Get 请求直接下载的url.
            "contentType": "attachment/url", // 固定值
          }
        ],
        }
      }
      /** 返回非 Success 的错误码，将会在单元格上显示报错，请勿返回msg、message之类的字段，它们并不会起作用。
       * 对于未知错误，请直接返回 FieldCode.Error，然后通过查日志来排查错误原因。
       */
      return {
        code: FieldCode.Error,
      }
    }
  }
});
export default basekit;
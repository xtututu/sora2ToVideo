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
      component: FieldComponent.Radio,
      defaultValue: { label: t('metLabelOne'), value: 'textToVideo'},
      props: {
        options: [
          { label: t('metLabelOne'), value: 'textToVideo'},
          { label: t('metLabelTwo'), value: 'imageToVideo'},
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
    
  ],
  // 定义捷径的返回结果类型
  resultType: {
    type: FieldType.Attachment
  },
  execute: async (formItemParams: { videoMethod: string, videoPrompt: string, refImage: any }, context) => {
    const { videoMethod = '', videoPrompt = '', refImage = '' } = formItemParams;
    let englishPrompt = videoPrompt; // 添加变量声明

     /** 为方便查看日志，使用此方法替代console.log */
    function debugLog(arg: any) {
      // @ts-ignore
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        ...arg
      }))
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
            
      debugLog(
        {'=1 视频创建接口结果':taskResp}
      )

      const initialResult = await taskResp.json();
      
      
      // 添加类型定义
      interface TaskResponse {
        task_id?: string;
        taskId?: string;
      }
      
      interface VideoResult {
        video_url?: string;
      }
      
      // 获取任务ID，兼容两种可能的字段名
      const taskId = (initialResult as TaskResponse).task_id || (initialResult as TaskResponse).taskId;

      if(!taskId){
        debugLog({'===2 响应中缺少task_id': initialResult});
        return {
          code: FieldCode.Error,
        }
      }

      const apiUrl = `https://open.feishu.cn/anycross/trigger/callback/MDA0MTliNDExYmRmMTQzNGMyNDQwMTVhM2M4ZWNjZjY2?id=${taskId}`;
      
      let checkUrl = async (): Promise<string> => {
        const response = await fetch(apiUrl);

        debugLog({'=2 视频结果查询结果': response});
        const result = await response.json() as VideoResult;
        
        // 正确检查video_url是否存在且不为空
        if (result.video_url && result.video_url !== "null" && result.video_url !== "") {
          return result.video_url;
        } else {
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
      console.log('====error', String(e));
      debugLog({
        '===999 异常错误': String(e)
      });
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
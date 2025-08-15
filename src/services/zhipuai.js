/**
 * 智谱AI服务
 * 基于智谱API实现大模型调用
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

// 从环境变量获取API密钥和认证模式
const API_KEY = process.env.ZHIPUAI_API_KEY;
const AUTH_MODE = process.env.ZHIPUAI_AUTH_MODE || 'apikey'; // 默认使用API密钥认证

// 校验API密钥
if (!API_KEY) {
  logger.error('未配置智谱AI API密钥，请在.env文件中设置ZHIPUAI_API_KEY');
}

// 解析API密钥
const getApiKeyInfo = (apiKey) => {
  const parts = apiKey.split('.');
  if (parts.length !== 2) {
    throw new Error('API密钥格式错误，应为id.key格式');
  }
  return {
    id: parts[0],
    secret: parts[1]
  };
};

// 生成JWT Token
const generateToken = (apiKey) => {
  try {
    const { id, secret } = getApiKeyInfo(apiKey);
    
    // 定义Header
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    // 计算过期时间 (当前时间 + 24小时)
    const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    
    // 定义Payload
    const payload = {
      api_key: id,
      exp: exp,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    // Base64编码Header和Payload
    const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    // 计算签名
    const signature = crypto.createHmac('sha256', secret)
      .update(`${headerBase64}.${payloadBase64}`)
      .digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    // 生成最终Token
    return `${headerBase64}.${payloadBase64}.${signature}`;
  } catch (error) {
    logger.error('生成智谱AI Token失败:', error);
    throw error;
  }
};

/**
 * 使用API密钥直接调用智谱API
 * 此方法适用于简单场景，无需生成JWT
 */
const callWithApiKey = async (prompt, context = {}) => {
  try {
    logger.info(`使用API密钥直接调用智谱AI，提示词长度: ${prompt.length}字符`);
    
    // 检查API密钥是否配置
    if (!API_KEY) {
      throw new Error('未配置智谱AI API密钥');
    }
    
    // 解析API密钥
    const { id } = getApiKeyInfo(API_KEY);
    
    // 构建请求数据
    const requestData = {
      model: "glm-4", // 使用GLM-4模型
      messages: [
        {
          role: "system",
          content: "你是一位专业的地震数据分析助手，擅长解释地震波形数据、识别地震模式和异常，并提供专业的地震监测建议。请基于用户提供的信息，给出专业、简洁、易懂的回答。重要：请使用纯文本格式回答，不要使用任何Markdown格式标记（如**粗体**、*斜体*、#标题、-列表等），直接用简洁的文字表达。"
        }
      ],
      temperature: 0.7,
      top_p: 0.7,
      max_tokens: 800
    };
    
    // 添加上下文信息到提示词
    let enhancedPrompt = prompt;
    
    if (context.analysisResults) {
      enhancedPrompt += `\n\n当前分析结果显示:\n`;
      
      if (context.analysisResults.patterns && context.analysisResults.patterns.length > 0) {
        enhancedPrompt += `- 检测到${context.analysisResults.patterns.length}种模式，包括：${context.analysisResults.patterns.map(p => 
          `${p.type}(置信度:${p.confidence}%，描述:"${p.description}")`).join('、')}\n`;
      }
      
      if (context.analysisResults.anomalies && context.analysisResults.anomalies.length > 0) {
        enhancedPrompt += `- 检测到${context.analysisResults.anomalies.length}个异常，最严重的是在${
          context.analysisResults.anomalies[0].timestamp}的"${context.analysisResults.anomalies[0].description}"\n`;
      }
      
      if (context.analysisResults.summary) {
        enhancedPrompt += `- 总结: ${context.analysisResults.summary}\n`;
      }
    }
    
    if (context.predictResults) {
      enhancedPrompt += `\n预测结果显示:\n`;
      if (context.predictResults.nextEvent) {
        enhancedPrompt += `- 下一个可能事件: ${context.predictResults.nextEvent.type}，预计在${
          context.predictResults.nextEvent.prediction}，置信度${context.predictResults.nextEvent.confidence}%\n`;
      }
      enhancedPrompt += `- 趋势: ${context.predictResults.trend}\n`;
    }
    
    // 添加用户消息
    requestData.messages.push({
      role: "user",
      content: enhancedPrompt
    });
    
    // 发送请求到智谱API（使用API密钥作为X-Zhipu-Key头）
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Zhipu-Key': id
        }
      }
    );
    
    // 提取AI回复内容
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const aiResponse = response.data.choices[0].message.content;
      return aiResponse;
    } else {
      throw new Error('智谱AI响应格式异常');
    }
  } catch (error) {
    logger.error('使用API密钥调用智谱AI失败:', error);
    throw error;
  }
};

/**
 * 使用JWT认证方式调用智谱API
 */
const callWithJWT = async (prompt, context = {}) => {
  try {
    logger.info(`使用JWT认证调用智谱AI，提示词长度: ${prompt.length}字符`);
    
    // 检查API密钥是否配置
    if (!API_KEY) {
      throw new Error('未配置智谱AI API密钥');
    }
    
    // 生成JWT Token
    const token = generateToken(API_KEY);
    
    // 构建请求数据
    const requestData = {
      model: "glm-4", // 使用GLM-4模型
      messages: [
        {
          role: "system",
          content: "你是一位专业的地震数据分析助手，擅长解释地震波形数据、识别地震模式和异常，并提供专业的地震监测建议。请基于用户提供的信息，给出专业、简洁、易懂的回答。重要：请使用纯文本格式回答，不要使用任何Markdown格式标记（如**粗体**、*斜体*、#标题、-列表等），直接用简洁的文字表达。"
        }
      ],
      temperature: 0.7,
      top_p: 0.7,
      max_tokens: 800
    };
    
    // 添加上下文信息到提示词
    let enhancedPrompt = prompt;
    
    if (context.analysisResults) {
      enhancedPrompt += `\n\n当前分析结果显示:\n`;
      
      if (context.analysisResults.patterns && context.analysisResults.patterns.length > 0) {
        enhancedPrompt += `- 检测到${context.analysisResults.patterns.length}种模式，包括：${context.analysisResults.patterns.map(p => 
          `${p.type}(置信度:${p.confidence}%，描述:"${p.description}")`).join('、')}\n`;
      }
      
      if (context.analysisResults.anomalies && context.analysisResults.anomalies.length > 0) {
        enhancedPrompt += `- 检测到${context.analysisResults.anomalies.length}个异常，最严重的是在${
          context.analysisResults.anomalies[0].timestamp}的"${context.analysisResults.anomalies[0].description}"\n`;
      }
      
      if (context.analysisResults.summary) {
        enhancedPrompt += `- 总结: ${context.analysisResults.summary}\n`;
      }
    }
    
    if (context.predictResults) {
      enhancedPrompt += `\n预测结果显示:\n`;
      if (context.predictResults.nextEvent) {
        enhancedPrompt += `- 下一个可能事件: ${context.predictResults.nextEvent.type}，预计在${
          context.predictResults.nextEvent.prediction}，置信度${context.predictResults.nextEvent.confidence}%\n`;
      }
      enhancedPrompt += `- 趋势: ${context.predictResults.trend}\n`;
    }
    
    // 添加用户消息
    requestData.messages.push({
      role: "user",
      content: enhancedPrompt
    });
    
    // 发送请求到智谱API
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // 提取AI回复内容
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const aiResponse = response.data.choices[0].message.content;
      return aiResponse;
    } else {
      throw new Error('智谱AI响应格式异常');
    }
  } catch (error) {
    logger.error('使用JWT认证调用智谱AI失败:', error);
    throw error;
  }
};

/**
 * 使用直接传递API密钥作为Bearer令牌方式调用智谱API
 * 按照官方文档示例: --header 'Authorization: Bearer <你的apikey>'
 */
const callWithDirectApiKey = async (prompt, context = {}) => {
  try {
    logger.info(`使用API密钥作为Bearer令牌调用智谱AI，提示词长度: ${prompt.length}字符`);
    
    // 检查API密钥是否配置
    if (!API_KEY) {
      throw new Error('未配置智谱AI API密钥');
    }
    
    // 构建请求数据
    const requestData = {
      model: "glm-4", // 使用GLM-4模型
      messages: [
        {
          role: "system",
          content: "你是一位专业的地震数据分析助手，擅长解释地震波形数据、识别地震模式和异常，并提供专业的地震监测建议。请基于用户提供的信息，给出专业、简洁、易懂的回答。重要：请使用纯文本格式回答，不要使用任何Markdown格式标记（如**粗体**、*斜体*、#标题、-列表等），直接用简洁的文字表达。"
        }
      ],
      temperature: 0.7,
      top_p: 0.7,
      max_tokens: 800
    };
    
    // 添加上下文信息到提示词
    let enhancedPrompt = prompt;
    
    if (context.analysisResults) {
      enhancedPrompt += `\n\n当前分析结果显示:\n`;
      
      if (context.analysisResults.patterns && context.analysisResults.patterns.length > 0) {
        enhancedPrompt += `- 检测到${context.analysisResults.patterns.length}种模式，包括：${context.analysisResults.patterns.map(p => 
          `${p.type}(置信度:${p.confidence}%，描述:"${p.description}")`).join('、')}\n`;
      }
      
      if (context.analysisResults.anomalies && context.analysisResults.anomalies.length > 0) {
        enhancedPrompt += `- 检测到${context.analysisResults.anomalies.length}个异常，最严重的是在${
          context.analysisResults.anomalies[0].timestamp}的"${context.analysisResults.anomalies[0].description}"\n`;
      }
      
      if (context.analysisResults.summary) {
        enhancedPrompt += `- 总结: ${context.analysisResults.summary}\n`;
      }
    }
    
    if (context.predictResults) {
      enhancedPrompt += `\n预测结果显示:\n`;
      if (context.predictResults.nextEvent) {
        enhancedPrompt += `- 下一个可能事件: ${context.predictResults.nextEvent.type}，预计在${
          context.predictResults.nextEvent.prediction}，置信度${context.predictResults.nextEvent.confidence}%\n`;
      }
      enhancedPrompt += `- 趋势: ${context.predictResults.trend}\n`;
    }
    
    // 添加用户消息
    requestData.messages.push({
      role: "user",
      content: enhancedPrompt
    });
    
    // 发送请求到智谱API（直接使用API密钥作为Bearer Token）
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );
    
    // 提取AI回复内容
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const aiResponse = response.data.choices[0].message.content;
      return aiResponse;
    } else {
      throw new Error('智谱AI响应格式异常');
    }
  } catch (error) {
    logger.error('使用API密钥作为Bearer令牌调用智谱AI失败:', error);
    throw error;
  }
};

// 使用智谱大模型API分析地震数据（根据环境变量配置选择认证方式）
const analyzeEarthquakeData = async (prompt, context = {}, forceAuthMode = null) => {
  try {
    // 获取认证模式配置
    const authModeConfig = forceAuthMode || AUTH_MODE.toLowerCase();
    let authMode;
    
    // 确定使用哪种认证方式
    if (authModeConfig === 'jwt') {
      authMode = 'jwt';
    } else if (authModeConfig === 'direct') {
      authMode = 'direct';
    } else {
      // 默认使用apikey方式
      authMode = 'apikey';
    }
    
    logger.info(`调用智谱AI分析地震数据，提示词长度: ${prompt.length}字符，认证方式: ${authMode}`);
    
    // 检查API密钥是否配置
    if (!API_KEY) {
      throw new Error('未配置智谱AI API密钥');
    }
    
    // 根据认证方式选择不同的调用方法
    if (authMode === 'jwt') {
      // 使用JWT认证方式调用
      return await callWithJWT(prompt, context);
    } else if (authMode === 'direct') {
      // 使用直接API密钥作为Bearer方式调用
      return await callWithDirectApiKey(prompt, context);
    } else {
      // 使用API密钥方式调用
      return await callWithApiKey(prompt, context);
    }
  } catch (error) {
    logger.error('调用智谱AI分析失败:', error);
    throw error;
  }
};

// 添加测试函数，用于命令行测试
const test = () => {
  const apiKey = process.env.ZHIPUAI_API_KEY;
  console.log('API密钥:', apiKey);
  
  try {
    if (!apiKey) {
      console.log('未设置API密钥，使用测试密钥');
      // 使用测试密钥
      const testApiKey = 'f79dd0503d84443f9b3d6cb233645f2d.Kzw8LK8O8UpHhFZw';
      const token = generateToken(testApiKey);
      console.log('使用测试密钥生成的Token:', token);
    } else {
      const token = generateToken(apiKey);
      console.log('使用环境变量密钥生成的Token:', token);
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
};

module.exports = {
  analyzeEarthquakeData,
  callWithApiKey,
  callWithJWT,
  callWithDirectApiKey,
  generateToken,
  test
}; 
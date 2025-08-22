const express = require('express');
const router = express.Router();
const db = require('../db');
const dbIndex = require('../db/index'); // 统一的数据库接口
const logger = require('../utils/logger');
const zhipuai = require('../services/zhipuai');
const analysisTools = require('../services/analysisService');


// 获取模式分析
router.get('/patterns', async (req, res) => {
  try {
    const { startDate, endDate, analysisType } = req.query;
    
    logger.info(`模式分析请求: startDate=${startDate}, endDate=${endDate}, type=${analysisType}`);
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: '请提供开始和结束日期', status: 400 });
    }
    
    // 验证日期格式
    if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
      return res.status(400).json({ message: '无效的日期格式', status: 400 });
    }
    
    // 从数据库获取原始数据（优先使用统一接口）
    let rawData;
    try {
      rawData = await dbIndex.queryAllWaveformData(startDate, endDate);
    } catch (error) {
      logger.warn('统一接口不可用，使用备用接口:', error.message);
      rawData = await db.queryAllWaveformData(startDate, endDate);
    }
    
    if (!rawData || rawData.length === 0) {
      return res.status(404).json({ message: '在指定时间范围内未找到数据', status: 404 });
    }
    
    logger.info(`找到${rawData.length}条数据进行分析`);
    
    // 分析周期性模式
    const periodicPatterns = analysisTools.detectPeriodicPatterns(rawData);
    
    // 分析峰值模式
    const peakPatterns = analysisTools.detectPeakPatterns(rawData);
    
    // 分析频率分布
    const frequencyPatterns = analysisTools.analyzeFrequencyDistribution(rawData);
    
    // 检测异常
    const anomalies = analysisTools.detectAnomalies(rawData);
    
    // 根据分析类型选择返回的结果
    let patterns = [];
    if (analysisType === 'comprehensive' || analysisType === 'pattern') {
      patterns = patterns.concat(periodicPatterns);
    }
    
    if (analysisType === 'comprehensive' || analysisType === 'peak') {
      patterns = patterns.concat(peakPatterns);
    }
    
    if (analysisType === 'comprehensive' || analysisType === 'frequency') {
      patterns = patterns.concat(frequencyPatterns);
    }
    
    // 生成总结
    let summary;
    if (patterns.length === 0) {
      summary = '未检测到明显的模式或异常。';
    } else {
      summary = `分析期间检测到${patterns.length}种模式`;
      if (periodicPatterns.length > 0) {
        summary += `，包括周期性模式表现为每24小时一次的强度变化，可能与温度日变化相关`;
      }
      if (anomalies.length > 0) {
        summary += `。另外检测到${anomalies.length}次异常事件`;
        if (anomalies.length > 0) {
          const topAnomaly = anomalies[0];
          summary += `，其中${topAnomaly.timestamp}的异常幅度最大，值得重点关注`;
        }
      }
      summary += '。';
    }
    
    res.json({
      status: 200,
      data: {
        patterns,
        anomalies,
        summary
      }
    });
  } catch (error) {
    logger.error('模式分析API错误:', error);
    res.status(500).json({ message: '服务器处理分析请求时出错', status: 500, details: error.message });
  }
});

// 获取异常检测
router.get('/anomalies', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    logger.info(`异常检测请求: startDate=${startDate}, endDate=${endDate}`);
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: { message: '请提供开始和结束日期' } });
    }
    
    // 验证日期格式
    if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
      return res.status(400).json({ error: { message: '无效的日期格式' } });
    }
    
    // 从数据库获取原始数据（优先使用统一接口）
    let rawData;
    try {
      rawData = await dbIndex.queryAllWaveformData(startDate, endDate);
    } catch (error) {
      logger.warn('统一接口不可用，使用备用接口:', error.message);
      rawData = await db.queryAllWaveformData(startDate, endDate);
    }
    
    if (!rawData || rawData.length === 0) {
      return res.status(404).json({ error: { message: '在指定时间范围内未找到数据' } });
    }
    
    logger.info(`找到${rawData.length}条数据进行异常检测`);
    
    // 执行异常检测
    const anomalies = analysisTools.detectAnomalies(rawData);
    
    // 生成总结
    let summary;
    if (anomalies.length === 0) {
      summary = '在指定的时间范围内未检测到显著异常。';
    } else {
      summary = `分析期间检测到${anomalies.length}个异常事件。其中，最严重的异常出现在${anomalies[0].timestamp}，表现为${anomalies[0].description}，可信度为${anomalies[0].probability}%。`;
    }
    
    res.json({
      status: 200,
      data: {
        anomalies,
        summary
      }
    });
  } catch (error) {
    logger.error('异常检测API错误:', error);
    res.status(500).json({ message: '服务器处理异常检测请求时出错', status: 500, details: error.message });
  }
});

// 获取趋势预测
router.get('/prediction', async (req, res) => {
  try {
    const { trainingStartDate, trainingEndDate, predictionDuration } = req.query;
    
    logger.info(`趋势预测请求: trainingStartDate=${trainingStartDate}, trainingEndDate=${trainingEndDate}, predictionDuration=${predictionDuration}`);
    
    if (!trainingStartDate || !trainingEndDate) {
      return res.status(400).json({ message: '请提供训练数据的开始和结束日期',status: 500, details: error.message  });
    }
    
    // 验证日期格式
    if (isNaN(new Date(trainingStartDate).getTime()) || isNaN(new Date(trainingEndDate).getTime())) {
      return res.status(400).json({ message: '无效的日期格式',status: 500, details: error.message });
    }
    
    // 验证预测时长
    const duration = parseInt(predictionDuration) || 72;
    if (duration <= 0) {
      return res.status(400).json({ message: '预测时长必须大于0', status: 400, details: error.message });
    }
    
    // 从数据库获取训练数据（优先使用统一接口）
    let trainingData;
    try {
      trainingData = await dbIndex.queryAllWaveformData(trainingStartDate, trainingEndDate);
    } catch (error) {
      logger.warn('统一接口不可用，使用备用接口:', error.message);
      trainingData = await db.queryAllWaveformData(trainingStartDate, trainingEndDate);
    }
    
    if (!trainingData || trainingData.length === 0) {
      return res.status(404).json({ message: '在指定训练时间范围内未找到数据', status: 404 ,details: error.message });
    }
    
    logger.info(`找到${trainingData.length}条数据用于训练预测模型`);
    
    // 执行预测
    const prediction = analysisTools.predictTrend(trainingData, duration);
    
    res.json({
      status: 200,
      data: prediction
    });
  } catch (error) {
    logger.error('趋势预测API错误:', error);
    res.status(500).json({ message: '服务器处理预测请求时出错', status: 500, details: error.message });
  }
});

// AI问答
router.post('/query', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    
    logger.info(`AI问答请求: prompt="${prompt}", 包含上下文=${!!context}`);
    
    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ message: '查询内容不能为空', status: 400 , details: error.message});
    }
    
    // 使用智谱AI分析，优先使用配置的认证方式
    try {
      // 使用环境变量中配置的认证方式
      const zhipuResponse = await zhipuai.analyzeEarthquakeData(prompt, context);
      logger.info('智谱AI响应成功，内容长度:', zhipuResponse.length);
      return res.json({
        status: 200,
        data: zhipuResponse
      });
    } catch (primaryError) {
      logger.warn(`主要认证方式失败，尝试备用方式:`, primaryError.message);
      
      // 按优先级尝试其他认证方式
      const authModes = ['direct', 'apikey', 'jwt'];
      
      // 从配置文件获取当前使用的认证方式
      const currentMode = process.env.ZHIPUAI_AUTH_MODE.toLowerCase();
      
      // 从候选列表中移除当前使用的认证方式(已经失败了)
      const fallbackModes = authModes.filter(mode => mode !== currentMode);
      
      // 逐个尝试备用认证方式
      for (const mode of fallbackModes) {
        try {
          logger.info(`尝试使用 ${mode} 认证方式调用智谱AI`);
          const response = await zhipuai.analyzeEarthquakeData(prompt, context, mode);
          logger.info(`使用 ${mode} 认证方式调用智谱AI成功，内容长度:`, response.length);
          return res.json({
          status: 200,
          data: response
        });
        } catch (error) {
          logger.warn(`${mode} 认证方式调用失败:`, error.message);
          // 继续尝试下一个认证方式
        }
      }
      
      logger.warn('所有智谱AI认证方式都失败，回退到本地匹配');
      // 生成本地响应，考虑上下文信息
      const localResponse = analysisTools.generateAIResponse(prompt, context);
      return res.json({
        status: 200,
        data: localResponse
      });
    }
  } catch (error) {
    logger.error('AI问答API错误:', error);
    res.status(500).json({ message: '服务器处理AI问答请求时出错', status: 500, details: error.message });
  }
});

module.exports = router;
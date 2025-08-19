const express = require('express');
const router = express.Router();
const earthquakeDataRoutes = require('./earthquakeData');
const aiAnalysisRoutes = require('./aiAnalysis');
const reportsRoutes = require('./reports');
const performanceRoutes = require('./performance');
const { generateHistoricalData, startDataGenerator, stopDataGenerator, getGeneratorStatus } = require('../services/dataGenerator');
const { saveEarthquakeData } = require('../db');
const logger = require('../utils/logger');

// 健康检查端点
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 200,
    data: {
      timestamp: new Date().toISOString(),
      service: 'earthquake-monitor-api',
    }
  });
});

// 直接接收地震数据的API
router.post('/earthquake-data', async (req, res) => {
  try {
    const data = req.body;
    
    // 验证必须参数
    if (data.amplitude === undefined || data.amplitude === null) {
      return res.status(400).json({ 
        message: 'amplitude是必须的',
        status: 400,
        details: "缺少必要参数: amplitude"
      });
    }
    
    // 添加时间戳（如果没有提供）
    data.timestamp = data.timestamp || new Date();
    
    // 保存到数据库
    const savedData = await saveEarthquakeData(data);
    logger.info(`通过HTTP API接收到数据: ID=${savedData.id}, 幅度=${data.amplitude}`);
    
    // 广播到所有客户端
    const completeData = {
      ...data,
      id: savedData.id,
      timestamp: savedData.timestamp
    };
    
    // 如果有Socket.IO实例，广播数据
    if (global.io) {
      global.io.emit('earthquake-data', completeData);
    }
    
    // 如果有WebSocket实例，广播数据
    if (global.wss) {
      const wsMessage = JSON.stringify({
        type: 'earthquake-data',
        payload: completeData
      });
      
      global.wss.clients.forEach((client) => {
        if (client.readyState === require('ws').OPEN) {
          client.send(wsMessage);
        }
      });
    }
    
    // 返回成功响应
    res.status(201).json({
      status: 201,
      data: {
        message: '数据已成功保存并广播',
        id: savedData.id,
        timestamp: savedData.timestamp
      }
    });
  } catch (error) {
    logger.error('保存HTTP API数据时出错:', error);
    res.status(500).json({ 
        message: '保存数据时出错', 
        status: 500, 
        details: error.message 
      });
  }
});

// 数据生成器控制API
router.get('/generator/status', (req, res) => {
  const status = getGeneratorStatus();
  logger.info(`获取生成器状态: ${status.running ? '运行中' : '已停止'}`);
  res.status(200).json({
      status: 200,
      data: status
    });
});

router.post('/generator/start', (req, res) => {
  const result = startDataGenerator(global.io, global.wss);
  logger.info(`启动生成器: ${result.message}`);
  res.status(200).json({
      status: 200,
      data: result
    });
});

router.post('/generator/stop', (req, res) => {
  const result = stopDataGenerator();
  logger.info(`停止生成器: ${result.message}`);
  res.status(200).json({
      status: 200,
      data: result
    });
});

// 生成历史数据的测试端点
router.post('/generate-test-data', async (req, res, next) => {
  try {
    const { count = 100, days = 7 } = req.body;
    
    // 生成从N天前到现在的数据
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    logger.info(`请求生成测试数据: ${count}条, 起始于${days}天前`);
    
    const data = await generateHistoricalData(count, startDate);
    
    res.status(200).json({
      status: 200,
      data: {
        message: `成功生成${data.length}条历史测试数据`,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        count: data.length
      }
    });
  } catch (error) {
    logger.error('生成测试数据时出错:', error);
    next(error);
  }
});

// 地震数据路由
router.use('/earthquake-data', earthquakeDataRoutes);

// AI分析路由
router.use('/ai-analysis', aiAnalysisRoutes);

// 报告生成路由
router.use('/reports', reportsRoutes);

// 性能监控路由
router.use('/performance', performanceRoutes);

// 错误处理中间件
router.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  
  res.status(statusCode).json({
      message,
      status: statusCode,
      details: err.details || '请求处理过程中发生错误'
    });
});

module.exports = router;
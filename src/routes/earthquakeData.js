const express = require('express');
const router = express.Router();
const { queryEarthquakeData, queryAllWaveformData, getLatestEarthquakeData, saveEarthquakeData } = require('../db');
const dbIndex = require('../db/index'); // 统一的数据库接口
const logger = require('../utils/logger');

// 获取历史地震数据
router.get('/historical', async (req, res, next) => {
  try {
    const { startDate, endDate, limit, waveformType } = req.query;
    
    // 添加详细日志
    logger.info(`收到历史数据请求: startDate=${startDate}, endDate=${endDate}, limit=${limit || '无限制'}, waveformType=${waveformType || '全部'}`);
    
    if (!startDate || !endDate) {
      logger.warn('历史数据请求缺少必要参数');
      return res.status(400).json({
        error: {
          message: '开始日期和结束日期是必需的参数',
          status: 400,
        },
      });
    }
    
    // 检查日期格式
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      logger.warn('历史数据请求包含无效的日期格式');
      return res.status(400).json({
        error: {
          message: '提供的日期格式无效',
          status: 400,
        },
      });
    }
    
    // 检查日期范围
    const now = new Date();
    
    // 自动调整未来日期
    let adjustedStartDate = startDateObj;
    let adjustedEndDate = endDateObj;
    
    if (startDateObj > now) {
      logger.warn(`请求的开始日期 ${startDate} 在未来，已自动调整为当前时间`);
      adjustedStartDate = now;
    }
    
    if (endDateObj > now) {
      logger.warn(`请求的结束日期 ${endDate} 在未来，已自动调整为当前时间`);
      adjustedEndDate = now;
    }
    
    // 直接使用传入的日期时间字符串，并传递可选的limit参数
    const parsedLimit = limit ? parseInt(limit) : null;
    
    let data;
    // 根据是否指定波形类型决定调用哪个查询函数（优先使用统一接口）
    try {
      if (waveformType) {
        data = await dbIndex.getHistoricalData(adjustedStartDate.toISOString(), adjustedEndDate.toISOString(), waveformType, parsedLimit);
        logger.info(`${waveformType}波形历史数据查询结果: 找到 ${data.length} 条记录`);
      } else {
        data = await dbIndex.queryAllWaveformData(adjustedStartDate.toISOString(), adjustedEndDate.toISOString(), parsedLimit);
        logger.info(`所有波形历史数据查询结果: 找到 ${data.length} 条记录`);
      }
    } catch (error) {
      logger.warn('统一接口不可用，使用备用接口:', error.message);
      // 备用方案：使用原有接口
      if (waveformType) {
        data = await queryEarthquakeData(adjustedStartDate.toISOString(), adjustedEndDate.toISOString(), waveformType, parsedLimit);
        logger.info(`${waveformType}波形历史数据查询结果: 找到 ${data.length} 条记录`);
      } else {
        data = await queryAllWaveformData(adjustedStartDate.toISOString(), adjustedEndDate.toISOString(), parsedLimit);
        logger.info(`所有波形历史数据查询结果: 找到 ${data.length} 条记录`);
      }
    }
    
    res.json(data);
  } catch (error) {
    logger.error('获取历史数据时出错:', error);
    // 返回更友好的错误信息
    if (error.message && error.message.includes('operator does not exist')) {
      res.status(500).json({
        error: {
          message: '数据库查询错误: 类型不匹配',
          status: 500,
          details: error.message,
        },
      });
    } else {
      next(error);
    }
  }
});

// 获取特定波形类型的历史数据
router.get('/historical/:waveformType', async (req, res, next) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const { waveformType } = req.params;
    
    // 添加详细日志
    logger.info(`收到特定波形历史数据请求: waveformType=${waveformType}, startDate=${startDate}, endDate=${endDate}, limit=${limit || '无限制'}`);
    
    if (!startDate || !endDate) {
      logger.warn('历史数据请求缺少必要参数');
      return res.status(400).json({
        error: {
          message: '开始日期和结束日期是必需的参数',
          status: 400,
        },
      });
    }
    
    // 验证波形类型是否有效
    if (!['X', 'Y', 'Z'].includes(waveformType)) {
      return res.status(400).json({
        error: {
          message: '无效的波形类型，必须是 X、Y 或 Z',
          status: 400,
        },
      });
    }
    
    // 检查日期格式
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      logger.warn('历史数据请求包含无效的日期格式');
      return res.status(400).json({
        error: {
          message: '提供的日期格式无效',
          status: 400,
        },
      });
    }
    
    // 检查日期范围
    const now = new Date();
    
    // 自动调整未来日期
    let adjustedStartDate = startDateObj;
    let adjustedEndDate = endDateObj;
    
    if (startDateObj > now) {
      logger.warn(`请求的开始日期 ${startDate} 在未来，已自动调整为当前时间`);
      adjustedStartDate = now;
    }
    
    if (endDateObj > now) {
      logger.warn(`请求的结束日期 ${endDate} 在未来，已自动调整为当前时间`);
      adjustedEndDate = now;
    }
    
    // 直接使用传入的日期时间字符串，并传递可选的limit参数（优先使用统一接口）
    const parsedLimit = limit ? parseInt(limit) : null;
    let data;
    try {
      data = await dbIndex.getHistoricalData(adjustedStartDate.toISOString(), adjustedEndDate.toISOString(), waveformType, parsedLimit);
    } catch (error) {
      logger.warn('统一接口不可用，使用备用接口:', error.message);
      data = await queryEarthquakeData(adjustedStartDate.toISOString(), adjustedEndDate.toISOString(), waveformType, parsedLimit);
    }

    logger.info(`${waveformType}波形数据查询结果: 找到 ${data.length} 条记录`);
    res.json(data);
  } catch (error) {
    logger.error(`获取${req.params.waveformType}波形历史数据时出错:`, error);
    // 返回更友好的错误信息
    if (error.message && error.message.includes('operator does not exist')) {
      res.status(500).json({
        error: {
          message: '数据库查询错误: 类型不匹配',
          status: 500,
          details: error.message,
        },
      });
    } else {
      next(error);
    }
  }
});

// 获取最新数据
router.get('/latest', async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;
    logger.info(`收到最新数据请求: limit=${limit}`);
    
    const data = await getLatestEarthquakeData(parseInt(limit));
    logger.info(`最新数据查询结果: 找到 ${data.length} 条记录`);
    res.json(data);
  } catch (error) {
    logger.error('获取最新数据时出错:', error);
    next(error);
  }
});

// 提交地震数据
router.post('/', async (req, res, next) => {
  try {
    const { amplitude, timestamp, metadata } = req.body;
    
    if (amplitude === undefined) {
      return res.status(400).json({
        error: {
          message: '振幅数据是必需的参数',
          status: 400,
        },
      });
    }
    
    const earthquakeData = {
      amplitude,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      metadata: metadata || { source: 'api' }
    };
    
    logger.info(`通过API收到地震数据: ${JSON.stringify(earthquakeData)}`);

    // 保存到数据库（优先使用统一接口）
    let savedData;
    try {
      savedData = await dbIndex.saveEarthquakeData(earthquakeData);
    } catch (error) {
      logger.warn('统一接口不可用，使用备用接口:', error.message);
      savedData = await saveEarthquakeData(earthquakeData);
    }
    logger.info(`已保存API提交的地震数据: ID=${savedData.id}`);
    
    res.status(201).json({
      message: '数据已成功保存并广播',
      id: savedData.id,
      timestamp: savedData.timestamp
    });
  } catch (error) {
    logger.error('保存API提交的地震数据时出错:', error);
    next(error);
  }
});

module.exports = router; 
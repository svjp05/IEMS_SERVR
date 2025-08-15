const logger = require('../utils/logger');
const { saveEarthquakeData } = require('../db');
const WebSocket = require('ws');

// 生成指定范围内的随机数
const randomInRange = (min, max) => {
  return Math.random() * (max - min) + min;
};

// 生成模拟地震数据
const generateEarthquakeData = () => {
  // 基础振幅值(0.1-10.0)
  const baseAmplitude = randomInRange(0.1, 10.0);
  
  // 添加一些随机波动
  const randomFactor = Math.sin(Date.now() / 10000) * 2;
  
  // 最终振幅
  const amplitude = Math.max(0.1, baseAmplitude + randomFactor);
  
  // 生成对应的频率(0.5-5.0Hz)
  const frequency = randomInRange(0.5, 5.0);
  
  return {
    timestamp: new Date(),
    amplitude: parseFloat(amplitude.toFixed(2)),
    frequency: parseFloat(frequency.toFixed(2)),
    metadata: {
      source: 'simulator',
      quality: 'good',
    },
  };
};

// 全局变量，存储生成器状态
let generatorState = {
  running: false,
  intervalId: null,
  io: null,
  wss: null
};

// 启动数据生成器
const startDataGenerator = (io, wss) => {
  // 如果已经运行中，直接返回
  if (generatorState.running) {
    logger.info('数据生成器已经在运行中');
    return { running: true, message: '数据生成器已经在运行中' };
  }
  
  const interval = parseInt(process.env.DATA_GENERATION_INTERVAL, 10) || 1000; // 默认1秒
  
  logger.info(`数据生成器已启动，间隔: ${interval}ms`);
  
  // 保存Socket.IO和WebSocket实例
  generatorState.io = io || generatorState.io;
  generatorState.wss = wss || generatorState.wss;
  
  // 每隔一段时间生成一次数据
  const dataGeneratorInterval = setInterval(async () => {
    try {
      // 生成数据
      const data = generateEarthquakeData();
      
      // 保存到数据库
      const savedData = await saveEarthquakeData(data);
      
      // 记录保存的数据
      logger.debug(`已保存数据到数据库: ID=${savedData.id}, 时间=${savedData.timestamp.toISOString()}, 幅度=${data.amplitude}`);
      
      // 完整的数据对象
      const completeData = {
        ...data,
        id: savedData.id,
        timestamp: savedData.timestamp,
      };
      
      // 通过Socket.IO广播数据
      if (generatorState.io) {
        generatorState.io.emit('earthquake-data', completeData);
        logger.debug(`已通过Socket.IO广播数据: ID=${savedData.id}`);
      }
      
      // 通过原生WebSocket广播数据
      if (generatorState.wss) {
        const wsMessage = JSON.stringify({
          type: 'earthquake-data',
          payload: completeData
        });
        
        generatorState.wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(wsMessage);
          }
        });
        
        logger.debug(`已通过原生WebSocket广播数据: ID=${savedData.id}`);
      }
    } catch (error) {
      logger.error('生成数据时出错:', error);
    }
  }, interval);
  
  // 更新生成器状态
  generatorState.running = true;
  generatorState.intervalId = dataGeneratorInterval;
  
  // 返回状态信息
  return { running: true, message: '数据生成器已启动' };
};

// 停止数据生成器
const stopDataGenerator = () => {
  // 如果未运行，直接返回
  if (!generatorState.running || !generatorState.intervalId) {
    logger.info('数据生成器未在运行');
    return { running: false, message: '数据生成器未在运行' };
  }
  
  clearInterval(generatorState.intervalId);
  generatorState.running = false;
  generatorState.intervalId = null;
  
  logger.info('数据生成器已停止');
  return { running: false, message: '数据生成器已停止' };
};

// 获取生成器状态
const getGeneratorStatus = () => {
  return { 
    running: generatorState.running,
    message: generatorState.running ? '数据生成器正在运行' : '数据生成器已停止'
  };
};

// 手动生成历史数据（用于测试）
const generateHistoricalData = async (count = 100, startDate = new Date(Date.now() - 24*60*60*1000)) => {
  logger.info(`开始生成${count}条历史数据，起始时间: ${startDate.toISOString()}`);
  
  const data = [];
  const timeInterval = 24 * 60 * 60 * 1000 / count; // 一天内均匀分布
  
  for (let i = 0; i < count; i++) {
    try {
      const timestamp = new Date(startDate.getTime() + i * timeInterval);
      
      // 使用与实时数据生成相同的逻辑，但更改时间戳
      const baseAmplitude = randomInRange(0.1, 10.0);
      const randomFactor = Math.sin(timestamp.getTime() / 10000) * 2;
      const amplitude = Math.max(0.1, baseAmplitude + randomFactor);
      const frequency = randomInRange(0.5, 5.0);
      
      const earthquakeData = {
        timestamp,
        amplitude: parseFloat(amplitude.toFixed(2)),
        frequency: parseFloat(frequency.toFixed(2)),
        metadata: {
          source: 'simulator',
          quality: 'good',
          historicalGeneration: true
        },
      };
      
      // 保存到数据库
      const savedData = await saveEarthquakeData(earthquakeData);
      data.push(savedData);
      
      if (i % 10 === 0) {
        logger.debug(`已生成${i+1}/${count}条历史数据`);
      }
    } catch (error) {
      logger.error(`生成第${i+1}条历史数据时出错:`, error);
    }
  }
  
  logger.info(`历史数据生成完毕，成功生成${data.length}条数据`);
  return data;
};

// 生成批量连续地震数据(模拟10ms采样，每秒100个点的批量上传)
const generateBatchEarthquakeData = (count = 100) => {
  const batchData = [];
  const now = new Date();
  
  // 生成基础振幅值(0.1-10.0)，作为整个批次的基础
  const baseAmplitude = randomInRange(0.1, 10.0);
  
  // 逆序生成数据点，以使最早的时间点在数组开始位置
  // 这将导致更连续的数据显示
  for (let i = 0; i < count; i++) {
    // 反向计算时间点，使最后的点是最新的
    const pointTime = new Date(now.getTime() - (count - 1 - i) * 10); // 每10ms一个点
    
    // 添加一些随机波动，但要保持连续性
    // 使用sin函数和索引来保持波形的连续性
    const randomFactor = Math.sin((Date.now() + i * 10) / 10000) * 2;
    const timeVariation = Math.sin(i * 0.1) * 0.5; // 随位置变化的波动
    
    // 最终振幅，平滑变化
    const amplitude = Math.max(0.1, baseAmplitude + randomFactor + timeVariation);
    
    batchData.push({
      timestamp: pointTime,
      amplitude: parseFloat(amplitude.toFixed(2)),
      metadata: {
        source: 'batch-simulator',
        quality: 'good',
        batchIndex: i,
        batchSize: count
      },
    });
  }
  
  return batchData;
};

module.exports = {
  randomInRange,
  generateEarthquakeData,
  startDataGenerator,
  stopDataGenerator,
  getGeneratorStatus,
  generateHistoricalData,
  generateBatchEarthquakeData
}; 
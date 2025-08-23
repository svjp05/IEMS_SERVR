require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const WebSocket = require('ws');
const cors = require('cors');
const { setupDatabase, saveEarthquakeData } = require('./db');
const logger = require('./utils/logger');
const routes = require('./routes/main');
const aiAnalysis = require('./routes/aiAnalysis');
const earthquakeData = require('./routes/earthquakeData');
const performance = require('./routes/performance');
const reports = require('./routes/reports');
const { startDataGenerator, stopDataGenerator, getGeneratorStatus } = require('./services/dataGenerator');
const url = require('url');

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 配置CORS
app.use(cors());
app.use(express.json());

// 设置路由
app.use('/api', routes);
app.use('/api/aiAnalysis', aiAnalysis);
app.use('/api/earthquakeData', earthquakeData);
app.use('/api/performance', performance);
app.use('/api/reports', reports);
// 新增WebSerial API支持
app.post('/api/serial/list', (req, res) => {
  // 模拟获取串口列表，由于WebSerial API只能在前端使用，服务器端只能提供模拟数据
  const serialPorts = [
    { path: 'COM1', manufacturer: '示例制造商', productId: '0001', vendorId: '0001' },
    { path: 'COM2', manufacturer: '示例制造商', productId: '0002', vendorId: '0001' },
    { path: 'COM3', manufacturer: '示例制造商', productId: '0003', vendorId: '0001' }
  ];
  
  res.json({ success: true, ports: serialPorts });
});

// 用于模拟串口数据的WebSocket服务
const serialWebSocketServer = new WebSocket.Server({ noServer: true });

serialWebSocketServer.on('connection', (socket) => {
  logger.info('串口模拟服务: 新客户端已连接');
  
  // 向客户端发送欢迎消息
  socket.send(JSON.stringify({
    type: 'welcome',
    message: '已连接到串口模拟服务器'
  }));
  
  // 处理来自客户端的消息
  socket.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      logger.info(`串口模拟服务: 收到客户端消息: ${JSON.stringify(data)}`);
      
      // 模拟串口回复
      if (data.type === 'send-data') {
        // 等待100ms后回复，模拟实际串口延迟
        setTimeout(() => {
          socket.send(JSON.stringify({
            type: 'serial-data',
            data: `收到: ${data.data}`,
            timestamp: new Date().toISOString()
          }));
        }, 100);
      }
    } catch (err) {
      logger.error(`串口模拟服务: 处理消息错误: ${err.message}`);
    }
  });
  
  // 处理客户端断开连接
  socket.on('close', () => {
    logger.info('串口模拟服务: 客户端已断开连接');
  });
});

// 升级HTTP连接为WebSocket连接
server.on('upgrade', (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;
  
  if (pathname === '/ws/serial') {
    serialWebSocketServer.handleUpgrade(request, socket, head, (ws) => {
      serialWebSocketServer.emit('connection', ws, request);
    });
  } else if (pathname === '/ws') {
    // 原有的WebSocket服务
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// 调试跟踪函数
function logData(source, data) {
  logger.info(`========================`);
  logger.info(`来源: ${source}`);
  logger.info(`数据内容: ${JSON.stringify(data)}`);
  logger.info(`========================`);
}

// 设置Socket.IO
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 创建原生WebSocket服务器
const wss = new WebSocket.Server({ noServer: true });

// 处理WebSocket连接
wss.on('connection', (ws) => {
  logger.info('Native WebSocket 客户端已连接');
  
  // 发送连接成功消息
  try {
    ws.send(JSON.stringify({
      type: 'connection',
      message: '已成功连接到地震波监测系统',
      timestamp: new Date().toISOString()
    }));
    logger.info('已发送WebSocket连接成功消息');
  } catch (error) {
    logger.error('发送欢迎消息失败:', error);
  }
  
  ws.on('message', async (message) => {
    // 获取原始消息内容
    const rawMessage = message.toString().trim();
    logger.info('收到WebSocket原始消息:', rawMessage);
    
    try {
      // 检查是否是逗号分隔的多个数据点
      if (rawMessage.includes(',')) {
        // 提取元数据信息和数据点
        let dataPoints;
        let metadata = {};
        let parsedMessage = rawMessage;
        
        // 检查是否包含T/H/V格式的元数据
        if (rawMessage.match(/^T\d+H\d+V\d+,/)) {
          // 解析元数据部分
          const metaPart = rawMessage.split(',')[0];
          // 提取温度、湿度和电量信息
          const temperatureMatch = metaPart.match(/T(\d+)/);
          const humidityMatch = metaPart.match(/H(\d+)/);
          const voltageMatch = metaPart.match(/V(\d+)/);
          
          if (temperatureMatch) metadata.temperature = parseInt(temperatureMatch[1]);
          if (humidityMatch) metadata.humidity = parseInt(humidityMatch[1]);
          if (voltageMatch) metadata.voltage = parseInt(voltageMatch[1]);
          
          // 去除元数据部分，得到剩余部分
          parsedMessage = rawMessage.substring(rawMessage.indexOf(',') + 1);
        }
        
        // 检查是否包含X标记的波形数据
        if (parsedMessage.startsWith('X')) {
          // 检查是否还有Y标记的第二组波形数据和Z标记的第三组波形数据
          let secondWaveform = null;
          let thirdWaveform = null;
          let firstWaveformPoints = [];
          
          // 检查是否包含Z波形数据
          if (parsedMessage.includes(',Z')) {
            // 数据包含X、Y和Z三种波形
            const parts = parsedMessage.split(',Z');
            // 再分离X和Y部分
            const xyParts = parts[0].split(',Y');
            
            // 处理X部分（去掉X标记）
            firstWaveformPoints = xyParts[0].substring(1).split(',').map(point => point.trim()).filter(point => point.length > 0);
            
            // 处理Y部分
            secondWaveform = xyParts[1].split(',').map(point => point.trim()).filter(point => point.length > 0);
            
            // 处理Z部分
            thirdWaveform = parts[1].split(',').map(point => point.trim()).filter(point => point.length > 0);
            
            metadata.dataType = 'triple-waveform'; // 标记为三波形数据
            metadata.secondWaveform = true; // 标记存在第二个波形
            metadata.thirdWaveform = true; // 标记存在第三个波形
            
            logger.info(`收到三波形数据，X波形${firstWaveformPoints.length}个点，Y波形${secondWaveform.length}个点，Z波形${thirdWaveform.length}个点，元数据:`, metadata);
          }
          else if (parsedMessage.includes(',Y')) {
            // 分离X和Y两组数据
            const parts = parsedMessage.split(',Y');
            // 处理X部分（去掉X标记）
            firstWaveformPoints = parts[0].substring(1).split(',').map(point => point.trim()).filter(point => point.length > 0);
            // 处理Y部分
            secondWaveform = parts[1].split(',').map(point => point.trim()).filter(point => point.length > 0);
            
            metadata.dataType = 'dual-waveform'; // 标记为双波形数据
            metadata.secondWaveform = true; // 标记存在第二个波形
            
            logger.info(`收到双波形数据，X波形${firstWaveformPoints.length}个点，Y波形${secondWaveform.length}个点，元数据:`, metadata);
          } else {
            // 只有X波形数据
            dataPoints = parsedMessage.substring(1).split(',').map(point => point.trim()).filter(point => point.length > 0);
            metadata.dataType = 'waveform'; // 标记为波形数据
            logger.info(`收到波形数据，共${dataPoints.length}个数据点，元数据:`, metadata);
          }
          
          // 处理当前波形数据点（X部分）
          const savedResults = [];
          const currentTime = new Date();
          const interval = 10; // 每个数据点间隔10毫秒
          
          // 处理每个X数据点
          for (let i = 0; i < (metadata.dataType === 'waveform' ? dataPoints.length : firstWaveformPoints.length); i++) {
            const point = metadata.dataType === 'waveform' ? dataPoints[i] : firstWaveformPoints[i];
            try {
              // 计算此数据点的时间戳(当前时间减去相应的间隔)
              const pointTime = new Date(currentTime.getTime() - ((metadata.dataType === 'waveform' ? dataPoints.length : firstWaveformPoints.length) - 1 - i) * interval);
              
              // 尝试解析数值
              const amplitude = parseFloat(point);
              if (isNaN(amplitude)) {
                logger.warn(`无法解析数据点 "${point}" 为数字`);
                continue;
              }
              
              // 创建地震数据对象
              const earthquakeData = {
                amplitude: amplitude,
                timestamp: pointTime, // 使用计算的时间戳
                metadata: {
                  source: 'external',
                  raw: true,
                  batchIndex: i,
                  batchSize: metadata.dataType === 'waveform' ? dataPoints.length : firstWaveformPoints.length,
                  waveformType: 'X', // 标记为X波形
                  ...metadata // 添加解析的元数据
                }
              };
              
              // 保存到数据库
              const savedData = await saveEarthquakeData(earthquakeData);
              savedResults.push({
                id: savedData.id,
                amplitude: amplitude,
                timestamp: savedData.timestamp,
                metadata: earthquakeData.metadata
              });
              
              // 构建完整的数据对象
              const completeData = {
                ...earthquakeData,
                id: savedData.id,
                timestamp: savedData.timestamp
              };
              
              // 广播到所有WebSocket客户端
              broadcastToWebSocketClients(ws, {
                type: 'earthquake-data',
                payload: completeData
              });
              
              // 同时广播到Socket.IO客户端
              io.emit('earthquake-data', completeData);
            } catch (pointError) {
              logger.error(`保存数据点 "${point}" 时出错:`, pointError);
            }
          }
          
          // 如果存在Y波形数据，处理Y部分
          if (secondWaveform) {
            const yResults = [];
            
            // 处理每个Y数据点
            for (let i = 0; i < secondWaveform.length; i++) {
              const point = secondWaveform[i];
              try {
                // 计算此数据点的时间戳(当前时间减去相应的间隔)
                const pointTime = new Date(currentTime.getTime() - (secondWaveform.length - 1 - i) * interval);
                
                // 尝试解析数值
                const amplitude = parseFloat(point);
                if (isNaN(amplitude)) {
                  logger.warn(`无法解析Y数据点 "${point}" 为数字`);
                  continue;
                }
                
                // 创建地震数据对象
                const earthquakeData = {
                  amplitude: amplitude,
                  timestamp: pointTime, // 使用计算的时间戳
                  metadata: {
                    source: 'external',
                    raw: true,
                    batchIndex: i,
                    batchSize: secondWaveform.length,
                    waveformType: 'Y', // 标记为Y波形
                    ...metadata // 添加解析的元数据
                  }
                };
                
                // 保存到数据库
                const savedData = await saveEarthquakeData(earthquakeData);
                yResults.push({
                  id: savedData.id,
                  amplitude: amplitude,
                  timestamp: savedData.timestamp,
                  metadata: earthquakeData.metadata
                });
                
                // 构建完整的数据对象
                const completeData = {
                  ...earthquakeData,
                  id: savedData.id,
                  timestamp: savedData.timestamp
                };
                
                // 广播到所有WebSocket客户端
                broadcastToWebSocketClients(ws, {
                  type: 'earthquake-data',
                  payload: completeData
                });
                
                // 同时广播到Socket.IO客户端
                io.emit('earthquake-data', completeData);
              } catch (pointError) {
                logger.error(`保存Y数据点 "${point}" 时出错:`, pointError);
              }
            }
            
            // 合并两组结果
            savedResults.push(...yResults);
          }
          
          // 如果存在Z波形数据，处理Z部分
          if (thirdWaveform) {
            const zResults = [];
            
            // 处理每个Z数据点
            for (let i = 0; i < thirdWaveform.length; i++) {
              const point = thirdWaveform[i];
              try {
                // 计算此数据点的时间戳(当前时间减去相应的间隔)
                const pointTime = new Date(currentTime.getTime() - (thirdWaveform.length - 1 - i) * interval);
                
                // 尝试解析数值
                const amplitude = parseFloat(point);
                if (isNaN(amplitude)) {
                  logger.warn(`无法解析Z数据点 "${point}" 为数字`);
                  continue;
                }
                
                // 创建地震数据对象
                const earthquakeData = {
                  amplitude: amplitude,
                  timestamp: pointTime, // 使用计算的时间戳
                  metadata: {
                    source: 'external',
                    raw: true,
                    batchIndex: i,
                    batchSize: thirdWaveform.length,
                    waveformType: 'Z', // 标记为Z波形
                    ...metadata // 添加解析的元数据
                  }
                };
                
                // 保存到数据库
                const savedData = await saveEarthquakeData(earthquakeData);
                zResults.push({
                  id: savedData.id,
                  amplitude: amplitude,
                  timestamp: savedData.timestamp,
                  metadata: earthquakeData.metadata
                });
                
                // 构建完整的数据对象
                const completeData = {
                  ...earthquakeData,
                  id: savedData.id,
                  timestamp: savedData.timestamp
                };
                
                // 广播到所有WebSocket客户端
                broadcastToWebSocketClients(ws, {
                  type: 'earthquake-data',
                  payload: completeData
                });
                
                // 同时广播到Socket.IO客户端
                io.emit('earthquake-data', completeData);
              } catch (pointError) {
                logger.error(`保存Z数据点 "${point}" 时出错:`, pointError);
              }
            }
            
            // 合并Z结果
            savedResults.push(...zResults);
          }
          
          // 发送汇总确认消息
          ws.send(JSON.stringify({
            type: 'confirmation',
            message: `成功接收并保存了${savedResults.length}个数据点`,
            data: savedResults
          }));
          
          logger.info(`已转发${savedResults.length}个数据点到所有客户端`);
        } else {
          // 常规格式，无特殊标记
          dataPoints = parsedMessage.split(',').map(point => point.trim()).filter(point => point.length > 0);
          logger.info(`收到${dataPoints.length}个逗号分隔的数据点`);
          
          const savedResults = [];
          const currentTime = new Date();
          const interval = 10; // 每个数据点间隔10毫秒
          
          // 处理每个数据点
          for (let i = 0; i < dataPoints.length; i++) {
            const point = dataPoints[i];
            try {
              // 计算此数据点的时间戳(当前时间减去相应的间隔)
              const pointTime = new Date(currentTime.getTime() - (dataPoints.length - 1 - i) * interval);
              
              // 尝试解析数值
              const amplitude = parseFloat(point);
              if (isNaN(amplitude)) {
                logger.warn(`无法解析数据点 "${point}" 为数字`);
                continue;
              }
              
              // 创建地震数据对象
              const earthquakeData = {
                amplitude: amplitude,
                timestamp: pointTime, // 使用计算的时间戳
                metadata: {
                  source: 'external',
                  raw: true,
                  batchIndex: i,
                  batchSize: dataPoints.length,
                  ...metadata // 添加解析的元数据
                }
              };
              
              // 保存到数据库
              const savedData = await saveEarthquakeData(earthquakeData);
              savedResults.push({
                id: savedData.id,
                amplitude: amplitude,
                timestamp: savedData.timestamp,
                metadata: earthquakeData.metadata
              });
              
              // 构建完整的数据对象
              const completeData = {
                ...earthquakeData,
                id: savedData.id,
                timestamp: savedData.timestamp
              };
              
              // 广播到所有WebSocket客户端
              broadcastToWebSocketClients(ws, {
                type: 'earthquake-data',
                payload: completeData
              });
              
              // 同时广播到Socket.IO客户端
              io.emit('earthquake-data', completeData);
            } catch (pointError) {
              logger.error(`保存数据点 "${point}" 时出错:`, pointError);
            }
          }
          
          // 发送汇总确认消息
          ws.send(JSON.stringify({
            type: 'confirmation',
            message: `成功接收并保存了${savedResults.length}个数据点`,
            data: savedResults
          }));
          
          logger.info(`已转发${savedResults.length}个数据点到所有客户端`);
        }
      } else {
        // 单个数据点处理
        // 直接将原始消息视为振幅值
        const amplitude = rawMessage;
        
        // 创建地震数据对象
        const earthquakeData = {
          amplitude: amplitude,
          timestamp: new Date(),
          metadata: {
            source: 'external',
            raw: true
          }
        };
        
        logData('WebSocket-原始数据', earthquakeData);
        
        // 保存到数据库
        logger.info('准备保存原始振幅数据到数据库');
        const savedData = await saveEarthquakeData(earthquakeData);
        logger.info(`已保存原始振幅数据到数据库: ID=${savedData.id}, 时间=${savedData.timestamp.toISOString()}, 原始数据=${amplitude}`);
        
        // 构建完整的数据对象
        const completeData = {
          ...earthquakeData,
          id: savedData.id,
          timestamp: savedData.timestamp
        };
        
        // 广播到所有WebSocket客户端
        broadcastToWebSocketClients(ws, {
          type: 'earthquake-data',
          payload: completeData
        });
        
        // 同时广播到Socket.IO客户端
        io.emit('earthquake-data', completeData);
        logger.info('已转发原始振幅数据到所有客户端');
        
        // 发送确认消息
        ws.send(JSON.stringify({
          type: 'confirmation',
          message: '数据已成功接收并保存',
          data: {
            id: savedData.id,
            amplitude: amplitude,
            timestamp: savedData.timestamp
          }
        }));
      }
    } catch (dbError) {
      logger.error('保存原始数据到数据库时出错:', dbError);
      ws.send(JSON.stringify({
        type: 'error',
        message: '数据已接收但无法保存到数据库: ' + dbError.message
      }));
    }
  });
  
  ws.on('close', () => {
    logger.info('Native WebSocket 客户端已断开');
  });
  
  ws.on('error', (error) => {
    logger.error('Native WebSocket 错误:', error);
  });
});

// 辅助函数：广播到所有WebSocket客户端
function broadcastToWebSocketClients(sender, data) {
  let clientCount = 0;
  wss.clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
      clientCount++;
    }
  });
  logger.info(`已广播WebSocket消息给${clientCount}个客户端`);
}

// 启动服务器
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  logger.info(`服务器运行在端口 ${PORT}`);
  logger.info(`原生WebSocket服务器地址: ws://localhost:${PORT}/ws`);
  
  try {
    // 检查是否需要跳过数据库初始化
    if (process.env.SKIP_DB_INIT !== 'true') {
      await setupDatabase();
      logger.info('数据库初始化成功');
    } else {
      logger.info('已跳过数据库初始化');
    }

    // 将io实例传递给数据生成器，但不立即启动
    global.io = io;
    global.wss = wss; // 保存WebSocket服务器实例以供访问
    
    // 如果配置为自动生成模拟数据，启动数据生成器
    if (process.env.GENERATE_MOCK_DATA === 'true' && process.env.AUTO_START_GENERATOR === 'true') {
      startDataGenerator(io, wss);
      logger.info('模拟数据生成器已自动启动');
    } else {
      logger.info('模拟数据生成器处于待机状态，可通过API控制启动');
    }
  } catch (error) {
    logger.error('服务器启动过程中出错:', error);
  }
});

// Socket.IO连接处理
io.on('connection', (socket) => {
  logger.info(`Socket.IO客户端连接: ${socket.id}`);
  
  // 发送欢迎消息
  socket.emit('welcome', {
    message: '已成功连接到地震波监测系统',
    timestamp: new Date().toISOString()
  });
  
  // 处理从Socket.IO客户端接收到的地震数据
  socket.on('earthquake-data', async (data) => {
    logData('Socket.IO', data);
    logger.info('收到Socket.IO数据:', JSON.stringify(data));
    
    try {
      // 确保数据有时间戳
      data.timestamp = data.timestamp || new Date();
      logger.info('准备保存Socket.IO数据到数据库');
      
      // 保存到数据库
      const savedData = await saveEarthquakeData(data);
      logger.info(`已保存Socket.IO客户端数据到数据库: ID=${savedData.id}, 时间=${savedData.timestamp.toISOString()}, 幅度=${data.amplitude}`);
      
      // 构建完整的数据对象
      const completeData = {
        ...data,
        id: savedData.id,
        timestamp: savedData.timestamp
      };
      
      // 广播到所有Socket.IO客户端(除了发送者)
      socket.broadcast.emit('earthquake-data', completeData);
      
      // 广播到所有WebSocket客户端
      const wsMessage = JSON.stringify({
        type: 'earthquake-data',
        payload: completeData
      });
      
      let clientCount = 0;
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(wsMessage);
          clientCount++;
        }
      });
      
      logger.info(`已转发Socket.IO客户端数据到${clientCount}个WebSocket客户端和所有其他Socket.IO客户端`);
    } catch (error) {
      logger.error('处理Socket.IO客户端数据时出错:', error);
      socket.emit('error', { message: '数据已接收但无法保存或广播: ' + error.message });
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`Socket.IO客户端断开连接: ${socket.id}`);
  });
});

// 优雅关闭函数
function gracefulShutdown(signal) {
  logger.info(`${signal}信号已接收，正在关闭服务器...`);
  
  // 设置关闭超时
  const timeout = setTimeout(() => {
    logger.error('服务器关闭超时，强制退出');
    process.exit(1);
  }, 5000); // 5秒超时
  
  // 停止数据生成器
  if (getGeneratorStatus().running) {
    stopDataGenerator();
    logger.info('数据生成器已停止');
  }
  
  // 关闭WebSocket服务器
  wss.close(() => {
    logger.info('WebSocket服务器已关闭');
  });
  
  // 关闭数据库连接池
  pool.end(() => {
    logger.info('数据库连接池已关闭');
  });
  
  server.close(() => {
    logger.info('HTTP服务器已关闭');
    clearTimeout(timeout); // 取消超时
    process.exit(0);
  });
}

// 监听各种退出信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));  // Ctrl+C
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT')); // Ctrl+\

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  gracefulShutdown('uncaughtException');
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
  gracefulShutdown('unhandledRejection');
});
const express = require('express');
const router = express.Router();
const cacheManager = require('../utils/cacheManager');
const logger = require('../utils/logger');

// 获取缓存统计信息
router.get('/cache/stats', (req, res) => {
  try {
    const stats = cacheManager.getStats();
    
    res.json({
      status: 200,
      data: {
        cache: stats,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    });
  } catch (error) {
    logger.error('获取缓存统计失败:', error);
    res.status(500).json({
      message: '获取缓存统计失败',
      status: 500,
      details: error.message
    });
  }
});

// 清理缓存
router.post('/cache/clear', (req, res) => {
  try {
    const { type = 'all' } = req.body;
    
    let result = false;
    switch (type) {
      case 'all':
        cacheManager.clear();
        result = true;
        break;
      case 'analysis':
        // 清理分析相关缓存
        const keys = cacheManager.keys();
        keys.forEach(key => {
          if (key.includes('analysis')) {
            cacheManager.delete(key);
          }
        });
        result = true;
        break;
      case 'data':
        // 清理数据相关缓存
        const dataKeys = cacheManager.keys();
        dataKeys.forEach(key => {
          if (key.includes('historical') || key.includes('data')) {
            cacheManager.delete(key);
          }
        });
        result = true;
        break;
      default:
        return res.status(400).json({
          message: '无效的缓存类型',
          status: 400,
          details: '支持的缓存类型: all, analysis, data'
        });
    }

    if (result) {
      logger.info(`缓存清理完成: ${type}`);
      res.json({
        status: 201,
        data: {
          message: `${type}缓存已清理`,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
          message: '缓存清理失败',
          status: 500,
          details: '无法完成缓存清理操作'
        });
    }
  } catch (error) {
    logger.error('清理缓存失败:', error);
    res.status(500).json({
      message: '缓存清理失败',
        status: 500,
        details: error.message
    });
  }
});

// 预热缓存
router.post('/cache/warmup', async (req, res) => {
  try {
    const { type = 'basic' } = req.body;
    
    logger.info(`开始预热缓存: ${type}`);
    
    // 模拟预热数据
    const warmupData = [];
    
    if (type === 'basic' || type === 'all') {
      // 预热基础分析缓存
      warmupData.push({
        key: cacheManager.generateKey('analysis:basic', { preset: 'default' }),
        value: {
          type: 'basic',
          prewarmed: true,
          timestamp: new Date().toISOString()
        },
        ttl: 10 * 60 * 1000 // 10分钟
      });
    }
    
    if (type === 'professional' || type === 'all') {
      // 预热专业分析缓存
      warmupData.push({
        key: cacheManager.generateKey('analysis:professional', { preset: 'default' }),
        value: {
          type: 'professional',
          prewarmed: true,
          timestamp: new Date().toISOString()
        },
        ttl: 15 * 60 * 1000 // 15分钟
      });
    }
    
    // 执行预热
    const warmedCount = await cacheManager.warmup(warmupData);
    
    logger.info(`缓存预热完成: ${warmedCount} 个条目`);
    
    res.json({
        status: 201,
        data: {
          message: `缓存预热完成`,
          warmedCount,
          type,
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    logger.error('缓存预热失败:', error);
    res.status(500).json({
      message: '缓存预热失败',
      status: 500,
      details: error.message
    });
  }
});

// 系统性能监控
router.get('/system/stats', (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const stats = {
      system: {
        uptime: process.uptime(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid
      },
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      cache: cacheManager.getStats(),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      status:200,
      data: stats
    });
  } catch (error) {
    logger.error('获取系统统计失败:', error);
    res.status(500).json({
      message: '获取系统统计失败',
      status: 500,
      details: error.message
    });
  }
});

// 健康检查
router.get('/health', (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    const health = {
      status: 'healthy',
      checks: {
        memory: {
          status: heapUsedPercent < 90 ? 'healthy' : 'warning',
          heapUsedPercent: Math.round(heapUsedPercent),
          message: heapUsedPercent < 90 ? '内存使用正常' : '内存使用率较高'
        },
        cache: {
          status: 'healthy',
          size: cacheManager.getStats().size,
          message: '缓存运行正常'
        },
        uptime: {
          status: 'healthy',
          uptime: process.uptime(),
          message: `系统运行时间: ${Math.round(process.uptime())}秒`
        }
      },
      timestamp: new Date().toISOString()
    };
    
    // 检查是否有任何警告或错误
    const hasWarning = Object.values(health.checks).some(check => check.status === 'warning');
    const hasError = Object.values(health.checks).some(check => check.status === 'error');
    
    if (hasError) {
      health.status = 'unhealthy';
    } else if (hasWarning) {
      health.status = 'warning';
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json({
      status:200,
      data: health
    });
  } catch (error) {
    logger.error('健康检查失败:', error);
    res.status(503).json({
      message: '健康检查失败',
      status: 503,
      details: error.message
    });
  }
});

// 性能测试端点
router.post('/test/load', async (req, res) => {
  try {
    const { 
      iterations = 100, 
      delay = 10, 
      testType = 'cache' 
    } = req.body;
    
    logger.info(`开始性能测试: ${testType}, 迭代次数: ${iterations}`);
    
    const startTime = Date.now();
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const iterationStart = Date.now();
      
      if (testType === 'cache') {
        // 测试缓存性能
        const key = `test_${i}_${Date.now()}`;
        const value = { iteration: i, timestamp: new Date().toISOString() };
        
        cacheManager.set(key, value);
        const retrieved = cacheManager.get(key);
        
        results.push({
          iteration: i,
          duration: Date.now() - iterationStart,
          success: retrieved !== null
        });
      }
      
      // 添加延迟避免阻塞
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / iterations;
    const successCount = results.filter(r => r.success).length;
    
    const testResults = {
      testType,
      iterations,
      totalTime,
      avgTime: Math.round(avgTime * 100) / 100,
      successRate: (successCount / iterations) * 100,
      results: results.slice(0, 10), // 只返回前10个结果
      timestamp: new Date().toISOString()
    };
    
    logger.info(`性能测试完成: 平均耗时 ${avgTime}ms, 成功率 ${testResults.successRate}%`);
    
    res.json({
        status: 201,
        data: testResults
      });
  } catch (error) {
    logger.error('性能测试失败:', error);
    res.status(500).json({
      message: '性能测试失败',
      status: 500,
      details: error.message
    });
  }
});

module.exports = router;

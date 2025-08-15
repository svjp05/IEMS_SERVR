const logger = require('./logger');

// 简单的内存缓存管理器
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time To Live
    this.defaultTTL = 5 * 60 * 1000; // 5分钟默认过期时间
    this.maxSize = 1000; // 最大缓存条目数
    
    // 定期清理过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // 每分钟清理一次
  }

  // 生成缓存键
  generateKey(prefix, params) {
    const paramString = typeof params === 'object' ? JSON.stringify(params) : String(params);
    return `${prefix}:${paramString}`;
  }

  // 设置缓存
  set(key, value, ttlMs = null) {
    try {
      // 如果缓存已满，删除最旧的条目
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.delete(firstKey);
      }

      const expirationTime = Date.now() + (ttlMs || this.defaultTTL);
      
      this.cache.set(key, value);
      this.ttl.set(key, expirationTime);
      
      logger.debug(`缓存设置: ${key}, 过期时间: ${new Date(expirationTime).toISOString()}`);
    } catch (error) {
      logger.error('设置缓存失败:', error);
    }
  }

  // 获取缓存
  get(key) {
    try {
      if (!this.cache.has(key)) {
        return null;
      }

      const expirationTime = this.ttl.get(key);
      if (Date.now() > expirationTime) {
        // 缓存已过期
        this.delete(key);
        logger.debug(`缓存过期: ${key}`);
        return null;
      }

      const value = this.cache.get(key);
      logger.debug(`缓存命中: ${key}`);
      return value;
    } catch (error) {
      logger.error('获取缓存失败:', error);
      return null;
    }
  }

  // 删除缓存
  delete(key) {
    try {
      this.cache.delete(key);
      this.ttl.delete(key);
      logger.debug(`缓存删除: ${key}`);
    } catch (error) {
      logger.error('删除缓存失败:', error);
    }
  }

  // 清空所有缓存
  clear() {
    try {
      this.cache.clear();
      this.ttl.clear();
      logger.info('所有缓存已清空');
    } catch (error) {
      logger.error('清空缓存失败:', error);
    }
  }

  // 清理过期缓存
  cleanup() {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, expirationTime] of this.ttl.entries()) {
        if (now > expirationTime) {
          this.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.debug(`清理了 ${cleanedCount} 个过期缓存条目`);
      }
    } catch (error) {
      logger.error('清理缓存失败:', error);
    }
  }

  // 获取缓存统计信息
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL,
      usage: `${((this.cache.size / this.maxSize) * 100).toFixed(2)}%`
    };
  }

  // 缓存分析数据的辅助方法
  cacheAnalysisData(analysisType, params, data, ttlMs = null) {
    const key = this.generateKey(`analysis:${analysisType}`, params);
    this.set(key, data, ttlMs || 10 * 60 * 1000); // 分析数据缓存10分钟
  }

  // 获取缓存的分析数据
  getCachedAnalysisData(analysisType, params) {
    const key = this.generateKey(`analysis:${analysisType}`, params);
    return this.get(key);
  }

  // 缓存历史数据的辅助方法
  cacheHistoricalData(params, data, ttlMs = null) {
    const key = this.generateKey('historical', params);
    this.set(key, data, ttlMs || 5 * 60 * 1000); // 历史数据缓存5分钟
  }

  // 获取缓存的历史数据
  getCachedHistoricalData(params) {
    const key = this.generateKey('historical', params);
    return this.get(key);
  }

  // 缓存AI响应的辅助方法
  cacheAIResponse(prompt, context, response, ttlMs = null) {
    const key = this.generateKey('ai_response', { prompt, context });
    this.set(key, response, ttlMs || 15 * 60 * 1000); // AI响应缓存15分钟
  }

  // 获取缓存的AI响应
  getCachedAIResponse(prompt, context) {
    const key = this.generateKey('ai_response', { prompt, context });
    return this.get(key);
  }

  // 缓存报告数据的辅助方法
  cacheReportData(reportType, params, data, ttlMs = null) {
    const key = this.generateKey(`report:${reportType}`, params);
    this.set(key, data, ttlMs || 30 * 60 * 1000); // 报告数据缓存30分钟
  }

  // 获取缓存的报告数据
  getCachedReportData(reportType, params) {
    const key = this.generateKey(`report:${reportType}`, params);
    return this.get(key);
  }

  // 批量设置缓存
  setBatch(items) {
    try {
      let successCount = 0;
      for (const { key, value, ttl } of items) {
        this.set(key, value, ttl);
        successCount++;
      }
      logger.info(`批量设置缓存完成: ${successCount}/${items.length}`);
      return successCount;
    } catch (error) {
      logger.error('批量设置缓存失败:', error);
      return 0;
    }
  }

  // 批量获取缓存
  getBatch(keys) {
    try {
      const results = {};
      for (const key of keys) {
        results[key] = this.get(key);
      }
      return results;
    } catch (error) {
      logger.error('批量获取缓存失败:', error);
      return {};
    }
  }

  // 检查缓存是否存在且未过期
  has(key) {
    return this.get(key) !== null;
  }

  // 获取所有缓存键
  keys() {
    return Array.from(this.cache.keys());
  }

  // 获取缓存命中率
  getHitRate() {
    // 这里需要添加命中率统计逻辑
    // 简化版本，实际应该记录命中和未命中次数
    return {
      total: this.cache.size,
      usage: `${((this.cache.size / this.maxSize) * 100).toFixed(2)}%`
    };
  }

  // 预热缓存 - 预加载常用数据
  async warmup(warmupData) {
    try {
      logger.info('开始预热缓存...');
      let warmedCount = 0;

      for (const { key, value, ttl } of warmupData) {
        this.set(key, value, ttl);
        warmedCount++;
      }

      logger.info(`缓存预热完成: ${warmedCount} 个条目`);
      return warmedCount;
    } catch (error) {
      logger.error('缓存预热失败:', error);
      return 0;
    }
  }

  // 销毁缓存管理器
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
    logger.info('缓存管理器已销毁');
  }
}

// 创建单例实例
const cacheManager = new CacheManager();

// 优雅关闭处理
process.on('SIGINT', () => {
  cacheManager.destroy();
});

process.on('SIGTERM', () => {
  cacheManager.destroy();
});

module.exports = cacheManager;

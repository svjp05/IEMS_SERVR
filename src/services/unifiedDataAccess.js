const logger = require('../utils/logger');

// 统一数据访问层 - 整合两个数据库模块的功能
class UnifiedDataAccess {
  constructor() {
    this.primaryDb = null;
    this.fallbackDb = null;
    this.initialized = false;
  }

  // 初始化数据访问层
  async initialize() {
    try {
      // 优先使用统一的数据库接口
      this.primaryDb = require('../db/index');
      this.fallbackDb = require('../db');
      
      // 确保数据库已设置
      await this.primaryDb.setupDatabase();
      await this.fallbackDb.setupDatabase();
      
      this.initialized = true;
      logger.info('统一数据访问层初始化成功');
    } catch (error) {
      logger.error('统一数据访问层初始化失败:', error);
      throw error;
    }
  }

  // 保存地震数据
  async saveEarthquakeData(data) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // 优先使用主数据库接口
      return await this.primaryDb.saveEarthquakeData(data);
    } catch (error) {
      logger.warn('主数据库接口保存失败，尝试备用接口:', error.message);
      try {
        return await this.fallbackDb.saveEarthquakeData(data);
      } catch (fallbackError) {
        logger.error('备用数据库接口也失败:', fallbackError.message);
        throw fallbackError;
      }
    }
  }

  // 查询历史数据
  async getHistoricalData(startDate, endDate, waveformType = null, limit = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // 优先使用主数据库接口
      return await this.primaryDb.getHistoricalData(startDate, endDate, waveformType, limit);
    } catch (error) {
      logger.warn('主数据库接口查询失败，尝试备用接口:', error.message);
      try {
        if (waveformType) {
          return await this.fallbackDb.queryEarthquakeData(startDate, endDate, waveformType, limit);
        } else {
          return await this.fallbackDb.queryAllWaveformData(startDate, endDate, limit);
        }
      } catch (fallbackError) {
        logger.error('备用数据库接口也失败:', fallbackError.message);
        throw fallbackError;
      }
    }
  }

  // 查询所有波形数据
  async queryAllWaveformData(startDate, endDate, limit = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // 优先使用主数据库接口
      return await this.primaryDb.queryAllWaveformData(startDate, endDate, limit);
    } catch (error) {
      logger.warn('主数据库接口查询失败，尝试备用接口:', error.message);
      try {
        return await this.fallbackDb.queryAllWaveformData(startDate, endDate, limit);
      } catch (fallbackError) {
        logger.error('备用数据库接口也失败:', fallbackError.message);
        throw fallbackError;
      }
    }
  }

  // 获取最新数据
  async getLatestData(limit = 100) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // 尝试从主数据库获取
      const query = `
        SELECT id, timestamp, amplitude, metadata, 'earthquake_data' as table_name
        FROM earthquake_data
        ORDER BY timestamp DESC
        LIMIT $1
      `;
      const result = await this.primaryDb.pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.warn('主数据库接口获取最新数据失败，尝试备用接口:', error.message);
      try {
        return await this.fallbackDb.getLatestEarthquakeData(limit);
      } catch (fallbackError) {
        logger.error('备用数据库接口也失败:', fallbackError.message);
        throw fallbackError;
      }
    }
  }

  // 获取统计数据
  async getStatistics(period = 'day') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // 优先使用主数据库接口
      return await this.primaryDb.getStatistics(period);
    } catch (error) {
      logger.warn('主数据库接口获取统计失败，尝试备用接口:', error.message);
      try {
        // 备用方案：简单统计
        let timeInterval;
        switch (period) {
          case 'day':
            timeInterval = '1 day';
            break;
          case 'week':
            timeInterval = '7 days';
            break;
          case 'month':
            timeInterval = '30 days';
            break;
          default:
            timeInterval = '1 day';
        }

        const query = `
          SELECT 
            AVG(CAST(amplitude AS FLOAT)) as average_amplitude,
            MAX(CAST(amplitude AS FLOAT)) as max_amplitude,
            COUNT(*) as data_point_count
          FROM earthquake_data
          WHERE timestamp > NOW() - INTERVAL '${timeInterval}';
        `;

        const result = await this.primaryDb.pool.query(query);
        return result.rows[0];
      } catch (fallbackError) {
        logger.error('备用统计查询也失败:', fallbackError.message);
        throw fallbackError;
      }
    }
  }

  // 生成测试数据
  async generateTestData(count = 100, daysRange = 7) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      return await this.fallbackDb.generateTestData(count, daysRange);
    } catch (error) {
      logger.error('生成测试数据失败:', error);
      throw error;
    }
  }

  // 清空测试数据
  async clearTestData() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      return await this.fallbackDb.clearTestData();
    } catch (error) {
      logger.error('清空测试数据失败:', error);
      throw error;
    }
  }

  // 健康检查
  async healthCheck() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // 检查主数据库连接
      await this.primaryDb.pool.query('SELECT NOW()');
      
      return {
        status: 'healthy',
        primaryDb: 'connected',
        fallbackDb: 'available',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('数据库健康检查失败:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// 创建单例实例
const unifiedDataAccess = new UnifiedDataAccess();

module.exports = unifiedDataAccess;

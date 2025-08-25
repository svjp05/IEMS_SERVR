const { Pool } = require('pg');
const logger = require('../utils/logger');

// 创建数据库连接池
// 支持两种连接方式: DATABASE_URL 或单独的连接参数
const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      port: process.env.PGPORT,
    };

const pool = new Pool(poolConfig);

// 测试数据库连接
pool.on('connect', () => {
  logger.info('数据库连接成功');
});

pool.on('error', (err) => {
  logger.error('数据库连接错误:', err);
});

// 设置数据库 - 创建必要的表（统一使用多表结构）
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    // 创建主地震数据表
    await client.query(`
      CREATE TABLE IF NOT EXISTS earthquake_data (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        amplitude VARCHAR(255) NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);
    logger.info('主地震数据表检查/创建完成');

    // 创建X波形数据表
    await client.query(`
      CREATE TABLE IF NOT EXISTS earthquake_data_x (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        amplitude VARCHAR(255) NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);
    logger.info('X波形数据表检查/创建完成');

    // 创建Y波形数据表
    await client.query(`
      CREATE TABLE IF NOT EXISTS earthquake_data_y (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        amplitude VARCHAR(255) NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);
    logger.info('Y波形数据表检查/创建完成');

    // 创建Z波形数据表
    await client.query(`
      CREATE TABLE IF NOT EXISTS earthquake_data_z (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        amplitude VARCHAR(255) NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);
    logger.info('Z波形数据表检查/创建完成');

    // 创建索引以加快时间范围查询
    await client.query(`CREATE INDEX IF NOT EXISTS earthquake_data_timestamp_idx ON earthquake_data (timestamp);`);
    await client.query(`CREATE INDEX IF NOT EXISTS earthquake_data_x_timestamp_idx ON earthquake_data_x (timestamp);`);
    await client.query(`CREATE INDEX IF NOT EXISTS earthquake_data_y_timestamp_idx ON earthquake_data_y (timestamp);`);
    await client.query(`CREATE INDEX IF NOT EXISTS earthquake_data_z_timestamp_idx ON earthquake_data_z (timestamp);`);
    logger.info('数据库索引创建完成');

    // 如果使用TimescaleDB，设置时间序列扩展
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`);
      await client.query(`SELECT create_hypertable('earthquake_data', 'timestamp', IF_NOT_EXISTS => TRUE);`);
      await client.query(`SELECT create_hypertable('earthquake_data_x', 'timestamp', IF_NOT_EXISTS => TRUE);`);
      await client.query(`SELECT create_hypertable('earthquake_data_y', 'timestamp', IF_NOT_EXISTS => TRUE);`);
      await client.query(`SELECT create_hypertable('earthquake_data_z', 'timestamp', IF_NOT_EXISTS => TRUE);`);
      logger.info('TimescaleDB扩展已设置');
    } catch (error) {
      logger.warn('无法设置TimescaleDB扩展，将使用标准PostgreSQL:', error.message);
    }

    return true;
  } catch (error) {
    logger.error('设置数据库时出错:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 保存地震数据（统一使用多表结构）
const saveEarthquakeData = async (data) => {
  try {
    // 确保数据包含必要字段
    if (data.amplitude === undefined || data.amplitude === null) {
      throw new Error('缺少振幅数据');
    }

    // 确保时间戳是Date对象
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    // 处理metadata，确保它是JSON格式
    const metadata = typeof data.metadata === 'object' ? data.metadata : {};

    // 检查波形类型并选择对应的表
    let tableName = 'earthquake_data';
    if (metadata.waveformType) {
      if (metadata.waveformType === 'X') {
        tableName = 'earthquake_data_x';
      } else if (metadata.waveformType === 'Y') {
        tableName = 'earthquake_data_y';
      } else if (metadata.waveformType === 'Z') {
        tableName = 'earthquake_data_z';
      }
    }

    // 保存数据
    const query = `
      INSERT INTO ${tableName} (timestamp, amplitude, metadata)
      VALUES ($1, $2, $3)
      RETURNING id, timestamp, amplitude, metadata
    `;

    const values = [timestamp, data.amplitude, JSON.stringify(metadata)];
    const result = await pool.query(query, values);

    // 返回包含表名的结果，以便前端知道数据类型
    const resultData = result.rows[0];
    resultData.tableName = tableName;

    return resultData;
  } catch (error) {
    logger.error('保存地震数据时出错:', error);
    throw error;
  }
};

// 获取历史地震数据（统一使用多表结构）
const getHistoricalData = async (startDate, endDate, waveformType = null, limit = null) => {
  try {
    logger.info(`查询地震数据: startDate=${startDate}, endDate=${endDate}, waveformType=${waveformType || '全部'}`);

    // 处理日期参数
    const now = new Date();
    let parsedStartTime = new Date(startDate);
    let parsedEndTime = new Date(endDate);

    // 如果日期在未来，将其限制为当前时间
    if (parsedStartTime > now) {
      logger.warn(`开始日期 ${startDate} 在未来，已自动调整为当前时间`);
      parsedStartTime = now;
    }

    if (parsedEndTime > now) {
      logger.warn(`结束日期 ${endDate} 在未来，已自动调整为当前时间`);
      parsedEndTime = now;
    }

    // 确保开始时间不大于结束时间
    if (parsedStartTime > parsedEndTime) {
      logger.warn('开始时间大于结束时间，自动调整为相同时间');
      parsedStartTime = parsedEndTime;
    }

    // 根据波形类型选择查询表
    let tableName;
    if (waveformType === 'X') {
      tableName = 'earthquake_data_x';
    } else if (waveformType === 'Y') {
      tableName = 'earthquake_data_y';
    } else if (waveformType === 'Z') {
      tableName = 'earthquake_data_z';
    } else {
      tableName = 'earthquake_data'; // 默认使用主表
    }

    // 构建查询
    let query = `
      SELECT id, timestamp, amplitude, metadata, '${tableName}' as table_name
      FROM ${tableName}
      WHERE timestamp BETWEEN $1 AND $2
      ORDER BY timestamp ASC
    `;

    const params = [parsedStartTime, parsedEndTime];

    // 只有当limit参数有值时才添加LIMIT子句
    if (limit !== null) {
      query += ` LIMIT $3`;
      params.push(limit);
    }

    logger.info(`执行查询: 表=${tableName}, 时间范围=${parsedStartTime.toISOString()} 至 ${parsedEndTime.toISOString()}`);
    const result = await pool.query(query, params);

    logger.info(`查询结果: 从表 ${tableName} 找到${result.rows.length}条记录`);

    // 处理数据
    const data = result.rows.map(row => {
      let processedRow = { ...row };

      // 尝试提取数值振幅
      if (typeof row.amplitude === 'string') {
        const numericPattern = /^[0-9]+(\.[0-9]+)?$/;
        if (numericPattern.test(row.amplitude)) {
          processedRow.numeric_amplitude = parseFloat(row.amplitude);
        }
      }

      // 如果amplitude是JSON字符串，尝试解析
      if (typeof row.amplitude === 'string' && (row.amplitude.startsWith('{') || row.amplitude.startsWith('['))) {
        try {
          processedRow.amplitude = JSON.parse(row.amplitude);
        } catch (e) {
          // 保持原始字符串
        }
      }

      // 添加波形类型
      processedRow.waveform_type = waveformType || 'unknown';

      // 从metadata中获取波形类型
      try {
        const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        processedRow.waveformType = metadata.waveformType || waveformType || 'unknown';
      } catch (e) {
        processedRow.waveformType = waveformType || 'unknown';
      }

      return processedRow;
    });

    return data;
  } catch (error) {
    logger.error('查询地震数据时出错:', error);
    throw error;
  }
};

// 查询所有类型的波形数据（整合所有表数据）
const queryAllWaveformData = async (startTime, endTime, limit = null) => {
  try {
    logger.info(`查询所有波形数据: startTime=${startTime}, endTime=${endTime}`);

    // 处理日期参数
    const now = new Date();
    let parsedStartTime = new Date(startTime);
    let parsedEndTime = new Date(endTime);

    // 如果日期在未来，将其限制为当前时间
    if (parsedStartTime > now) {
      logger.warn(`开始日期 ${startTime} 在未来，已自动调整为当前时间`);
      parsedStartTime = now;
    }

    if (parsedEndTime > now) {
      logger.warn(`结束日期 ${endTime} 在未来，已自动调整为当前时间`);
      parsedEndTime = now;
    }

    // 确保开始时间不大于结束时间
    if (parsedStartTime > parsedEndTime) {
      logger.warn('开始时间大于结束时间，自动调整为相同时间');
      parsedStartTime = parsedEndTime;
    }

    // 使用单独的查询，然后在JS中合并结果
    logger.info('分别查询各类型波形数据，然后在JS中合并');

    const params = [parsedStartTime, parsedEndTime];

    // 查询X波形数据
    const xQuery = `
      SELECT id, timestamp, amplitude, metadata, 'earthquake_data_x' as table_name, 'X' as waveform_type
      FROM earthquake_data_x
      WHERE timestamp BETWEEN $1 AND $2
      ORDER BY timestamp ASC
    `;

    // 查询Y波形数据
    const yQuery = `
      SELECT id, timestamp, amplitude, metadata, 'earthquake_data_y' as table_name, 'Y' as waveform_type
      FROM earthquake_data_y
      WHERE timestamp BETWEEN $1 AND $2
      ORDER BY timestamp ASC
    `;

    // 查询Z波形数据
    const zQuery = `
      SELECT id, timestamp, amplitude, metadata, 'earthquake_data_z' as table_name, 'Z' as waveform_type
      FROM earthquake_data_z
      WHERE timestamp BETWEEN $1 AND $2
      ORDER BY timestamp ASC
    `;

    // 查询未知类型数据
    const unknownQuery = `
      SELECT id, timestamp, amplitude, metadata, 'earthquake_data' as table_name, 'unknown' as waveform_type
      FROM earthquake_data
      WHERE timestamp BETWEEN $1 AND $2
      ORDER BY timestamp ASC
    `;

    // 并行执行所有查询
    const [xResult, yResult, zResult, unknownResult] = await Promise.all([
      pool.query(xQuery, params),
      pool.query(yQuery, params),
      pool.query(zQuery, params),
      pool.query(unknownQuery, params)
    ]);

    // 合并所有结果
    let allRows = [
      ...xResult.rows,
      ...yResult.rows,
      ...zResult.rows,
      ...unknownResult.rows
    ];

    // 根据时间戳排序
    allRows.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // 如果指定了limit，应用到合并后的结果
    if (limit !== null) {
      allRows = allRows.slice(0, limit);
    }

    logger.info(`所有波形数据查询结果: 总共找到${allRows.length}条记录 (X: ${xResult.rows.length}, Y: ${yResult.rows.length}, Z: ${zResult.rows.length}, 未知: ${unknownResult.rows.length})`);

    // 处理数据
    const data = allRows.map(row => {
      let processedRow = { ...row };

      // 尝试提取数值振幅
      if (typeof row.amplitude === 'string') {
        const numericPattern = /^[0-9]+(\.[0-9]+)?$/;
        if (numericPattern.test(row.amplitude)) {
          processedRow.numeric_amplitude = parseFloat(row.amplitude);
        }
      }

      // 如果amplitude是JSON字符串，尝试解析
      if (typeof row.amplitude === 'string' && (row.amplitude.startsWith('{') || row.amplitude.startsWith('['))) {
        try {
          processedRow.amplitude = JSON.parse(row.amplitude);
        } catch (e) {
          // 保持原始字符串
        }
      }

      // 从metadata中获取波形类型
      try {
        const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        processedRow.waveformType = metadata.waveformType || row.waveform_type || 'unknown';
      } catch (e) {
        processedRow.waveformType = row.waveform_type || 'unknown';
      }

      return processedRow;
    });

    return data;
  } catch (error) {
    logger.error('查询所有波形数据时出错:', error);
    throw error;
  }
};

// 获取统计数据
const getStatistics = async (period) => {
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

  try {
    const result = await pool.query(query);
    return result.rows[0];
  } catch (error) {
    logger.error('获取统计数据时出错:', error);
    throw error;
  }
};

// 获取分析数据
const getAnalysisData = async (startDate, endDate, analysisType) => {
  logger.debug(`执行分析数据查询: startDate=${startDate}, endDate=${endDate}, type=${analysisType}`);
  
  try {
    // 确保日期格式正确处理，加上时间部分
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);
    
    logger.debug(`格式化后的日期范围: ${start.toISOString()} 到 ${end.toISOString()}`);
    
    let query;
    
    switch (analysisType) {
      case 'frequency':
        // 频率分布分析
        query = `
          SELECT 
            date_trunc('hour', timestamp) as time,
            AVG(frequency) as value
          FROM earthquake_data
          WHERE timestamp BETWEEN $1 AND $2 AND frequency IS NOT NULL
          GROUP BY time
          ORDER BY time ASC;
        `;
        break;
      case 'amplitude':
        // 幅度分析
        query = `
          SELECT 
            date_trunc('hour', timestamp) as time,
            AVG(amplitude) as value
          FROM earthquake_data
          WHERE timestamp BETWEEN $1 AND $2
          GROUP BY time
          ORDER BY time ASC;
        `;
        break;
      case 'risk':
        // 风险等级分析
        query = `
          SELECT 
            COUNT(*) FILTER (WHERE amplitude < 2) as "lowRisk",
            COUNT(*) FILTER (WHERE amplitude >= 2 AND amplitude < 5) as "mediumRisk",
            COUNT(*) FILTER (WHERE amplitude >= 5) as "highRisk"
          FROM earthquake_data
          WHERE timestamp BETWEEN $1 AND $2;
        `;
        break;
      default:
        throw new Error('不支持的分析类型');
    }

    const result = await pool.query(query, [start, end]);
    logger.debug(`分析查询结果: 找到 ${result.rows.length} 条记录`);
    
    return result.rows;
  } catch (error) {
    logger.error(`获取${analysisType}分析数据时出错:`, error);
    throw error;
  }
};

// 获取最新的地震数据
async function getLatestEarthquakeData(limit = 100) {
  try {
    logger.info(`获取最新地震数据: 限制=${limit}`);
    
    const query = `
      SELECT id, timestamp, amplitude, metadata
      FROM earthquake_data
      ORDER BY timestamp DESC
      LIMIT $1
    `;
    
    const values = [limit];
    const result = await pool.query(query, values);
    
    logger.info(`获取最新数据结果: 找到${result.rows.length}条记录`);
    
    return result.rows;
  } catch (error) {
    logger.error('获取最新地震数据时出错:', error);
    throw error;
  }
}

// 生成测试数据
async function generateTestData(count = 100, daysRange = 7) {
  try {
    // 创建一个批量插入的查询
    const values = [];
    const valueStrings = [];
    
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < count; i++) {
      // 随机时间戳，在过去daysRange天内
      const randomTime = new Date(now.getTime() - Math.random() * daysRange * msPerDay);
      
      // 随机振幅，范围1-10，保留两位小数
      const amplitude = (Math.random() * 9 + 1).toFixed(2);
      
      // 添加参数
      values.push(randomTime, amplitude, JSON.stringify({source: 'test-generator'}));
      valueStrings.push(`($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`);
    }
    
    // 构建并执行查询
    const query = `
      INSERT INTO earthquake_data (timestamp, amplitude, metadata)
      VALUES ${valueStrings.join(', ')}
      RETURNING id
    `;
    
    const result = await pool.query(query, values);
    
    return {
      count: result.rowCount,
      message: `已生成${result.rowCount}条测试数据`
    };
  } catch (error) {
    logger.error('生成测试数据时出错:', error);
    throw error;
  }
}

// 清空测试数据
async function clearTestData() {
  try {
    const query = `
      DELETE FROM earthquake_data
      WHERE metadata->>'source' = 'test-generator'
    `;
    
    const result = await pool.query(query);
    
    return {
      count: result.rowCount,
      message: `已清除${result.rowCount}条测试数据`
    };
  } catch (error) {
    logger.error('清除测试数据时出错:', error);
    throw error;
  }
}

// 清理资源
async function shutdown() {
  try {
    await pool.end();
    logger.info('数据库连接池已关闭');
  } catch (error) {
    logger.error('关闭数据库连接池时出错:', error);
  }
}

module.exports = {
  pool,
  setupDatabase,
  saveEarthquakeData,
  getHistoricalData,
  queryAllWaveformData,
  getStatistics,
  getAnalysisData,
  getLatestEarthquakeData,
  generateTestData,
  clearTestData,
  shutdown
};
 
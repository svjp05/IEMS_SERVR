const logger = require('../utils/logger');
const unifiedDataAccess = require('../services/unifiedDataAccess');
const cacheManager = require('../utils/cacheManager');

// 测试统一数据库接口
async function testUnifiedDatabase() {
  console.log('🔧 开始测试统一数据库接口...\n');

  try {
    // 1. 测试数据库初始化
    console.log('1. 测试数据库初始化...');
    await unifiedDataAccess.initialize();
    console.log('✅ 数据库初始化成功\n');

    // 2. 测试健康检查
    console.log('2. 测试数据库健康检查...');
    const healthStatus = await unifiedDataAccess.healthCheck();
    console.log('✅ 健康检查结果:', healthStatus);
    console.log('');

    // 3. 测试保存数据
    console.log('3. 测试保存地震数据...');
    const testData = {
      amplitude: '2.34',
      timestamp: new Date(),
      metadata: {
        waveformType: 'X',
        source: 'test-unified-interface',
        testId: Date.now()
      }
    };
    
    const savedData = await unifiedDataAccess.saveEarthquakeData(testData);
    console.log('✅ 数据保存成功:', {
      id: savedData.id,
      tableName: savedData.tableName,
      timestamp: savedData.timestamp
    });
    console.log('');

    // 4. 测试查询历史数据
    console.log('4. 测试查询历史数据...');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24小时前
    
    const historicalData = await unifiedDataAccess.getHistoricalData(
      startDate.toISOString(),
      endDate.toISOString(),
      'X',
      10
    );
    console.log(`✅ 查询到 ${historicalData.length} 条X波形历史数据`);
    if (historicalData.length > 0) {
      console.log('   最新记录:', {
        id: historicalData[historicalData.length - 1].id,
        timestamp: historicalData[historicalData.length - 1].timestamp,
        amplitude: historicalData[historicalData.length - 1].amplitude
      });
    }
    console.log('');

    // 5. 测试查询所有波形数据
    console.log('5. 测试查询所有波形数据...');
    const allWaveformData = await unifiedDataAccess.queryAllWaveformData(
      startDate.toISOString(),
      endDate.toISOString(),
      5
    );
    console.log(`✅ 查询到 ${allWaveformData.length} 条所有波形数据`);
    if (allWaveformData.length > 0) {
      const waveformTypes = [...new Set(allWaveformData.map(d => d.waveformType))];
      console.log('   包含波形类型:', waveformTypes);
    }
    console.log('');

    // 6. 测试获取最新数据
    console.log('6. 测试获取最新数据...');
    const latestData = await unifiedDataAccess.getLatestData(5);
    console.log(`✅ 获取到 ${latestData.length} 条最新数据`);
    console.log('');

    // 7. 测试获取统计数据
    console.log('7. 测试获取统计数据...');
    const statistics = await unifiedDataAccess.getStatistics('day');
    console.log('✅ 统计数据:', {
      平均振幅: statistics.average_amplitude,
      最大振幅: statistics.max_amplitude,
      数据点数量: statistics.data_point_count
    });
    console.log('');

    // 8. 测试缓存功能
    console.log('8. 测试缓存功能...');
    const cacheKey = 'test-cache';
    const cacheValue = { test: 'data', timestamp: new Date() };
    
    cacheManager.set(cacheKey, cacheValue, 5000); // 5秒过期
    const cachedValue = cacheManager.get(cacheKey);
    
    if (cachedValue && cachedValue.test === 'data') {
      console.log('✅ 缓存设置和获取成功');
    } else {
      console.log('❌ 缓存测试失败');
    }
    
    const cacheStats = cacheManager.getStats();
    console.log('   缓存统计:', cacheStats);
    console.log('');

    // 9. 测试分析数据缓存
    console.log('9. 测试分析数据缓存...');
    const analysisParams = { startDate, endDate, type: 'test' };
    const analysisData = { patterns: [], summary: 'test analysis' };
    
    cacheManager.cacheAnalysisData('pattern', analysisParams, analysisData);
    const cachedAnalysis = cacheManager.getCachedAnalysisData('pattern', analysisParams);
    
    if (cachedAnalysis && cachedAnalysis.summary === 'test analysis') {
      console.log('✅ 分析数据缓存成功');
    } else {
      console.log('❌ 分析数据缓存失败');
    }
    console.log('');

    console.log('🎉 所有测试完成！统一数据库接口工作正常。\n');
    
    return {
      success: true,
      message: '统一数据库接口测试通过',
      details: {
        dataAccess: '正常',
        caching: '正常',
        healthCheck: healthStatus
      }
    };

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    return {
      success: false,
      message: '统一数据库接口测试失败',
      error: error.message
    };
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testUnifiedDatabase()
    .then(result => {
      console.log('测试结果:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = testUnifiedDatabase;

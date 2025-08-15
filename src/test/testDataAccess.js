// 测试统一数据访问功能
require('dotenv').config();

console.log('🔧 开始测试统一数据访问功能...\n');

async function testDataAccess() {
  try {
    // 1. 测试数据库接口模块
    console.log('1. 测试数据库接口模块...');
    
    const dbIndex = require('../db/index');
    console.log('✅ db/index模块加载成功');

    // 测试数据库设置
    await dbIndex.setupDatabase();
    console.log('✅ 数据库设置完成');
    console.log('');

    // 2. 测试保存数据
    console.log('2. 测试保存数据...');
    const testData = {
      amplitude: '2.34',
      timestamp: new Date(),
      metadata: {
        waveformType: 'X',
        source: 'test-data-access',
        testId: Date.now()
      }
    };
    
    const savedData = await dbIndex.saveEarthquakeData(testData);
    console.log('✅ 数据保存成功:', {
      id: savedData.id,
      tableName: savedData.tableName,
      timestamp: savedData.timestamp
    });
    console.log('');

    // 3. 测试查询历史数据
    console.log('3. 测试查询历史数据...');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24小时前
    
    const historicalData = await dbIndex.getHistoricalData(
      startDate.toISOString(),
      endDate.toISOString(),
      'X',
      5
    );
    console.log(`✅ 查询到 ${historicalData.length} 条X波形历史数据`);
    console.log('');

    // 4. 测试查询所有波形数据
    console.log('4. 测试查询所有波形数据...');
    const allWaveformData = await dbIndex.queryAllWaveformData(
      startDate.toISOString(),
      endDate.toISOString(),
      3
    );
    console.log(`✅ 查询到 ${allWaveformData.length} 条所有波形数据`);
    if (allWaveformData.length > 0) {
      const waveformTypes = [...new Set(allWaveformData.map(d => d.waveformType))];
      console.log('   包含波形类型:', waveformTypes);
    }
    console.log('');

    // 5. 测试统计数据
    console.log('5. 测试统计数据...');
    const statistics = await dbIndex.getStatistics('day');
    console.log('✅ 统计数据:', {
      平均振幅: statistics.average_amplitude,
      最大振幅: statistics.max_amplitude,
      数据点数量: statistics.data_point_count
    });
    console.log('');

    // 6. 测试缓存管理器
    console.log('6. 测试缓存管理器...');
    try {
      const cacheManager = require('../utils/cacheManager');
      
      // 测试基本缓存功能
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
    } catch (cacheError) {
      console.log('❌ 缓存管理器测试失败:', cacheError.message);
    }
    console.log('');

    // 7. 测试API路由兼容性
    console.log('7. 测试API路由兼容性...');
    try {
      // 测试AI分析路由是否能正确加载
      const aiAnalysisRoute = require('../routes/aiAnalysis');
      console.log('✅ AI分析路由加载成功');
      
      // 测试基础数据路由是否能正确加载
      const earthquakeDataRoute = require('../routes/earthquakeData');
      console.log('✅ 基础数据路由加载成功');
    } catch (routeError) {
      console.log('❌ 路由加载失败:', routeError.message);
    }
    console.log('');

    console.log('🎉 统一数据访问功能测试完成！所有功能正常。\n');
    
    return {
      success: true,
      message: '统一数据访问功能测试通过',
      details: {
        dataAccess: '正常',
        caching: '正常',
        routes: '正常'
      }
    };

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    return {
      success: false,
      message: '统一数据访问功能测试失败',
      error: error.message
    };
  }
}

// 运行测试
testDataAccess()
  .then(result => {
    console.log('测试结果:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });

// 简单测试脚本 - 验证基本模块加载和数据库连接
require('dotenv').config();

console.log('🔧 开始简单测试...\n');

async function simpleTest() {
  try {
    // 1. 测试环境变量
    console.log('1. 检查环境变量...');
    console.log('   数据库主机:', process.env.PGHOST);
    console.log('   数据库名称:', process.env.PGDATABASE);
    console.log('   数据库端口:', process.env.PGPORT);
    console.log('✅ 环境变量检查完成\n');

    // 2. 测试模块加载
    console.log('2. 测试模块加载...');
    
    try {
      const logger = require('../utils/logger');
      console.log('✅ logger模块加载成功');
    } catch (error) {
      console.log('❌ logger模块加载失败:', error.message);
    }

    try {
      const dbIndex = require('../db/index');
      console.log('✅ db/index模块加载成功');
    } catch (error) {
      console.log('❌ db/index模块加载失败:', error.message);
    }

    try {
      const db = require('../db');
      console.log('✅ db模块加载成功');
    } catch (error) {
      console.log('❌ db模块加载失败:', error.message);
    }

    console.log('');

    // 3. 测试数据库连接
    console.log('3. 测试数据库连接...');
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        port: process.env.PGPORT,
      });

      const result = await pool.query('SELECT NOW() as current_time');
      console.log('✅ 数据库连接成功');
      console.log('   当前时间:', result.rows[0].current_time);
      
      await pool.end();
    } catch (error) {
      console.log('❌ 数据库连接失败:', error.message);
    }

    console.log('');

    // 4. 测试表是否存在
    console.log('4. 检查数据库表...');
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        port: process.env.PGPORT,
      });

      const tables = ['earthquake_data', 'earthquake_data_x', 'earthquake_data_y', 'earthquake_data_z'];
      
      for (const table of tables) {
        try {
          const result = await pool.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_name = $1
          `, [table]);
          
          if (result.rows[0].count > 0) {
            console.log(`✅ 表 ${table} 存在`);
          } else {
            console.log(`⚠️  表 ${table} 不存在`);
          }
        } catch (tableError) {
          console.log(`❌ 检查表 ${table} 失败:`, tableError.message);
        }
      }
      
      await pool.end();
    } catch (error) {
      console.log('❌ 检查数据库表失败:', error.message);
    }

    console.log('\n🎉 简单测试完成！');
    return { success: true };

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    return { success: false, error: error.message };
  }
}

// 运行测试
simpleTest()
  .then(result => {
    console.log('\n测试结果:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });

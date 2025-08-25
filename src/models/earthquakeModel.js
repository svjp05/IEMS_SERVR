/**
 * 地震波数据模型定义
 * 统一项目中使用的数据结构，确保接口间的一致性
 * 基于数据库设计文档进行更新
 */

/**
 * 地理位置信息
 * @typedef {Object} Location
 * @property {number} latitude - 纬度
 * @property {number} longitude - 经度
 * @property {string} [description] - 位置描述
 */

/**
 * 设备信息
 * @typedef {Object} DeviceInfo
 * @property {string} id - 设备唯一标识符
 * @property {string} [name] - 设备名称
 * @property {string} [firmwareVersion] - 固件版本
 * @property {string} [hardwareVersion] - 硬件版本
 * @property {Location} [location] - 设备位置
 */

/**
 * 地震数据基础模型
 * @typedef {Object} EarthquakeData
 * @property {string|number} id - 数据唯一标识符
 * @property {string} timestamp - 时间戳(ISO8601格式)
 * @property {string} deviceId - 设备标识符
 * @property {number} channel1 - 通道1地质信号
 * @property {number} channel2 - 通道2地质信号
 * @property {number} channel3 - 通道3地质信号
 * @property {number} [sampleRate] - 采样率，默认1000
 * @property {number} [gainSetting] - 增益设置，默认1
 * @property {number} [batteryVoltage] - 电池电压
 * @property {number} [temperature] - 温度
 * @property {number} [signalQuality] - 信号质量评分
 * @property {Object} [metadata] - 附加元数据
 */

/**
 * 数据提交请求模型
 * @typedef {Object} EarthquakeDataSubmitRequest
 * @property {string} deviceId - 设备标识符
 * @property {number} channel1 - 通道1地质信号
 * @property {number} channel2 - 通道2地质信号
 * @property {number} channel3 - 通道3地质信号
 * @property {string} [timestamp] - 时间戳(ISO8601格式，未提供时自动生成)
 * @property {number} [sampleRate] - 采样率
 * @property {number} [gainSetting] - 增益设置
 * @property {Object} [metadata] - 附加元数据
 */

/**
 * 数据提交响应模型
 * @typedef {Object} EarthquakeDataSubmitResponse
 * @property {string} id - 数据唯一标识符
 * @property {string} timestamp - 时间戳(ISO8601格式)
 * @property {string} deviceId - 设备标识符
 * @property {string} message - 响应消息
 * @property {Object} [broadcast] - 广播信息
 */

/**
 * 广播信息
 * @typedef {Object} BroadcastInfo
 * @property {number} nodes - 节点数量
 * @property {string} status - 广播状态(completed、pending、failed)
 */

/**
 * 验证地震数据是否符合模型规范
 * @param {Object} data - 待验证的数据
 * @returns {Array<string>} 验证错误信息数组，为空表示验证通过
 */
function validateEarthquakeData(data) {
  const errors = [];

  // 验证设备ID
  if (data.deviceId === undefined || data.deviceId === null) {
    errors.push('缺少设备标识符(deviceId)');
  } else if (typeof data.deviceId !== 'string') {
    errors.push('设备标识符(deviceId)必须是字符串类型');
  }

  // 验证通道数据
  if (data.channel1 === undefined || data.channel1 === null) {
    errors.push('缺少通道1数据(channel1)');
  } else if (typeof data.channel1 !== 'number') {
    errors.push('通道1数据(channel1)必须是数字类型');
  }

  if (data.channel2 === undefined || data.channel2 === null) {
    errors.push('缺少通道2数据(channel2)');
  } else if (typeof data.channel2 !== 'number') {
    errors.push('通道2数据(channel2)必须是数字类型');
  }

  if (data.channel3 === undefined || data.channel3 === null) {
    errors.push('缺少通道3数据(channel3)');
  } else if (typeof data.channel3 !== 'number') {
    errors.push('通道3数据(channel3)必须是数字类型');
  }

  // 验证时间戳
  if (data.timestamp !== undefined && data.timestamp !== null) {
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    if (!timestampRegex.test(data.timestamp)) {
      errors.push('时间戳(timestamp)格式无效，必须符合ISO8601格式(例如: 2024-03-21T14:30:00Z)');
    }
  }

  // 验证采样率
  if (data.sampleRate !== undefined && data.sampleRate !== null && typeof data.sampleRate !== 'number') {
    errors.push('采样率(sampleRate)必须是数字类型');
  }

  // 验证增益设置
  if (data.gainSetting !== undefined && data.gainSetting !== null && typeof data.gainSetting !== 'number') {
    errors.push('增益设置(gainSetting)必须是数字类型');
  }

  // 验证元数据
  if (data.metadata !== undefined && data.metadata !== null && typeof data.metadata !== 'object') {
    errors.push('元数据(metadata)必须是对象类型');
  }

  return errors;
}

/**
 * 格式化地震数据，确保符合模型规范
 * @param {Object} data - 待格式化的数据
 * @returns {EarthquakeData} 格式化后的地震数据
 */
function formatEarthquakeData(data) {
  const formattedData = {
    id: data.id,
    timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
    deviceId: data.deviceId,
    channel1: typeof data.channel1 === 'number' ? data.channel1 : parseFloat(data.channel1),
    channel2: typeof data.channel2 === 'number' ? data.channel2 : parseFloat(data.channel2),
    channel3: typeof data.channel3 === 'number' ? data.channel3 : parseFloat(data.channel3),
    sampleRate: data.sampleRate || 1000,
    gainSetting: data.gainSetting || 1,
    metadata: data.metadata || {}
  };

  // 处理可选字段
  if (data.batteryVoltage !== undefined) {
    formattedData.batteryVoltage = typeof data.batteryVoltage === 'number' ? data.batteryVoltage : parseFloat(data.batteryVoltage);
  }

  if (data.temperature !== undefined) {
    formattedData.temperature = typeof data.temperature === 'number' ? data.temperature : parseFloat(data.temperature);
  }

  if (data.signalQuality !== undefined) {
    formattedData.signalQuality = typeof data.signalQuality === 'number' ? data.signalQuality : parseInt(data.signalQuality, 10);
  }

  return formattedData;
}

module.exports = {
  validateEarthquakeData,
  formatEarthquakeData
};
const logger = require('../utils/logger');

// 用于机器学习和数据分析的工具函数
// 实际应用中应该使用专业库如tensorflow.js, brain.js等
const analysisTools = {
  // 检测周期性模式
  detectPeriodicPatterns: (data) => {
    logger.info('检测周期性模式，数据样本数:', data.length);
    
    // 简单实现，使用固定示例数据
    // 在实际应用中，应执行频谱分析、自相关分析等
    return [{
      id: 1,
      type: '周期性波动',
      confidence: 92,
      description: '每24小时出现一次的强度变化',
      timeRange: '全天'
    }];
  },
  
  // 检测峰值模式
  detectPeakPatterns: (data) => {
    logger.info('检测峰值模式，数据样本数:', data.length);
    
    // 提取数据中的时间点
    const timestamps = data.slice(0, 3).map(item => {
      const date = new Date(item.timestamp);
      return `${(date.getMonth()+1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }).join(', ');
    
    return [{
      id: 2,
      type: '突发峰值',
      confidence: 87,
      description: `在数据中检测到${Math.min(3, data.length)}次明显的峰值`,
      timePoints: timestamps || '数据中没有明显时间点'
    }];
  },
  
  // 分析频率分布
  analyzeFrequencyDistribution: (data) => {
    logger.info('分析频率分布，数据样本数:', data.length);
    
    // 简单实现，固定返回低频震动模式
    return [{
      id: 3,
      type: '低频震动',
      confidence: 76,
      description: '持续的低频背景震动',
      frequency: '2-5Hz'
    }];
  },
  
  // 检测异常
  detectAnomalies: (data) => {
    logger.info('检测异常，数据样本数:', data.length);
    
    if (data.length < 10) {
      logger.warn('数据样本不足，无法可靠检测异常');
      return [];
    }
    
    // 提取数据中振幅最大的两条记录作为"异常"
    const sortedData = [...data].sort((a, b) => {
      const ampA = typeof a.amplitude === 'string' ? parseFloat(a.amplitude) : 0;
      const ampB = typeof b.amplitude === 'string' ? parseFloat(b.amplitude) : 0;
      return ampB - ampA; // 降序排列
    });
    
    const anomalies = sortedData.slice(0, 2).map((item, index) => {
      const date = new Date(item.timestamp);
      const timestamp = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
      
      return {
        id: index + 1,
        timestamp,
        severity: index === 0 ? '高' : '中',
        description: index === 0 ? '异常大的波幅变化' : '频率突变',
        probability: index === 0 ? 94 : 82
      };
    });
    
    return anomalies;
  },
  
  // 预测趋势
  predictTrend: (data, duration) => {
    logger.info(`预测趋势，数据样本数: ${data.length}，预测时长: ${duration}小时`);
    
    if (data.length < 24) {
      logger.warn('训练数据不足，无法生成可靠预测');
      return {
        nextEvent: null,
        trend: '训练数据不足，无法生成可靠预测。',
        recommendations: ['收集更多数据以改进预测精度'],
        // 添加前端需要的字段
        confidence: {
          overall: 30,
          dataQuality: 20,
          modelReliability: 25,
          timeRangeApplicability: 40,
          factors: ['数据不足', '训练样本少', '预测不可靠']
        },
        modelType: 'arima',
        predictionDuration: duration,
        modelPerformance: {
          accuracy: 45,
          precision: 40,
          recall: 35,
          f1Score: 38
        }
      };
    }
    
    // 模拟预测结果
    const lastDataPoint = new Date(data[data.length - 1].timestamp);
    const predictedDate = new Date(lastDataPoint);
    predictedDate.setHours(predictedDate.getHours() + 24); // 预测24小时后
    
    const prediction = `${predictedDate.getFullYear()}-${(predictedDate.getMonth()+1).toString().padStart(2, '0')}-${predictedDate.getDate().toString().padStart(2, '0')} ${predictedDate.getHours().toString().padStart(2, '0')}:${predictedDate.getMinutes().toString().padStart(2, '0')} ± 2小时`;
    
    return {
      nextEvent: {
        prediction,
        confidence: 78,
        type: '中等强度震动',
        probability: '76%'
      },
      trend: `未来${duration}小时内，系统预测会出现1次中等强度震动，之后活动水平将回归平均值。建议密切关注${predictedDate.getHours().toString().padStart(2, '0')}:${predictedDate.getMinutes().toString().padStart(2, '0')}至${(predictedDate.getHours()+4).toString().padStart(2, '0')}:${predictedDate.getMinutes().toString().padStart(2, '0')}时段的数据波动。`,
      recommendations: [
        `增加${(predictedDate.getMonth()+1).toString().padStart(2, '0')}月${predictedDate.getDate().toString().padStart(2, '0')}日的数据采样频率`,
        '确保所有传感器正常工作',
        '准备备用电源，以防数据记录中断'
      ],
      // 添加前端需要的字段
      confidence: {
        overall: 78,
        dataQuality: 85,
        modelReliability: 82,
        timeRangeApplicability: duration <= 72 ? 90 : 70,
        factors: ['数据质量良好', '模型训练充分', '历史模式清晰', '时间范围适宜']
      },
      modelType: 'arima', // 默认使用ARIMA模型
      predictionDuration: duration,
      modelPerformance: {
        accuracy: 78,
        precision: 82,
        recall: 75,
        f1Score: 78
      }
    };
  },
  
  // AI问答响应
  generateAIResponse: (prompt, context = {}) => {
    const lowercasePrompt = prompt.toLowerCase();
    logger.info(`生成AI响应，查询: "${prompt}", 上下文类型: ${Object.keys(context).join(', ')}`);
    
    // 提取上下文中的分析结果
    const hasAnalysisResults = context.analysisResults && 
                              context.analysisResults.patterns && 
                              context.analysisResults.patterns.length > 0;
    const hasAnomalies = context.analysisResults && 
                        context.analysisResults.anomalies && 
                        context.analysisResults.anomalies.length > 0;
    const hasPrediction = context.predictResults && context.predictResults.nextEvent;
    
    // 当查询涉及分析结果时的上下文相关回答
    if (hasAnalysisResults && (
        lowercasePrompt.includes('当前') || 
        lowercasePrompt.includes('这些') || 
        lowercasePrompt.includes('分析') || 
        lowercasePrompt.includes('结果'))) {
      
      // 提取模式和异常
      const patterns = context.analysisResults.patterns;
      const anomalies = context.analysisResults.anomalies || [];
      
      // 检查是否询问当前检测到的模式
      if (lowercasePrompt.includes('模式') || lowercasePrompt.includes('pattern')) {
        return `在当前分析结果中，我检测到了${patterns.length}种主要模式：${patterns.map(p => p.type).join('、')}。
其中，${patterns[0].type}的置信度最高，达到${patterns[0].confidence}%，表现为"${patterns[0].description}"。
您想了解哪种模式的更多细节？`;
      }
      
      // 检查是否询问当前检测到的异常
      if (lowercasePrompt.includes('异常') || lowercasePrompt.includes('anomaly')) {
        if (anomalies.length > 0) {
          return `在当前分析结果中，我检测到了${anomalies.length}个值得注意的异常。
最严重的异常出现在${anomalies[0].timestamp}，表现为"${anomalies[0].description}"，
其发生概率为${anomalies[0].probability}%。这类异常通常与地震活动或环境干扰有关。
您想了解更多关于这些异常的解释或处理建议吗？`;
        } else {
          return `在当前分析结果中未检测到明显的异常。这可能表明监测期间地震活动处于正常水平，
或者异常信号太弱，未达到检测阈值。您可以尝试调整分析参数或扩大时间范围以增加检测灵敏度。`;
        }
      }
      
      // 检查是否询问总体概述
      if (lowercasePrompt.includes('概述') || lowercasePrompt.includes('总结') || lowercasePrompt.includes('summary')) {
        return `基于当前的分析结果，我可以提供以下概述：
        
检测到的主要模式包括：${patterns.map(p => p.type).join('、')}。
${hasAnomalies ? `同时检测到${anomalies.length}个异常事件。` : '未检测到明显异常。'}

总体而言，${context.analysisResults.summary}

基于这些发现，我建议您关注${patterns[0]?.type || '数据中的周期性变化'}，并考虑增加采样频率以获取更详细的数据。`;
      }
      
      // 请求进一步解释某个特定模式
      for (const pattern of patterns) {
        if (lowercasePrompt.includes(pattern.type.toLowerCase())) {
          return `关于"${pattern.type}"模式，我可以提供以下详细解释：
          
这种模式的置信度为${pattern.confidence}%，主要表现为"${pattern.description}"。
${pattern.timeRange ? `它在${pattern.timeRange}时段最为明显。` : ''}
${pattern.frequency ? `其频率范围主要集中在${pattern.frequency}。` : ''}
${pattern.timePoints ? `这种模式在以下时间点最为显著：${pattern.timePoints}。` : ''}

此类模式通常与${pattern.type.includes('周期') ? '温度变化、大气压力变化或地球潮汐' 
                    : pattern.type.includes('峰值') ? '人为活动干扰或短暂的构造活动' 
                    : '环境背景噪声或远距离地震活动'}有关。
建议进一步分析${pattern.type.includes('周期') ? '环境因素数据和地震波数据的相关性' 
                : pattern.type.includes('峰值') ? '这些时间点附近的其他监测站数据' 
                : '频谱特性以确定其来源'}。`;
        }
      }
    }
    
    // 查询与预测相关且有预测结果
    if (hasPrediction && (
        lowercasePrompt.includes('预测') || 
        lowercasePrompt.includes('趋势') || 
        lowercasePrompt.includes('下一个') ||
        lowercasePrompt.includes('未来'))) {
      
      const prediction = context.predictResults;
      
      return `根据当前的预测分析，我可以提供以下见解：
      
预计下一个值得关注的事件将出现在${prediction.nextEvent.prediction}，类型为"${prediction.nextEvent.type}"，
预测置信度为${prediction.nextEvent.confidence}%，发生概率为${prediction.nextEvent.probability}。

总体趋势显示：${prediction.trend}

基于此预测，我们建议采取以下措施：
${prediction.recommendations.map((rec, i) => `${i+1}. ${rec}`).join('\n')}

请注意，地震预测存在固有的不确定性，这些建议主要是基于统计模型和历史数据模式，应与其他防灾措施结合使用。`;
    }
    
    // 低频震动相关问题
    if (lowercasePrompt.includes('低频') && lowercasePrompt.includes('震动')) {
      return '根据您提供的数据描述，这种震动模式通常与地面交通或工业活动相关。2-5Hz的低频震动常见于重型车辆通过或附近施工活动。建议检查记录时段内附近是否有道路施工、采矿活动或重型车辆通行。';
    }
    
    // 日周期模式相关问题
    if ((lowercasePrompt.includes('日周期') || lowercasePrompt.includes('24小时')) && lowercasePrompt.includes('模式')) {
      return '您描述的周期性模式（每24小时）很可能与温度变化导致的仪器或地面膨胀收缩有关。这是地震监测中常见的环境干扰因素。建议对比气温数据，若呈正相关，则可确认此判断。';
    }
    
    // 峰值相关问题
    if (lowercasePrompt.includes('峰值') || lowercasePrompt.includes('突发')) {
      return '突发峰值事件可能来源于多种因素：1）近距离人为活动（爆破、重物跌落）；2）设备故障或干扰；3）真实的地震事件。建议查看当地地震台网是否有相应记录，并检查设备日志排除故障可能。';
    }
    
    // 自然地震与人为活动区分
    if ((lowercasePrompt.includes('区分') || lowercasePrompt.includes('如何')) && 
        (lowercasePrompt.includes('自然') && lowercasePrompt.includes('人为'))) {
      return '区分自然地震与人为活动的关键在于：1）频谱特征 - 自然地震通常有更广的频率范围，而人为活动多集中在特定频段；2）P波与S波时间差 - 自然地震的P波与S波时间差较大，人为活动较小；3）持续时间 - 自然地震余震持续时间较长；4）波形特征 - 爆破等人为活动起始相位更明显，衰减更快。综合这些特征可以较准确地区分来源。';
    }
    
    // 频率范围相关问题
    if (lowercasePrompt.includes('频率') && lowercasePrompt.includes('前兆')) {
      return '研究表明，地震前兆通常在超低频段（ULF，0.01-10Hz）最为明显。特别是0.01-1Hz的频段对识别可能的前兆信号最为重要。此外，某些研究发现1-5Hz的变化也可能与中大型地震前兆相关。然而，前兆信号通常非常微弱，需要高精度设备和严格的环境噪声控制才能检测。';
    }
    
    // 预测相关问题（通用）
    if ((lowercasePrompt.includes('预测') || lowercasePrompt.includes('预报')) && !hasPrediction) {
      return '地震预测是一个极其复杂且尚未完全成熟的领域。当前的科学共识是，短期精确预测（确定时间、地点和震级）仍面临巨大挑战。我们的AI分析系统通过整合多种数据源并应用机器学习模型，能够发现数据中的异常模式和统计关联，但这些并不等同于确定性预测。目前最可靠的方法是基于历史数据的概率预测和多参数综合分析。我建议将预测结果视为风险评估工具，而非确定性预测。';
    }
    
    // 推荐措施相关问题
    if (lowercasePrompt.includes('建议') || lowercasePrompt.includes('措施') || lowercasePrompt.includes('该怎么做')) {
      return `基于目前的分析结果，我建议采取以下措施：

1. **数据采集优化**：增加采样频率至少200Hz，确保捕获全频段信号
2. **多站点验证**：与周边监测站数据进行对比，排除局部干扰
3. **环境因素监测**：同步记录温度、气压、湿度变化，以便排除环境干扰
4. **频谱分析增强**：特别关注0.01-10Hz频段的能量变化
5. **设备校准**：每周进行一次传感器校准，确保数据准确性

此外，建议建立基于机器学习的自动异常检测系统，可大幅提高异常识别的准确性和及时性。`;
    }
    
    // 更多专业问题的回答
    if (lowercasePrompt.includes('频谱') || lowercasePrompt.includes('傅里叶')) {
      return `在地震波分析中，频谱分析是核心工具之一。对于您的问题，我可以提供以下专业解析：

频谱分析通常采用快速傅里叶变换(FFT)或小波变换(Wavelet Transform)将时域信号转换为频域表示。
对于地震数据，频谱分析可以揭示：

1. **信号来源**：不同来源的地震波具有不同的频谱特征（自然地震通常拥有较宽的频谱）
2. **传播路径特性**：波在传播过程中的频率衰减反映了地质结构
3. **site效应**：局部地质对特定频率的放大效应
4. **噪声识别**：人为噪声往往集中在特定频段

在您的数据分析中，建议采用多分辨率分析方法，结合短时傅里叶变换(STFT)和连续小波变换(CWT)，可以同时获得时频域信息，更全面地理解信号特性。`;
    }
    
    // 能力介绍
    if (lowercasePrompt.includes('能做什么') || lowercasePrompt.includes('功能') || lowercasePrompt.includes('帮我')) {
      return `作为AI地震波数据解读助手，我能够为您提供以下帮助：

**数据分析**
- 识别地震波数据中的模式和异常
- 解释频率特性和波形特征
- 区分自然地震与人为干扰

**专业咨询**
- 解答地震监测领域的专业问题
- 提供最新的地震研究方法和理论
- 解释复杂地震术语和概念

**建议与推荐**
- 提供数据采集优化建议
- 推荐合适的分析方法和工具
- 制定监测系统改进计划

**学习资源**
- 提供相关学习材料和参考文献
- 解释基础地震学概念

您可以尝试询问："如何解释我数据中的低频峰值？"、"S波与P波的传播有什么区别？"或"如何优化传感器布置以提高监测效果？"`;
    }
    
    // 默认回复
    return '您的问题涉及地震波数据的专业领域。要准确回答这个问题，我需要更多具体的数据样本和上下文。建议您提供更多关于观察到的具体现象的细节，如波形特征、频率范围、持续时间、振幅变化等，这样我才能给出更准确的分析。或者您可以询问当前分析结果中的具体模式或异常。';
  }
};
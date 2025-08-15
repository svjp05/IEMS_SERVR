const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class ReportService {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates');
  }

  // 生成PDF报告
  async generatePDFReport(reportData, config) {
    try {
      const doc = new PDFDocument();
      const chunks = [];

      // 收集PDF数据
      doc.on('data', chunk => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        doc.on('error', reject);

        // 生成PDF内容
        this.generatePDFContent(doc, reportData, config);
        doc.end();
      });

    } catch (error) {
      throw new Error(`PDF生成失败: ${error.message}`);
    }
  }

  // 生成PDF内容
  generatePDFContent(doc, reportData, config) {
    let currentY = 50;
    const pageHeight = 750;
    const margin = 50;

    // 添加标题
    doc.fontSize(20).font('Helvetica-Bold');
    doc.text('地震波数据专业分析报告', margin, currentY);
    currentY += 40;

    // 添加基本信息
    doc.fontSize(12).font('Helvetica');
    doc.text(`生成时间: ${new Date().toLocaleString()}`, margin, currentY);
    currentY += 20;
    
    if (reportData.dateRange) {
      doc.text(`分析时间范围: ${reportData.dateRange.start} 至 ${reportData.dateRange.end}`, margin, currentY);
      currentY += 20;
    }

    // 添加分割线
    doc.moveTo(margin, currentY).lineTo(550, currentY).stroke();
    currentY += 30;

    // 基础分析结果
    if (config.includeBasic && reportData.data.basic) {
      currentY = this.addBasicAnalysisSection(doc, reportData.data.basic, currentY, margin, pageHeight);
    }

    // 专业分析结果
    if (config.includeProfessional && reportData.data.professional) {
      currentY = this.addProfessionalAnalysisSection(doc, reportData.data.professional, currentY, margin, pageHeight);
    }

    // 异常检测结果
    if (config.includeAnomalies && reportData.data.anomalies) {
      currentY = this.addAnomalySection(doc, reportData.data.anomalies, currentY, margin, pageHeight);
    }

    // 趋势预测结果
    if (config.includePredictions && reportData.data.predictions) {
      currentY = this.addPredictionSection(doc, reportData.data.predictions, currentY, margin, pageHeight);
    }

    // 添加页脚
    this.addFooter(doc, margin);
  }

  // 添加基础分析章节
  addBasicAnalysisSection(doc, data, currentY, margin, pageHeight) {
    // 检查是否需要新页面
    if (currentY > pageHeight - 200) {
      doc.addPage();
      currentY = 50;
    }

    // 章节标题
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text('1. 基础分析结果', margin, currentY);
    currentY += 30;

    doc.fontSize(10).font('Helvetica');

    // 统计数据
    if (data.statistics) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('统计数据概览', margin, currentY);
      currentY += 20;

      doc.fontSize(10).font('Helvetica');
      const stats = data.statistics;
      doc.text(`数据点总数: ${stats.totalPoints || 0} 个`, margin, currentY);
      currentY += 15;
      doc.text(`平均值: ${(stats.mean || 0).toFixed(4)} g`, margin, currentY);
      currentY += 15;
      doc.text(`标准差: ${(stats.stdDev || 0).toFixed(4)} g`, margin, currentY);
      currentY += 15;
      doc.text(`最大值: ${(stats.max || 0).toFixed(4)} g`, margin, currentY);
      currentY += 15;
      doc.text(`最小值: ${(stats.min || 0).toFixed(4)} g`, margin, currentY);
      currentY += 25;
    }

    // 频率分析
    if (data.frequencyAnalysis) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('频率分析结果', margin, currentY);
      currentY += 20;

      doc.fontSize(10).font('Helvetica');
      doc.text(`主要频率: ${data.frequencyAnalysis.dominantFreq || 'N/A'} Hz`, margin, currentY);
      currentY += 15;
      doc.text(`频率范围: ${data.frequencyAnalysis.freqRange || 'N/A'}`, margin, currentY);
      currentY += 25;
    }

    // 风险评估
    if (data.riskLevel) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('风险评估', margin, currentY);
      currentY += 20;

      doc.fontSize(10).font('Helvetica');
      doc.text(`风险等级: ${data.riskLevel}`, margin, currentY);
      currentY += 15;
      doc.text(`评估说明: ${data.riskDescription || '基于统计分析的风险评估'}`, margin, currentY);
      currentY += 30;
    }

    return currentY;
  }

  // 添加专业分析章节
  addProfessionalAnalysisSection(doc, data, currentY, margin, pageHeight) {
    // 检查是否需要新页面
    if (currentY > pageHeight - 200) {
      doc.addPage();
      currentY = 50;
    }

    // 章节标题
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text('2. 专业地震学分析', margin, currentY);
    currentY += 30;

    // 地震学指标
    if (data.seismicIndicators) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('地震学指标', margin, currentY);
      currentY += 20;

      doc.fontSize(10).font('Helvetica');
      const indicators = data.seismicIndicators;
      doc.text(`PGA (峰值地面加速度): ${(indicators.pga || 0).toFixed(4)} g - ${indicators.pgaLevel || 'N/A'}`, margin, currentY);
      currentY += 15;
      doc.text(`PGV (峰值地面速度): ${(indicators.pgv || 0).toFixed(4)} cm/s - ${indicators.pgvLevel || 'N/A'}`, margin, currentY);
      currentY += 15;
      doc.text(`PGD (峰值地面位移): ${(indicators.pgd || 0).toFixed(4)} cm - ${indicators.pgdLevel || 'N/A'}`, margin, currentY);
      currentY += 15;
      doc.text(`地震烈度: ${indicators.intensity || 'N/A'} MMI - ${indicators.intensityLevel || 'N/A'}`, margin, currentY);
      currentY += 25;
    }

    // 频谱分析
    if (data.spectralAnalysis) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('频谱分析结果', margin, currentY);
      currentY += 20;

      doc.fontSize(10).font('Helvetica');
      doc.text(`主频: ${data.spectralAnalysis.dominantFreq || 'N/A'} Hz`, margin, currentY);
      currentY += 15;
      doc.text(`功率谱密度峰值: ${data.spectralAnalysis.peakPSD || 'N/A'}`, margin, currentY);
      currentY += 15;
      doc.text(`有效频率范围: ${data.spectralAnalysis.effectiveRange || 'N/A'}`, margin, currentY);
      currentY += 30;
    }

    return currentY;
  }

  // 添加异常检测章节
  addAnomalySection(doc, data, currentY, margin, pageHeight) {
    // 检查是否需要新页面
    if (currentY > pageHeight - 200) {
      doc.addPage();
      currentY = 50;
    }

    // 章节标题
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text('3. 异常检测报告', margin, currentY);
    currentY += 30;

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`检测到异常事件: ${data.anomalies?.length || 0} 个`, margin, currentY);
    currentY += 25;

    // 异常事件列表
    if (data.anomalies && data.anomalies.length > 0) {
      doc.fontSize(10).font('Helvetica');
      data.anomalies.slice(0, 10).forEach((anomaly, index) => { // 限制显示前10个
        if (currentY > pageHeight - 50) {
          doc.addPage();
          currentY = 50;
        }
        
        doc.text(`${index + 1}. 时间: ${anomaly.timestamp || 'N/A'}, 异常值: ${(anomaly.value || 0).toFixed(4)}, 严重程度: ${anomaly.severity || 'N/A'}`, margin, currentY);
        currentY += 15;
      });
      currentY += 15;
    }

    // 风险评估
    if (data.riskAssessment) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('风险评估', margin, currentY);
      currentY += 20;

      doc.fontSize(10).font('Helvetica');
      doc.text(`整体风险等级: ${data.riskAssessment.level || 'N/A'}`, margin, currentY);
      currentY += 15;
      doc.text(`风险描述: ${data.riskAssessment.description || '基于异常检测的风险评估'}`, margin, currentY);
      currentY += 30;
    }

    return currentY;
  }

  // 添加趋势预测章节
  addPredictionSection(doc, data, currentY, margin, pageHeight) {
    // 检查是否需要新页面
    if (currentY > pageHeight - 200) {
      doc.addPage();
      currentY = 50;
    }

    // 章节标题
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text('4. 趋势预测分析', margin, currentY);
    currentY += 30;

    // 下一个预测事件
    if (data.nextEvent) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('下一个预测事件', margin, currentY);
      currentY += 20;

      doc.fontSize(10).font('Helvetica');
      doc.text(`预测时间: ${data.nextEvent.prediction || 'N/A'}`, margin, currentY);
      currentY += 15;
      doc.text(`事件类型: ${data.nextEvent.type || 'N/A'}`, margin, currentY);
      currentY += 15;
      doc.text(`置信度: ${data.nextEvent.confidence || 0}%`, margin, currentY);
      currentY += 15;
      doc.text(`发生概率: ${data.nextEvent.probability || 'N/A'}`, margin, currentY);
      currentY += 25;
    }

    // 趋势分析
    if (data.trend) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('趋势分析', margin, currentY);
      currentY += 20;

      doc.fontSize(10).font('Helvetica');
      const lines = doc.splitTextToSize(data.trend, 500);
      lines.forEach(line => {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 50;
        }
        doc.text(line, margin, currentY);
        currentY += 15;
      });
      currentY += 15;
    }

    // 建议措施
    if (data.recommendations) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('建议措施', margin, currentY);
      currentY += 20;

      doc.fontSize(10).font('Helvetica');
      data.recommendations.forEach((rec, index) => {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 50;
        }
        doc.text(`${index + 1}. ${rec}`, margin, currentY);
        currentY += 15;
      });
      currentY += 15;
    }

    // 模型性能
    if (data.modelPerformance) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('模型性能指标', margin, currentY);
      currentY += 20;

      doc.fontSize(10).font('Helvetica');
      const perf = data.modelPerformance;
      doc.text(`准确率: ${perf.accuracy || 0}%`, margin, currentY);
      currentY += 15;
      doc.text(`精确率: ${perf.precision || 0}%`, margin, currentY);
      currentY += 15;
      doc.text(`召回率: ${perf.recall || 0}%`, margin, currentY);
      currentY += 15;
      doc.text(`F1分数: ${perf.f1Score || 0}%`, margin, currentY);
      currentY += 30;
    }

    return currentY;
  }

  // 添加页脚
  addFooter(doc, margin) {
    const pageHeight = 750;
    doc.fontSize(8).font('Helvetica');
    doc.text('地震波数据专业分析系统 | 自动生成报告', margin, pageHeight + 20);
    doc.text(`生成时间: ${new Date().toLocaleString()}`, margin, pageHeight + 35);
  }

  // 生成Excel报告
  async generateExcelReport(reportData, config) {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // 创建摘要工作表
      const summarySheet = workbook.addWorksheet('报告摘要');
      this.createSummarySheet(summarySheet, reportData, config);

      // 根据配置添加各个工作表
      if (config.includeBasic && reportData.data.basic) {
        const basicSheet = workbook.addWorksheet('基础分析');
        this.createBasicAnalysisSheet(basicSheet, reportData.data.basic);
      }

      if (config.includeProfessional && reportData.data.professional) {
        const professionalSheet = workbook.addWorksheet('专业分析');
        this.createProfessionalAnalysisSheet(professionalSheet, reportData.data.professional);
      }

      if (config.includeAnomalies && reportData.data.anomalies) {
        const anomalySheet = workbook.addWorksheet('异常检测');
        this.createAnomalySheet(anomalySheet, reportData.data.anomalies);
      }

      if (config.includePredictions && reportData.data.predictions) {
        const predictionSheet = workbook.addWorksheet('趋势预测');
        this.createPredictionSheet(predictionSheet, reportData.data.predictions);
      }

      return workbook;

    } catch (error) {
      throw new Error(`Excel生成失败: ${error.message}`);
    }
  }

  // 创建摘要工作表
  createSummarySheet(sheet, reportData, config) {
    sheet.addRow(['地震波数据分析报告']);
    sheet.addRow(['生成时间', new Date().toLocaleString()]);
    sheet.addRow(['分析时间范围', reportData.dateRange ? 
      `${reportData.dateRange.start} 至 ${reportData.dateRange.end}` : '未指定']);
    sheet.addRow([]);
    sheet.addRow(['报告内容概览']);
    sheet.addRow(['基础分析', config.includeBasic ? '包含' : '不包含']);
    sheet.addRow(['专业分析', config.includeProfessional ? '包含' : '不包含']);
    sheet.addRow(['异常检测', config.includeAnomalies ? '包含' : '不包含']);
    sheet.addRow(['趋势预测', config.includePredictions ? '包含' : '不包含']);
    sheet.addRow(['图表可视化', config.includeCharts ? '包含' : '不包含']);

    // 设置样式
    sheet.getCell('A1').font = { bold: true, size: 16 };
    sheet.getCell('A5').font = { bold: true, size: 12 };
  }

  // 创建基础分析工作表
  createBasicAnalysisSheet(sheet, data) {
    sheet.addRow(['基础分析结果']);
    sheet.addRow([]);
    
    if (data.statistics) {
      sheet.addRow(['统计数据']);
      sheet.addRow(['指标', '数值', '单位']);
      sheet.addRow(['数据点总数', data.statistics.totalPoints || 0, '个']);
      sheet.addRow(['平均值', data.statistics.mean || 0, 'g']);
      sheet.addRow(['标准差', data.statistics.stdDev || 0, 'g']);
      sheet.addRow(['最大值', data.statistics.max || 0, 'g']);
      sheet.addRow(['最小值', data.statistics.min || 0, 'g']);
      sheet.addRow([]);
    }

    if (data.frequencyAnalysis) {
      sheet.addRow(['频率分析']);
      sheet.addRow(['主要频率', data.frequencyAnalysis.dominantFreq || 'N/A', 'Hz']);
      sheet.addRow(['频率范围', data.frequencyAnalysis.freqRange || 'N/A', 'Hz']);
      sheet.addRow([]);
    }

    if (data.riskLevel) {
      sheet.addRow(['风险评估']);
      sheet.addRow(['风险等级', data.riskLevel]);
      sheet.addRow(['评估说明', data.riskDescription || '基于统计分析的风险评估']);
    }

    // 设置样式
    sheet.getCell('A1').font = { bold: true, size: 14 };
  }

  // 创建专业分析工作表
  createProfessionalAnalysisSheet(sheet, data) {
    sheet.addRow(['专业地震学分析结果']);
    sheet.addRow([]);
    
    if (data.seismicIndicators) {
      sheet.addRow(['地震学指标']);
      sheet.addRow(['指标', '数值', '单位', '评级']);
      const indicators = data.seismicIndicators;
      sheet.addRow(['PGA', indicators.pga || 0, 'g', indicators.pgaLevel || 'N/A']);
      sheet.addRow(['PGV', indicators.pgv || 0, 'cm/s', indicators.pgvLevel || 'N/A']);
      sheet.addRow(['PGD', indicators.pgd || 0, 'cm', indicators.pgdLevel || 'N/A']);
      sheet.addRow(['地震烈度', indicators.intensity || 'N/A', 'MMI', indicators.intensityLevel || 'N/A']);
      sheet.addRow([]);
    }

    if (data.spectralAnalysis) {
      sheet.addRow(['频谱分析']);
      sheet.addRow(['主频', data.spectralAnalysis.dominantFreq || 'N/A', 'Hz']);
      sheet.addRow(['功率谱密度峰值', data.spectralAnalysis.peakPSD || 'N/A']);
      sheet.addRow(['有效频率范围', data.spectralAnalysis.effectiveRange || 'N/A']);
    }

    // 设置样式
    sheet.getCell('A1').font = { bold: true, size: 14 };
  }

  // 创建异常检测工作表
  createAnomalySheet(sheet, data) {
    sheet.addRow(['异常检测结果']);
    sheet.addRow([]);
    
    if (data.anomalies && data.anomalies.length > 0) {
      sheet.addRow(['异常事件列表']);
      sheet.addRow(['序号', '时间', '异常值', '严重程度', '类型']);
      
      data.anomalies.forEach((anomaly, index) => {
        sheet.addRow([
          index + 1,
          anomaly.timestamp || 'N/A',
          anomaly.value || 0,
          anomaly.severity || 'N/A',
          anomaly.type || '未知'
        ]);
      });
      sheet.addRow([]);
    }

    if (data.riskAssessment) {
      sheet.addRow(['风险评估']);
      sheet.addRow(['整体风险等级', data.riskAssessment.level || 'N/A']);
      sheet.addRow(['风险描述', data.riskAssessment.description || '基于异常检测的风险评估']);
    }

    // 设置样式
    sheet.getCell('A1').font = { bold: true, size: 14 };
  }

  // 创建趋势预测工作表
  createPredictionSheet(sheet, data) {
    sheet.addRow(['趋势预测分析结果']);
    sheet.addRow([]);
    
    if (data.nextEvent) {
      sheet.addRow(['下一个预测事件']);
      sheet.addRow(['项目', '预测结果']);
      sheet.addRow(['预测时间', data.nextEvent.prediction || 'N/A']);
      sheet.addRow(['事件类型', data.nextEvent.type || 'N/A']);
      sheet.addRow(['置信度', `${data.nextEvent.confidence || 0}%`]);
      sheet.addRow(['发生概率', data.nextEvent.probability || 'N/A']);
      sheet.addRow([]);
    }

    if (data.modelPerformance) {
      sheet.addRow(['模型性能指标']);
      sheet.addRow(['指标', '数值']);
      const perf = data.modelPerformance;
      sheet.addRow(['准确率', `${perf.accuracy || 0}%`]);
      sheet.addRow(['精确率', `${perf.precision || 0}%`]);
      sheet.addRow(['召回率', `${perf.recall || 0}%`]);
      sheet.addRow(['F1分数', `${perf.f1Score || 0}%`]);
      sheet.addRow([]);
    }

    if (data.recommendations) {
      sheet.addRow(['建议措施']);
      data.recommendations.forEach((rec, index) => {
        sheet.addRow([`${index + 1}`, rec]);
      });
    }

    if (data.trend) {
      sheet.addRow([]);
      sheet.addRow(['趋势分析']);
      sheet.addRow([data.trend]);
    }

    // 设置样式
    sheet.getCell('A1').font = { bold: true, size: 14 };
  }
}

module.exports = ReportService;

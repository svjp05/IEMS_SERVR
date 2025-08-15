const express = require('express');
const router = express.Router();
const ReportService = require('../services/reportService');
const path = require('path');
const fs = require('fs').promises;

const reportService = new ReportService();

// 生成PDF报告
router.post('/pdf', async (req, res) => {
  try {
    const { reportData, config } = req.body;
    
    if (!reportData) {
      return res.status(400).json({
        success: false,
        message: '缺少报告数据'
      });
    }

    // 生成PDF
    const pdfBuffer = await reportService.generatePDFReport(reportData, config);
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="地震分析报告_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // 发送PDF文件
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF生成错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '生成PDF报告失败', 
      error: error.message 
    });
  }
});

// 生成Excel报告
router.post('/excel', async (req, res) => {
  try {
    const { reportData, config } = req.body;
    
    if (!reportData) {
      return res.status(400).json({
        success: false,
        message: '缺少报告数据'
      });
    }

    // 生成Excel
    const workbook = await reportService.generateExcelReport(reportData, config);
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="地震数据分析_${new Date().toISOString().split('T')[0]}.xlsx"`);
    
    // 发送Excel文件
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Excel生成错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '生成Excel报告失败', 
      error: error.message 
    });
  }
});

// 获取报告模板
router.get('/template/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const templatePath = path.join(__dirname, '../templates', `${type}Template.html`);
    
    const templateContent = await fs.readFile(templatePath, 'utf8');
    
    res.json({
      success: true,
      template: templateContent
    });

  } catch (error) {
    console.error('获取模板错误:', error);
    res.status(500).json({
      success: false,
      message: '获取报告模板失败',
      error: error.message
    });
  }
});

// 预览报告
router.post('/preview', async (req, res) => {
  try {
    const { reportData, config } = req.body;
    
    if (!reportData) {
      return res.status(400).json({
        success: false,
        message: '缺少报告数据'
      });
    }

    // 生成报告预览数据
    const preview = {
      title: '地震波数据专业分析报告',
      generatedTime: new Date().toLocaleString(),
      dateRange: reportData.dateRange,
      sections: [],
      dataAvailability: {
        basic: !!reportData.data.basic,
        professional: !!reportData.data.professional,
        anomalies: !!reportData.data.anomalies,
        predictions: !!reportData.data.predictions
      }
    };

    // 根据配置添加章节
    if (config.includeBasic && reportData.data.basic) {
      preview.sections.push({
        title: '基础分析结果',
        type: 'basic',
        content: '包含频率、幅度、风险分析及统计数据'
      });
    }

    if (config.includeProfessional && reportData.data.professional) {
      preview.sections.push({
        title: '专业地震学分析',
        type: 'professional',
        content: '包含PGA/PGV/PGD指标、地震烈度评估、频谱分析'
      });
    }

    if (config.includeAnomalies && reportData.data.anomalies) {
      preview.sections.push({
        title: '异常检测报告',
        type: 'anomalies',
        content: '异常事件识别、风险评估和处理建议'
      });
    }

    if (config.includePredictions && reportData.data.predictions) {
      preview.sections.push({
        title: '趋势预测分析',
        type: 'predictions',
        content: '多模型预测结果和可信度评估'
      });
    }

    res.json({
      success: true,
      preview: preview
    });

  } catch (error) {
    console.error('预览生成错误:', error);
    res.status(500).json({
      success: false,
      message: '生成报告预览失败',
      error: error.message
    });
  }
});

// 获取报告配置选项
router.get('/config', (req, res) => {
  try {
    const config = {
      formats: [
        { value: 'professional', label: '专业版', description: '包含完整的技术分析和专业术语' },
        { value: 'summary', label: '摘要版', description: '简化版本，突出关键结果' },
        { value: 'detailed', label: '详细版', description: '包含所有分析细节和原始数据' }
      ],
      sections: [
        { key: 'includeBasic', label: '基础分析结果', description: '频率、幅度、风险分析及统计数据' },
        { key: 'includeProfessional', label: '专业地震学分析', description: 'PGA/PGV/PGD指标、地震烈度评估、频谱分析' },
        { key: 'includeSeismic', label: '地震学指标详解', description: '专业地震学参数解释和标准对比' },
        { key: 'includeAnomalies', label: '异常检测报告', description: '异常事件识别、风险评估和处理建议' },
        { key: 'includePredictions', label: '趋势预测分析', description: '多模型预测结果和可信度评估' },
        { key: 'includeCharts', label: '图表和可视化', description: '分析图表、波形图、统计图表' },
        { key: 'includeRawData', label: '原始数据附录', description: '分析期间的原始数据记录' }
      ],
      outputFormats: [
        { value: 'pdf', label: 'PDF报告', icon: 'FilePdfOutlined', description: '适合打印和正式文档' },
        { value: 'excel', label: 'Excel表格', icon: 'FileExcelOutlined', description: '适合数据分析和进一步处理' },
        { value: 'html', label: 'HTML网页', icon: 'FileTextOutlined', description: '适合在线查看和分享' }
      ]
    };

    res.json({
      success: true,
      config: config
    });

  } catch (error) {
    console.error('获取配置错误:', error);
    res.status(500).json({
      success: false,
      message: '获取报告配置失败',
      error: error.message
    });
  }
});

// 验证报告数据
router.post('/validate', (req, res) => {
  try {
    const { reportData, config } = req.body;
    
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      dataAvailability: {}
    };

    // 检查基本数据
    if (!reportData) {
      validation.isValid = false;
      validation.errors.push('缺少报告数据');
      return res.json({ success: true, validation });
    }

    // 检查日期范围
    if (!reportData.dateRange) {
      validation.warnings.push('未设置分析时间范围');
    }

    // 检查各模块数据可用性
    validation.dataAvailability = {
      basic: !!reportData.data?.basic,
      professional: !!reportData.data?.professional,
      anomalies: !!reportData.data?.anomalies,
      predictions: !!reportData.data?.predictions
    };

    // 检查配置与数据的匹配性
    if (config.includeBasic && !validation.dataAvailability.basic) {
      validation.warnings.push('已选择包含基础分析，但缺少基础分析数据');
    }

    if (config.includeProfessional && !validation.dataAvailability.professional) {
      validation.warnings.push('已选择包含专业分析，但缺少专业分析数据');
    }

    if (config.includeAnomalies && !validation.dataAvailability.anomalies) {
      validation.warnings.push('已选择包含异常检测，但缺少异常检测数据');
    }

    if (config.includePredictions && !validation.dataAvailability.predictions) {
      validation.warnings.push('已选择包含趋势预测，但缺少预测数据');
    }

    // 检查是否有任何可用数据
    const hasAnyData = Object.values(validation.dataAvailability).some(Boolean);
    if (!hasAnyData) {
      validation.isValid = false;
      validation.errors.push('没有可用的分析数据，请先执行相关分析');
    }

    res.json({
      success: true,
      validation: validation
    });

  } catch (error) {
    console.error('验证错误:', error);
    res.status(500).json({
      success: false,
      message: '验证报告数据失败',
      error: error.message
    });
  }
});

module.exports = router;

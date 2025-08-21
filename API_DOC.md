## AI分析接口

### 获取模式分析
```
GET /patterns
```
**描述**：分析地震波数据中的模式，包括周期性模式、峰值模式和频率分布

**查询参数**
| 参数名称 | 类型 | 必填 | 描述 |
|----------|------|------|-----|
| startDate | string | 是 | 开始日期 (格式: YYYY-MM-DD) |
| endDate | string | 是 | 结束日期 (格式: YYYY-MM-DD) |
| analysisType | string | 否 | 分析类型 (comprehensive, pattern, peak, frequency) |

**请求示例**：
```bash
curl -X GET \
  'http://localhost:3000/api/patterns?startDate=2024-01-01&endDate=2024-01-31&analysisType=comprehensive'
```

**成功响应示例**：
```json
{
  "status": 200,
  "data": {
    "patterns": [
      {
        "id": 1,
        "type": "周期性波动",
        "confidence": 92,
        "description": "每24小时出现一次的强度变化",
        "timeRange": "全天"
      },
      {
        "id": 2,
        "type": "突发峰值",
        "confidence": 87,
        "description": "在数据中检测到3次明显的峰值",
        "timePoints": "01/05 14:30, 01/12 09:15, 01/20 22:45"
      }
    ],
    "anomalies": [
      {
        "id": 1,
        "timestamp": "2024-01-15T16:30:00Z",
        "amplitude": 12.5,
        "probability": 95,
        "description": "异常高振幅信号"
      }
    ],
    "summary": "分析期间检测到2种模式，包括周期性模式表现为每24小时一次的强度变化，可能与温度日变化相关。另外检测到1次异常事件，其中2024-01-15T16:30:00Z的异常幅度最大，值得重点关注。"
  }
}
```

**错误响应示例**（缺少日期参数）：
```json
{
  "message": "请提供开始和结束日期",
  "status": 400
}
```

**错误响应示例**（无效日期格式）：
```json
{
  "message": "无效的日期格式",
  "status": 400
}
```

**错误响应示例**（无数据）：
```json
{
  "message": "在指定时间范围内未找到数据",
  "status": 404
}
```

### 获取异常检测
```
GET /anomalies
```
**描述**：检测地震波数据中的异常事件

**查询参数**
| 参数名称 | 类型 | 必填 | 描述 |
|----------|------|------|-----|
| startDate | string | 是 | 开始日期 (格式: YYYY-MM-DD) |
| endDate | string | 是 | 结束日期 (格式: YYYY-MM-DD) |

**请求示例**：
```bash
curl -X GET \
  'http://localhost:3000/api/anomalies?startDate=2024-01-01&endDate=2024-01-31'
```

**成功响应示例**：
```json
{
  "status": 200,
  "data": {
    "anomalies": [
      {
        "id": 1,
        "timestamp": "2024-01-15T16:30:00Z",
        "amplitude": 12.5,
        "probability": 95,
        "description": "异常高振幅信号"
      },
      {
        "id": 2,
        "timestamp": "2024-01-22T03:15:00Z",
        "amplitude": 8.3,
        "probability": 88,
        "description": "突发频率变化"
      }
    ],
    "summary": "分析期间检测到2个异常事件。其中，最严重的异常出现在2024-01-15T16:30:00Z，表现为异常高振幅信号，可信度为95%。"
  }
}
```

**错误响应示例**：
```json
{
  "message": "请提供开始和结束日期",
  "status": 400
}
```

### 获取趋势预测
```
GET /prediction
```
**描述**：基于历史数据预测未来地震波趋势

**查询参数**
| 参数名称 | 类型 | 必填 | 描述 |
|----------|------|------|-----|
| trainingStartDate | string | 是 | 训练数据开始日期 (格式: YYYY-MM-DD) |
| trainingEndDate | string | 是 | 训练数据结束日期 (格式: YYYY-MM-DD) |
| predictionDuration | number | 否 | 预测时长(小时)，默认72小时 |

**请求示例**：
```bash
curl -X GET \
  'http://localhost:3000/api/prediction?trainingStartDate=2024-01-01&trainingEndDate=2024-01-31&predictionDuration=72'
```

**成功响应示例**：
```json
{
  "status": 200,
  "data": {
    "prediction": {
      "startTime": "2024-02-01T00:00:00Z",
      "endTime": "2024-02-04T00:00:00Z",
      "confidence": 85,
      "trendType": "stable_with_peaks",
      "description": "预测期间整体较为稳定，预计在2月2日和2月3日各有一次小幅度峰值",
      "peakPredictions": [
        {
          "timestamp": "2024-02-02T14:00:00Z",
          "expectedAmplitude": 7.2,
          "probability": 80
        },
        {
          "timestamp": "2024-02-03T09:30:00Z",
          "expectedAmplitude": 6.8,
          "probability": 75
        }
      ],
      "riskLevel": "low"
    }
  }
}
```

**错误响应示例**：
```json
{
  "message": "请提供训练数据的开始和结束日期",
  "status": 400
}
```

### AI问答
```
POST /query
```
**描述**：针对地震波数据进行AI问答

**请求体参数**
| 参数名称 | 类型 | 必填 | 描述 |
|----------|------|------|-----|
| prompt | string | 是 | 查询内容 |
| context | object | 否 | 上下文数据 |

**请求示例**：
```bash
curl -X POST \
  'http://localhost:3000/api/query' \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "解释我数据中的低频峰值",
    "context": {
      "analysisResults": {
        "patterns": [
          {
            "id": 1,
            "type": "周期性波动",
            "confidence": 92,
            "description": "每24小时出现一次的强度变化"
          }
        ]
      }
    }
  }'
```

**成功响应示例**：
```json
{
  "status": 200,
  "data": "低频峰值通常与地质构造活动或大型机械振动有关。在您的数据中，检测到每24小时出现一次的周期性波动，这可能是由温度变化引起的地表运动，也可能是附近工业活动的影响。建议进一步分析峰值出现的具体时间与环境因素的关系，以确定确切原因。"
}
```

**错误响应示例**：
```json
{
  "message": "查询内容不能为空",
  "status": 400
}
```

## 系统接口

### 缓存管理

#### 获取缓存统计信息
```
GET /cache/stats
```
**描述**：获取缓存系统的统计信息，包括缓存大小、命中率等

**参数说明**：无

**成功响应示例**：
```json
{
  "status": 200,
  "data": {
    "cache": {
      "size": 128,
      "hits": 5432,
      "misses": 1234,
      "hitRate": 81.5
    },
    "timestamp": "2024-03-21T10:15:30Z",
    "uptime": 3600,
    "memory": {
      "rss": 128,
      "heapTotal": 64,
      "heapUsed": 48
    }
  }
}
```

**错误响应示例**：
```json
{
  "message": "获取缓存统计失败",
  "status": 500,
  "details": "缓存服务未响应"
}
```

#### 清理缓存
```
POST /cache/clear
```
**描述**：清理指定类型的缓存

**请求体参数**
| 参数名称 | 类型 | 必填 | 默认值 | 描述 |
|----------|------|------|--------|-----|
| type | string | 否 | all | 缓存类型 (all, analysis, data) |

**请求示例**：
```bash
curl -X POST \
  'http://localhost:3000/api/cache/clear' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "analysis"
  }'
```

**成功响应示例**：
```json
{
  "status": 201,
  "data": {
    "message": "analysis缓存已清理",
    "timestamp": "2024-03-21T10:15:30Z"
  }
}
```

**错误响应示例**（无效缓存类型）：
```json
{
  "message": "无效的缓存类型",
  "status": 400,
  "details": "支持的缓存类型: all, analysis, data"
}
```

#### 预热缓存
```
POST /cache/warmup
```
**描述**：预热指定类型的缓存

**请求体参数**
| 参数名称 | 类型 | 必填 | 默认值 | 描述 |
|----------|------|------|--------|-----|
| type | string | 否 | basic | 预热类型 (basic, professional, all) |

**请求示例**：
```bash
curl -X POST \
  'http://localhost:3000/api/cache/warmup' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "all"
  }'
```

**成功响应示例**：
```json
{
  "status": 201,
  "data": {
    "message": "缓存预热完成",
    "warmedCount": 10,
    "type": "all",
    "timestamp": "2024-03-21T10:15:30Z"
  }
}
```

**错误响应示例**：
```json
{
  "message": "缓存预热失败",
  "status": 500,
  "details": "预热过程中发生错误"
}
```

### 系统监控

#### 系统性能监控
```
GET /system/stats
```
**描述**：获取系统性能统计信息，包括内存使用、CPU负载等

**参数说明**：无

**成功响应示例**：
```json
{
  "status": 200,
  "data": {
    "system": {
      "uptime": 3600,
      "platform": "win32",
      "arch": "x64",
      "nodeVersion": "v16.14.0",
      "pid": 12345
    },
    "memory": {
      "rss": 128,
      "heapTotal": 64,
      "heapUsed": 48,
      "external": 16,
      "arrayBuffers": 8
    },
    "cpu": {
      "user": 123456,
      "system": 65432
    },
    "cache": {
      "size": 128,
      "hits": 5432,
      "misses": 1234
    },
    "timestamp": "2024-03-21T10:15:30Z"
  }
}
```

**错误响应示例**：
```json
{
  "message": "获取系统统计失败",
  "status": 500,
  "details": "无法获取系统性能数据"
}
```

##### 健康检查
```
GET /health
```
**描述**：检查系统是否正常运行

**参数说明**：无

**成功响应示例**：
```json
{
  "status": 200,
  "data": {
    "status": "healthy",
    "checks": {
      "memory": {
        "status": "healthy",
        "heapUsedPercent": 75,
        "message": "内存使用正常"
      },
      "cache": {
        "status": "healthy",
        "size": 128,
        "message": "缓存运行正常"
      },
      "uptime": {
        "status": "healthy",
        "uptime": 3600,
        "message": "系统运行时间: 3600秒"
      }
    },
    "timestamp": "2024-03-21T10:15:30Z"
  }
}
```

**错误响应示例**：
```json
{
  "message": "健康检查失败",
  "status": 503,
  "details": "服务器正在维护中"
}
```

## 报告服务接口

### 生成PDF报告
```
POST /reports/pdf
```
**描述**：生成地震分析报告的PDF版本

**请求体参数**
| 参数名称 | 类型 | 必填 | 描述 |
|----------|------|------|-----|
| reportData | object | 是 | 报告数据 |
| config | object | 否 | 报告配置选项 |

**请求示例**：
```bash
curl -X POST \
  'http://localhost:3000/api/reports/pdf' \
  -H 'Content-Type: application/json' \
  -d '{
    "reportData": {"dateRange": "2024-01-01 to 2024-03-31", "data": {"basic": {...}}},
    "config": {"format": "professional", "includeCharts": true}
  }'
```

**成功响应示例**：
```
# PDF文件下载响应
Content-Type: application/pdf
Content-Disposition: attachment; filename="地震分析报告_2024-03-21.pdf"

[PDF文件二进制数据]
```

**错误响应示例**（缺少报告数据）：
```json
{
  "message": "缺少报告数据",
  "status": 400,
  "details": "请求体中未提供reportData参数"
}
```

**错误响应示例**（生成失败）：
```json
{
  "message": "生成PDF报告失败",
  "status": 500,
  "details": "PDF生成服务错误: 无法渲染报告模板"
}
```

### 生成Excel报告
```
POST /reports/excel
```
**描述**：生成地震分析报告的Excel版本

**请求体参数**
| 参数名称 | 类型 | 必填 | 描述 |
|----------|------|------|-----|
| reportData | object | 是 | 报告数据 |
| config | object | 否 | 报告配置选项 |

**请求示例**：
```bash
curl -X POST \
  'http://localhost:3000/api/reports/excel' \
  -H 'Content-Type: application/json' \
  -d '{
    "reportData": {"dateRange": "2024-01-01 to 2024-03-31", "data": {"basic": {...}}},
    "config": {"format": "detailed", "includeRawData": true}
  }'
```

**成功响应示例**：
```
# Excel文件下载响应
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="地震数据分析_2024-03-21.xlsx"

[Excel文件二进制数据]
```

**错误响应示例**（缺少报告数据）：
```json
{
  "message": "缺少报告数据",
  "status": 400,
  "details": "请求体中未提供reportData参数"
}
```

**错误响应示例**（生成失败）：
```json
{
  "message": "生成Excel报告失败",
  "status": 500,
  "details": "Excel生成服务错误: 无法创建工作表"
}
```

### 获取报告模板
```
GET /reports/template/:type
```
**描述**：获取指定类型的报告模板

**路径参数**
| 参数名称 | 类型 | 必填 | 描述 |
|----------|------|------|-----|
| type | string | 是 | 模板类型 |

**成功响应示例**：
```json
{
  "status": 200,
  "data": {
    "template": "<html>...</html>"
  }
}
```

**错误响应示例**：
```json
{
  "message": "获取报告模板失败",
  "status": 500,
  "details": "无法读取模板文件: templatePath.html"
}
```

### 预览报告
```
POST /reports/preview
```
**描述**：生成报告预览

**请求体参数**
| 参数名称 | 类型 | 必填 | 描述 |
|----------|------|------|-----|
| reportData | object | 是 | 报告数据 |
| config | object | 否 | 预览配置选项 |

**请求示例**：
```bash
curl -X POST \
  'http://localhost:3000/api/reports/preview' \
  -H 'Content-Type: application/json' \
  -d '{
    "reportData": {"dateRange": "2024-01-01 to 2024-03-31", "data": {"basic": {...}}},
    "config": {"includeBasic": true, "includeCharts": false}
  }'
```

**成功响应示例**：
```json
{
  "status": 200,
  "data": {
    "preview": {
      "title": "地震波数据专业分析报告",
      "generatedTime": "2024-03-21 10:15:30",
      "dateRange": "2024-01-01 to 2024-03-31",
      "sections": [
        {
          "title": "基础分析结果",
          "type": "basic",
          "content": "包含频率、幅度、风险分析及统计数据"
        }
      ],
      "dataAvailability": {
        "basic": true,
        "professional": false,
        "anomalies": false,
        "predictions": false
      }
    }
  }
}
```

**错误响应示例**（缺少报告数据）：
```json
{
  "message": "缺少报告数据",
  "status": 400,
  "details": "请求体中未提供reportData参数"
}
```

**错误响应示例**（生成失败）：
```json
{
  "message": "生成报告预览失败",
  "status": 500,
  "details": "预览生成服务错误: 无法处理配置选项"
}
```

### 获取报告配置选项
```
GET /reports/config
```
**描述**：获取报告生成的配置选项

**参数说明**：无

**成功响应示例**：
```json
{
  "status": 200,
  "data": {
    "formats": [
      {
        "value": "professional",
        "label": "专业版",
        "description": "包含完整的技术分析和专业术语"
      },
      {
        "value": "summary",
        "label": "摘要版",
        "description": "简化版本，突出关键结果"
      },
      {
        "value": "detailed",
        "label": "详细版",
        "description": "包含所有分析细节和原始数据"
      }
    ],
    "sections": [
      {
        "key": "includeBasic",
        "label": "基础分析结果",
        "description": "频率、幅度、风险分析及统计数据"
      },
      {
        "key": "includeProfessional",
        "label": "专业地震学分析",
        "description": "PGA/PGV/PGD指标、地震烈度评估、频谱分析"
      },
      {
        "key": "includeSeismic",
        "label": "地震学指标详解",
        "description": "专业地震学参数解释和标准对比"
      },
      {
        "key": "includeAnomalies",
        "label": "异常检测报告",
        "description": "异常事件识别、风险评估和处理建议"
      },
      {
        "key": "includePredictions",
        "label": "趋势预测分析",
        "description": "多模型预测结果和可信度评估"
      },
      {
        "key": "includeCharts",
        "label": "图表和可视化",
        "description": "分析图表、波形图、统计图表"
      },
      {
        "key": "includeRawData",
        "label": "原始数据附录",
        "description": "分析期间的原始数据记录"
      }
    ],
    "outputFormats": [
      {
        "value": "pdf",
        "label": "PDF报告",
        "icon": "FilePdfOutlined",
        "description": "适合打印和正式文档"
      },
      {
        "value": "excel",
        "label": "Excel表格",
        "icon": "FileExcelOutlined",
        "description": "适合数据分析和进一步处理"
      },
      {
        "value": "html",
        "label": "HTML网页",
        "icon": "FileTextOutlined",
        "description": "适合在线查看和分享"
      }
    ]
  }
}
```

**错误响应示例**：
```json
{
  "message": "获取报告配置失败",
  "status": 500,
  "details": "无法加载配置选项"
}
```

### 验证报告数据
```
POST /reports/validate
```
**描述**：验证报告数据的完整性和有效性

**请求体参数**
| 参数名称 | 类型 | 必填 | 描述 |
|----------|------|------|-----|
| reportData | object | 是 | 报告数据 |
| config | object | 否 | 报告配置选项 |

**请求示例**：
```bash
curl -X POST \
  'http://localhost:3000/api/reports/validate' \
  -H 'Content-Type: application/json' \
  -d '{
    "reportData": {"dateRange": "2024-01-01 to 2024-03-31", "data": {"basic": {...}}},
    "config": {"includeBasic": true, "includeProfessional": true}
  }'
```

**成功响应示例**：
```json
{
  "status": 200,
  "data": {
    "validation": {
      "isValid": true,
      "errors": [],
      "warnings": [
        "已选择包含专业分析，但缺少专业分析数据"
      ],
      "dataAvailability": {
        "basic": true,
        "professional": false,
        "anomalies": false,
        "predictions": false
      }
    }
  }
}
```

**错误响应示例**（缺少报告数据）：
```json
{
  "status": 200,
  "data": {
    "validation": {
      "isValid": false,
      "errors": ["缺少报告数据"],
      "warnings": [],
      "dataAvailability": {}
    }
  }
}
```

**错误响应示例**（验证失败）：
```json
{
  "message": "验证报告数据失败",
  "status": 500,
  "details": "验证服务错误: 无法处理数据格式"
}
```

## 地震数据接口

### 历史地震数据

#### 获取历史地震数据
```
GET /earthquake-data/historical
```
**描述**：获取指定日期范围内的历史地震数据

**查询参数**
| 参数名称 | 类型 | 必填 | 默认值 | 描述 |
|----------|------|------|--------|-----|
| startDate | string | 是 | 无 | 开始日期（ISO8601格式） |
| endDate | string | 是 | 无 | 结束日期（ISO8601格式） |
| limit | number | 否 | 无 | 限制返回记录数 |
| waveformType | string | 否 | 无 | 波形类型（X、Y、Z） |

**请求示例**：
```bash
curl -X GET \
  'http://localhost:3000/earthquake-data/historical?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&limit=100'
```

**成功响应示例**：
```json
{
  "status": 200,
  "data": [
    {
      "id": "eq123456",
      "timestamp": "2024-01-15T10:30:45Z",
      "amplitude": 4.5,
      "waveformType": "X",
      "location": {
        "latitude": 34.0522,
        "longitude": -118.2437
      },
      "metadata": {}
    },
  ]
}
```

**错误响应示例**（缺少日期参数）：
```json
{
  "message": "开始日期和结束日期是必需的参数",
  "status": 400,
  "details": "请求缺少startDate或endDate参数"
}
```

**错误响应示例**（无效日期格式）：
```json
{
  "message": "提供的日期格式无效",
  "status": 400,
  "details": "startDate: 2024-01-01, endDate: 2024-01-31 不是有效的ISO8601格式"
}
```
#### 获取特定波形类型的历史数据
```
GET /earthquake-data/historical/:waveformType
```
**描述**：获取指定波形类型的历史地震数据

**路径参数**
| 参数名称 | 类型 | 必填 | 描述 |
|----------|------|------|-----|
| waveformType | string | 是 | 波形类型（X、Y、Z） |

**查询参数**
| 参数名称 | 类型 | 必填 | 默认值 | 描述 |
|----------|------|------|--------|-----|
| startDate | string | 是 | 无 | 开始日期（ISO8601格式） |
| endDate | string | 是 | 无 | 结束日期（ISO8601格式） |
| limit | number | 否 | 无 | 限制返回记录数 |

**请求示例**：
```bash
curl -X GET \
  'http://localhost:3000/earthquake-data/historical/X?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z'
```

**成功响应示例**：
```json
{
  "status": 200,
  "data": [
    {
      "id": "eq123456",
      "timestamp": "2024-01-15T10:30:45Z",
      "amplitude": 4.5,
      "waveformType": "X",
      "location": {
        "latitude": 34.0522,
        "longitude": -118.2437
      },
      "metadata": {}
    },
  ]
}
```

**错误响应示例**（无效波形类型）：
```json
{
  "message": "无效的波形类型，必须是 X、Y 或 Z",
  "status": 400,
  "details": "接收到无效参数：waveformType=A"
}
```

### 最新地震数据

#### 获取最新数据
```
GET /earthquake-data/latest

```
**描述**：获取最新的地震数据

**查询参数**
| 参数名称 | 类型 | 必填 | 默认值 | 描述 |
|----------|------|------|--------|-----|
| limit | number | 否 | 100 | 限制返回记录数（1-1000） |

**请求示例**：
```bash
curl -X GET \
  'http://localhost:3000/earthquake-data/latest?limit=50'
```

**成功响应示例**：
```json
{
  "status": 200,
  "data": [
    {
      "id": "eq987654",
      "timestamp": "2024-03-21T14:25:30Z",
      "amplitude": 3.8,
      "waveformType": "Z",
      "location": {
        "latitude": 36.1699,
        "longitude": -115.1398
      },
      "metadata": {}
    },
  ]
}
```

**错误响应示例**（无效limit参数）：
```json
{
  "message": "limit参数无效",
  "status": 400,
  "details": "有效范围1-1000，收到: 1500"
}
```

### 数据提交

#### 提交地震数据
```
POST /earthquake-data
```
**描述**：提交新的地震数据

**请求体参数**
| 参数名称 | 类型 | 必填 | 默认值 | 描述 |
|----------|------|------|--------|-----|
| amplitude | number | 是 | 无 | 地震波振幅 |
| timestamp | string | 否 | 当前时间 | 时间戳（ISO8601格式） |
| metadata | object | 否 | {} | 附加元数据 |

**请求示例**：
```bash
curl -X POST \
  'http://localhost:3000/earthquake-data' \
  -H 'Content-Type: application/json' \
  -d '{
    "amplitude": 5.2,
    "timestamp": "2024-03-21T14:30:00Z",
    "metadata": {
      "source": "manual",
      "instrument": "seismometer-123"
    }
  }'
```

**成功响应示例**：
```json
{
  "status": 201,
  "message": "数据已成功保存并广播",
  "data": {
    "id": "eq765432",
    "timestamp": "2024-03-21T14:30:00Z"
  }
}
```

**错误响应示例**（缺少振幅参数）：
```json
{
  "message": "振幅数据是必需的参数",
  "status": 400,
  "details": "请求体中缺少amplitude字段"
}
```
### 数据生成器控制

#### 获取生成器状态
```
GET /generator/status
```
**描述**：获取数据生成器的当前状态

**参数说明**：无

**成功响应示例**：
```json
{
  "status": 200,
  "data": {
    "running": true,
    "startedAt": "2024-03-21T09:30:00Z",
    "generatedCount": 1500
  }
}
```

**错误响应示例**：
```json
{
  "message": "获取生成器状态失败",
  "status": 500,
  "details": "内部服务器错误"
}
```

#### 启动生成器
```
POST /generator/start
```
**描述**：启动数据生成器

**参数说明**：无

**成功响应示例**：
```json
{
  "status": 201,
  "data": {
    "message": "数据生成器已成功启动",
    "timestamp": "2024-03-21T09:30:00Z"
  }
}
```

**错误响应示例**：
```json
{
  "message": "启动生成器失败",
  "status": 500,
  "details": "生成器已经在运行中"
}
```

#### 停止生成器
```
POST /generator/stop
```
**描述**：停止数据生成器

**参数说明**：无

**成功响应示例**：
```json
{
  "status": 201,
  "data": {
    "message": "数据生成器已成功停止",
    "timestamp": "2024-03-21T10:45:00Z",
    "totalGenerated": 2500
  }
}
```

**错误响应示例**：
```json
{
  "message": "停止生成器失败",
  "status": 500,
  "details": "生成器未运行"
}
```

#### 性能测试端点
```
POST /test/load
```
**描述**：进行系统性能测试

**请求体参数**
| 参数名称 | 类型 | 必填 | 默认值 | 描述 |
|----------|------|------|--------|-----|
| iterations | integer | 否 | 100 | 测试迭代次数 |
| delay | integer | 否 | 10 | 每次迭代延迟(毫秒) |
| testType | string | 否 | cache | 测试类型 (cache) |

**请求示例**：
```bash
curl -X POST \
  'http://localhost:3000/api/test/load' \
  -H 'Content-Type: application/json' \
  -d '{
    "iterations": 500,
    "delay": 5,
    "testType": "cache"
  }'
```

**成功响应示例**：
```json
{
  "status": 201,
  "data": {
    "testType": "cache",
    "iterations": 500,
    "totalTime": 2500,
    "avgTime": 5.0,
    "successRate": 100.0,
    "results": [
      {"iteration": 0, "duration": 4, "success": true},
      {"iteration": 1, "duration": 5, "success": true}
    ],
    "timestamp": "2024-03-21T10:15:30Z"
  }
}
```

**错误响应示例**：
```json
{
  "message": "性能测试失败",
  "status": 500,
  "details": "测试过程中发生错误"
}
```

### 生成历史数据测试
```
POST /generate-test-data
```
**描述**：生成历史地震测试数据

**请求体参数**
| 参数名称 | 类型 | 必填 | 默认值 | 描述 |
|----------|------|------|--------|-----|
| count | integer | 否 | 100 | 生成数据数量 |
| days | integer | 否 | 7 | 生成数据的时间范围（天） |

**请求示例**：
```bash
curl -X POST \
  'http://localhost:3000/api/generate-test-data' \
  -H 'Content-Type: application/json' \
  -d '{
    "count": 500,
    "days": 30
  }'
```

**成功响应示例**：
```json
{
  "status": 201,
  "data": {
    "message": "成功生成500条历史测试数据",
    "startDate": "2024-02-20T10:45:00Z",
    "endDate": "2024-03-21T10:45:00Z",
    "count": 500
  }
}
```

**错误响应示例**：
```json
{
  "message": "生成测试数据时出错",
  "status": 500,
  "details": "数据库连接失败"
}
```

### 历史数据查询
```
GET /earthquake-data/historical
```
**参数说明**
| 参数名称 | 类型 | 必填 | 格式要求 | 描述 |
|----------|------|------|----------|-----|
| startDate | string | 是 | ISO8601 | 起始时间（例：2023-05-01T12:00:00Z） |
| endDate | string | 是 | ISO8601 | 结束时间 |
| limit | integer | 否 | 1-1000 | 返回结果数量限制（默认值根据接口不同） |
| waveformType | string | 否 | X\|Y\|Z | 波形类型过滤 |

**请求示例**：
```bash
curl -X GET \
  'http://localhost:3000/api/earthquake-data/historical?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&waveformType=X' \
  -H 'Authorization: Bearer <your_token>'
```

**成功响应示例**：
```json
{
  "status": 200,
  "data": [
    {
      "id": "EQ202401011201",
      "timestamp": "2024-01-01T12:00:00Z",
      "waveformType": "X",
      "amplitude": 5.8,
      "epicenter": "35.6895° N, 139.6917° E"
    },
    {
      "id": "EQ202401021530",
      "timestamp": "2024-01-02T15:30:00Z", 
      "waveformType": "X",
      "amplitude": 6.2,
      "epicenter": "34.0522° N, 118.2437° W"
    }
  ]
}
```

**错误响应示例**（缺少参数）：
```json
{
  "message": "开始日期和结束日期是必需的参数",
  "status": 400,
  "details": "请求缺少startDate或endDate参数"
}
```


### 特定波形数据
```
GET /earthquake-data/historical/:waveformType
```
**路径参数**
| 参数名称 | 类型 | 允许值 | 描述 |
|----------|------|--------|-----|
| waveformType | string | X,Y,Z | 波形类型 |

**请求参数**
| 参数名称 | 类型 | 必填 | 格式要求 | 描述 |
|----------|------|------|----------|-----|
| startDate | string | 是 | ISO8601 | 同历史数据接口 |
| endDate | string | 是 | ISO8601 | 同历史数据接口 |
| limit | integer | 否 | - | 同历史数据接口 |

**请求示例**：
```bash
curl -X GET \
  'http://localhost:3000/earthquake-data/historical/Y?startDate=2024-02-01T00:00:00Z&endDate=2024-02-15T23:59:59Z' \
  -H 'Content-Type: application/json'
```

**成功响应示例**：
```json
{
  "status": 200,
  "data": [
    {
      "id": "EQ202402021215",
      "timestamp": "2024-02-02T12:15:00Z",
      "waveformType": "Y",
      "amplitude": 7.1,
      "epicenter": "40.7128° N, 74.0060° W"
    },
    {
      "id": "EQ202402101845",
      "timestamp": "2024-02-10T18:45:00Z",
      "waveformType": "Y",
      "amplitude": 6.5,
      "epicenter": "51.5074° N, 0.1278° W"
    }
  ]
}
```

**错误响应示例**（无效波形类型）：
```json
{
  "message": "无效的波形类型，必须是 X、Y 或 Z",
  "status": 400,
  "details": "接收到无效参数：waveformType=Q"
}
```



### 最新数据
```
GET /api/earthquake-data/latest
```
**请求参数**
| 参数名称 | 类型 | 必填 | 默认值 | 描述 |
|----------|------|------|--------|-----|
| limit | integer | 否 | 100 | 返回最新记录数 |

**错误响应示例**（无效limit参数）：
```json
{
  "message": "limit参数无效",
  "status": 400,
  "details": "有效范围1-1000，收到: 1500"
}
```

**成功响应示例**：
```json
{
  "status": 200,
  "data": [
    {
      "id": "EQ202403201845",
      "timestamp": "2024-03-20T18:45:00Z",
      "waveformType": "Z",
      "amplitude": 5.9,
      "epicenter": "22.3193° N, 114.1694° E"
    },
    {
      "id": "EQ202403201230",
      "timestamp": "2024-03-20T12:30:00Z",
      "waveformType": "X",
      "amplitude": 6.3,
      "epicenter": "35.6762° N, 139.6503° E"
    }
  ]
}
```

**错误响应示例**（服务器错误）：
```json
{
  "message": "获取最新数据失败",
  "status": 500,
  "details": "数据库查询超时"
}
```

### 数据提交
```
POST /api/earthquake-data
```
**请求体参数**
| 参数名称 | 类型 | 必填 | 格式要求 | 描述 |
|----------|------|------|----------|-----|
| amplitude | number | 是 | - | 地震波振幅 |
| timestamp | string | 否 | ISO8601 | 数据时间戳（未提供时自动生成当前时间，示例中已注释）|
| metadata | object | 否 | - | 传感器元数据 |

**请求示例**：
```bash
curl -X POST \
  'http://localhost:3000/api/earthquake-data' \
  -H 'Content-Type: application/json' \
  -d '{
    "amplitude": 6.8,
    // "timestamp": "2024-03-15T08:23:45Z",  // 可选参数
    "metadata": {
      "sensorId": "SENSOR-001",
      "location": "35.6895° N, 139.6917° E"
    }
  }'
```

**成功响应示例**：
```json
{
  "status": 201,
  "data": {
    "message": "数据已成功保存并广播",
    "id": "EQ202403150823",
    "timestamp": "2024-03-15T08:23:45Z",
    "broadcast": {
      "nodes": 5,
      "status": "completed"
    }
  }
}
```

**错误响应示例**（缺少振幅参数）：
```json
{
  "message": "振幅数据是必需的参数",
  "status": 400,
  "details": "请求体中缺少amplitude字段"
}
```

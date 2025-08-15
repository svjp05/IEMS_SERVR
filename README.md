# 地震数据分析服务器

## 智谱AI集成说明

本系统集成了智谱AI大模型，用于增强地震数据分析和问答功能。智谱AI提供了更专业、更智能的地震数据解释和建议，大幅提升了系统的分析能力。

### 配置说明

在`.env`文件中配置以下参数：

```
# 智谱AI配置
ZHIPUAI_API_KEY=your_api_key_here
ZHIPUAI_AUTH_MODE=direct  # 可选值: apikey, jwt, direct
```

- `ZHIPUAI_API_KEY`: 智谱AI的API密钥，格式为"id.key"
- `ZHIPUAI_AUTH_MODE`: 认证模式，可选值:
  - `apikey`: 使用API密钥的ID部分作为X-Zhipu-Key请求头
  - `jwt`: 使用JWT认证（支持更复杂的权限控制）
  - `direct`: 直接使用API密钥作为Bearer Token（最新官方推荐方式）

### 认证方式说明

系统支持三种认证方式：

1. **API密钥认证**
   - 直接使用API密钥的id部分作为请求头的X-Zhipu-Key
   - 适合简单场景和快速集成
   - 配置简单，无需额外步骤

2. **JWT认证**
   - 使用API密钥生成JWT令牌
   - 适合需要更高安全性的场景
   - 令牌有效期为24小时，可重复使用

3. **直接Bearer认证**（新增）
   - 直接使用完整API密钥作为Bearer Token
   - 符合官方最新API调用规范
   - 简单直接，推荐使用

系统会根据`ZHIPUAI_AUTH_MODE`配置自动选择认证方式，也可在代码中显式指定。如果主要认证方式失败，系统会自动尝试其他认证方式，确保服务可用性。

### 使用示例

```javascript
// 使用默认认证方式（由环境变量ZHIPUAI_AUTH_MODE决定）
const response = await zhipuai.analyzeEarthquakeData(prompt, context);

// 指定使用API密钥认证
const response = await zhipuai.analyzeEarthquakeData(prompt, context, 'apikey');

// 指定使用JWT认证
const response = await zhipuai.analyzeEarthquakeData(prompt, context, 'jwt');

// 指定使用直接Bearer认证
const response = await zhipuai.analyzeEarthquakeData(prompt, context, 'direct');

// 直接调用特定认证方法
const response = await zhipuai.callWithApiKey(prompt, context);
const response = await zhipuai.callWithJWT(prompt, context);
const response = await zhipuai.callWithDirectApiKey(prompt, context);
```

### curl示例

以下是使用curl调用智谱AI API的示例:

```bash
# 使用直接Bearer认证方式 (ZHIPUAI_AUTH_MODE=direct)
curl --location 'https://open.bigmodel.cn/api/paas/v4/chat/completions' \
--header 'Authorization: Bearer your_api_key_here' \
--header 'Content-Type: application/json' \
--data '{
    "model": "glm-4",
    "messages": [
        {
            "role": "user",
            "content": "你好"
        }
    ]
}'

# 使用X-Zhipu-Key方式 (ZHIPUAI_AUTH_MODE=apikey)
curl --location 'https://open.bigmodel.cn/api/paas/v4/chat/completions' \
--header 'X-Zhipu-Key: your_api_id' \
--header 'Content-Type: application/json' \
--data '{
    "model": "glm-4",
    "messages": [
        {
            "role": "user", 
            "content": "你好"
        }
    ]
}'
```

### 故障排除

如果调用智谱AI失败，系统会自动尝试所有可用的认证方式，如果仍然失败，则回退到本地预定义回答机制，确保系统的可用性。常见问题包括：

1. API密钥格式错误 - 确保格式为"id.key"
2. 网络连接问题 - 检查网络连接和防火墙设置
3. 请求参数无效 - 检查请求内容和格式
4. 认证方式不匹配 - 尝试切换到不同的认证方式

### 注意事项

- 智谱AI调用会产生费用，请合理控制使用频率
- 避免在提示词中包含敏感信息
- 定期更新API密钥以确保安全
- 建议在测试环境中先验证API调用，再部署到生产环境 

##  开源协议

本项目采用 **[MIT 协议](LICENSE)** 开源，请遵守以下条款：
- **允许**：自由使用、修改、分发（需保留协议声明和版权信息）。
- **禁止**：用作者名义进行虚假宣传。
- **无担保**：作者不承担代码使用后的风险。

详见 [LICENSE 文件](LICENSE)。
# Peeko RAG 模块实现详解

> 本文档面向开发者，完整讲解 Peeko 中 RAG（检索增强生成）功能的设计与实现，涵盖整体架构、数据库结构、每个模块的职责，以及各文件中的具体函数。

---

## 一、整体架构

RAG 的核心思路是：**让 AI 回答时不只依赖语言模型的参数记忆，而是先检索用户上传的讲义内容作为上下文，再交给模型生成更准确的摘要卡片或 Catch Me Up 回答。**

Peeko 的 RAG 流程分为两个阶段：

### 阶段 A：索引（用户上传文件时触发）

```
用户上传文件
  → 路由接收 (session.ts)
    → 解析文本 (materialService.ts / extractText)
      → 分块 (materialService.ts / chunkText)
        → Embedding (embeddingService.ts / embedTexts)
          → 存入数据库 material_chunks (Supabase + pgvector)
```

### 阶段 B：检索与生成（前端触发生成卡片时）

```
生成卡片 / Catch Me Up 请求
  → cardService.ts
    → 检索 (retrieverService.ts / queryRelevantChunks)
      → 当前转录文本 embed → cosine 相似度查 top-K chunks
    → 构造 prompt (claudeService.ts)
      → 将检索到的讲义片段注入 prompt
        → Claude API 生成结构化 JSON 卡片
```

---

## 二、数据库结构（Migration 002）

文件：`backend/supabase-migration-002-rag.sql`

### 扩展

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

启用 PostgreSQL 的 `pgvector` 扩展，使数据库支持向量类型和余弦相似度运算。

### 表：`lecture_materials`

每行对应用户上传的一个文件。

| 字段 | 类型 | 说明 |
|---|---|---|
| `material_id` | UUID | 主键 |
| `session_id` | UUID | 关联的会话（级联删除） |
| `filename` | TEXT | 原始文件名 |
| `file_url` | TEXT | Supabase Storage 中的路径 |
| `mime_type` | TEXT | 文件类型（pdf/docx/txt） |
| `status` | TEXT | `processing` / `ready` / `failed` |
| `chunk_count` | INTEGER | 最终分块数量 |
| `error_message` | TEXT | 处理失败时的错误原因 |

### 表：`material_chunks`

每行对应一个文本块及其向量。

| 字段 | 类型 | 说明 |
|---|---|---|
| `chunk_id` | UUID | 主键 |
| `material_id` | UUID | 关联的文件 |
| `session_id` | UUID | **反规范化冗余字段**，直接按会话查询，避免 JOIN |
| `chunk_index` | INTEGER | 块在原文中的顺序 |
| `text` | TEXT | 原始文本内容 |
| `embedding` | vector(512) | 512 维向量（Voyage AI voyage-3-lite 输出） |

### 索引

```sql
-- 按 session_id 精确过滤
CREATE INDEX material_chunks_session_idx ON material_chunks(session_id);

-- 向量近似最近邻索引（IVFFlat 算法，cosine 距离，100 个中心点）
CREATE INDEX material_chunks_embedding_idx
  ON material_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### sessions 表扩展字段

```sql
ALTER TABLE sessions ADD COLUMN has_materials BOOLEAN DEFAULT FALSE;
```

这是一个**快速短路标志**：retriever 在执行向量检索前先检查此字段，如果为 `false` 则直接跳过，不调用 embedding 服务，节省一次 API 请求和数据库查询。

### RPC 函数：`match_material_chunks`

```sql
CREATE OR REPLACE FUNCTION match_material_chunks(
  p_session_id     UUID,
  p_query_embedding vector(512),
  p_match_count    INTEGER DEFAULT 5
)
RETURNS TABLE (chunk_id UUID, text TEXT, similarity FLOAT)
```

在数据库侧执行余弦相似度计算，按 `embedding <=> p_query_embedding`（cosine 距离）升序排列，取前 K 个。返回的 `similarity = 1 - 距离`，值越高越相关。

---

## 三、后端模块详解

### 3.1 `embeddingService.ts`

**职责**：将文本数组发送给 Voyage AI，获取向量表示。

#### 常量

- `VOYAGE_URL`：Voyage AI 的 embeddings 接口地址
- `MODEL`：`voyage-3-lite`，输出 512 维向量，适合语义检索

#### `doFetch(texts, inputType)`（私有）

封装一次 HTTP POST 请求：
- 从环境变量读取 `VOYAGE_API_KEY`
- `input_type` 区分 `'document'`（索引时）和 `'query'`（检索时），Voyage AI 会针对两种场景做不同的向量优化

#### `embedTexts(texts, inputType)`（导出）

对外暴露的唯一函数，加了两层错误处理：
1. **401 立即抛出**：API Key 错误无需重试
2. **5xx 单次重试**：网络抖动或服务临时不可用时，自动重试一次；第二次仍失败则抛出

返回 `number[][]`，每个元素对应一个输入文本的 512 维向量。

---

### 3.2 `materialService.ts`

**职责**：接收上传的文件 Buffer，完成解析 → 分块 → Embedding → 存库的完整索引流程。

#### `extractText(buffer, mimeType)`（私有）

根据 MIME 类型选择不同的解析器：

| MIME 类型 | 解析器 | 说明 |
|---|---|---|
| `application/pdf` | `pdf-parse` v2（`PDFParse` 类） | 使用 `new PDFParse({ data: buffer }).getText()` |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `mammoth` | `.extractRawText({ buffer })` |
| 其他（TXT） | 直接 `buffer.toString('utf-8')` | 无需第三方库 |

> **注意**：`pdf-parse` v2 放弃了 v1 的可调用默认导出，改为基于类的 API。此处使用命名导出 `PDFParse`。

#### `chunkText(text)`（导出，供测试）

滑动窗口分块算法，参数：
- `CHUNK_SIZE = 800`：目标块大小（字符数）
- `OVERLAP = 100`：相邻块重叠长度，保留上下文连贯性
- `MAX_CHUNK = 850`：单块上限；文本总长 ≤ 850 时直接返回整体

分块优先级：
1. 优先在段落边界（`\n\n`）切割
2. 其次在句子边界（`. ` / `! ` / `? `）切割
3. 最后按硬截断处理

#### `embedChunks(chunks)`（私有）

分批调用 `embedTexts`，每批最多 32 个 chunk（`EMBED_BATCH = 32`），防止单次请求体过大触发 Voyage AI 限制。

#### `processMaterial(fileBuffer, mimeType, filename, sessionId, materialId)`（导出）

**主流程函数**，由路由以 fire-and-poll 方式异步调用，流程：

1. 上传原始文件到 Supabase Storage（路径：`sessions/{sessionId}/{timestamp}-{filename}`），更新 `file_url`
2. 调用 `extractText` 解析文本
3. 调用 `chunkText` 分块
4. 调用 `embedChunks` 批量向量化
5. 批量插入 `material_chunks`
6. 更新 `lecture_materials.status = 'ready'`，写入 `chunk_count`
7. 将 `sessions.has_materials` 置为 `true`

任意步骤抛出异常，均在 `catch` 中将 `status` 置为 `'failed'` 并记录 `error_message`。

---

### 3.3 `retrieverService.ts`

**职责**：给定当前转录文本，从数据库中检索最相关的讲义片段。

#### `queryRelevantChunks(sessionId, queryText, k = 5)`（导出）

执行步骤：

1. **快速短路**：查询 `sessions.has_materials`，为 `false` 则立即返回空字符串，跳过后续所有操作
2. **Query Embedding**：将 `queryText`（当前转录窗口或用户触发的文本）发送给 Voyage AI，`input_type = 'query'`
3. **向量检索**：调用 Supabase RPC `match_material_chunks`，传入向量和 `k`，返回 top-K 个相似块
4. **格式化输出**：将结果拼接为带编号的文本段落，格式为：
   ```
   [Excerpt 1]: ...
   
   [Excerpt 2]: ...
   ```
   便于注入 prompt 时让模型明确区分每段来源。

返回空字符串表示"无材料"或"检索失败"，下游函数统一处理。

---

### 3.4 `claudeService.ts`

**职责**：构造 prompt 并调用 Claude API，生成结构化 JSON 卡片。

#### `chat(system, userMessage)`（私有）

最小化的 Claude 调用封装：`claude-sonnet-4-6`，`max_tokens: 1024`，返回第一个 text block 的内容。

#### `parseJSON(text)`（私有）

剥除 Claude 偶尔输出的 markdown 代码围栏（` ```json ... ``` `），再执行 `JSON.parse`。

#### `generateSummaryCard(previousCards, transcriptWindow, retrievedContext = '')`（导出）

生成周期性摘要卡片。RAG 注入方式：

```
Lecture materials (excerpts most relevant to this window):
{retrievedContext || '(none provided)'}

Previous cards (session memory):
{之前所有卡片的 JSON}

New transcript (last 5 minutes):
{本轮转录窗口}
```

System prompt 中明确指示模型：**讲义材料中有支撑的概念优先，无支撑的旁枝话题降权。** 失败时自动触发一次重试（去掉 markdown 约束，只要求纯 JSON）。

#### `generateCatchMeUp(allCards, transcriptSinceCheckpoint, retrievedContext = '')`（导出）

生成 Catch Me Up 恢复卡片，prompt 结构与上述相似，但聚焦于"学生刚回神，需要快速同步"的场景，要求模型输出 `now / missed / read_first / rejoin_tip` 四个字段。

---

### 3.5 `cardService.ts`（RAG 接入点）

`cardService` 本身不属于 RAG 模块，但它是 retriever 和 claudeService 的**组装层**，是 RAG 在业务流程中的调用入口。

#### `generateCard(sessionId, sessionStartedAt, skipWordCountGuard)`

第 82 行：
```typescript
const ctx = await retrieverService.queryRelevantChunks(sessionId, transcriptWindow || '');
const content = await claudeService.generateSummaryCard(allCards, transcriptWindow || '(silence)', ctx);
```

#### `generateCatchMeUp(sessionId, sessionStartedAt)`

第 116 行：
```typescript
const ctx = await retrieverService.queryRelevantChunks(sessionId, transcriptSinceCheckpoint || '');
const content = await claudeService.generateCatchMeUp(allCards, transcriptSinceCheckpoint, ctx);
```

两处均遵循相同模式：先取转录文本，用它作为 query 检索讲义，再将检索结果作为 `ctx` 传入 Claude。

---

### 3.6 `routes/session.ts`（RAG 相关路由）

#### `POST /session/:id/materials`

- 使用 `multer`（`memoryStorage`，上限 20MB）接收 `multipart/form-data` 文件
- 立刻在 `lecture_materials` 中插入 `status: 'processing'` 的占位行，获取 `material_id`
- 以 **fire-and-poll** 模式异步调用 `processMaterial(...).catch(...)`，不等待完成
- 立即返回 `{ material_id, status: 'processing' }`，前端轮询状态

#### `GET /session/:id/materials`

查询该 session 下所有材料的 `material_id / filename / status / chunk_count`，供前端轮询使用。

---

## 四、前端模块（NewSessionPage）

文件：`frontend/src/components/NewSessionPage.tsx`

前端负责文件上传和状态轮询，逻辑集中于此组件：

- **拖拽上传**：原生 HTML5 DnD 事件（`onDragOver` / `onDrop`），限制为 PDF/DOCX/TXT，≤ 20MB
- **XHR 上传**：`frontend/src/lib/api.ts` 中的 `uploadMaterial(sessionId, file, onProgress)`，使用 `XMLHttpRequest` 而非 `fetch`，以支持 `onProgress` 回调展示进度条
- **状态轮询**：上传成功后，每隔一定间隔调用 `getMaterials(sessionId)`，直到 `status === 'ready'` 或 `'failed'`
- **Start session 按钮**：仅当材料状态为 `ready`（或无材料时跳过上传）才激活，防止用户在索引未完成时进入会话

---

## 五、完整数据流总结

```
[用户拖入 PDF]
      |
      ▼
NewSessionPage.tsx
  uploadMaterial() → XHR multipart
      |
      ▼
POST /session/:id/materials (session.ts)
  multer 解析 → 插入 lecture_materials (status=processing)
  → processMaterial() 异步启动
  → 立即返回 material_id
      |
      ▼ (异步)
materialService.ts / processMaterial()
  extractText()     → pdf-parse / mammoth / utf-8
  chunkText()       → 滑动窗口，~800 字/块，100 字重叠
  embedChunks()     → Voyage AI (document, 批次 ≤32)
  supabase.insert() → material_chunks (embedding vector 512)
  update status     → 'ready', chunk_count
  update sessions   → has_materials = true
      |
      ▼ (轮询感知 ready)
NewSessionPage.tsx → "Start session" 激活
      |
      ▼ (会话进行中，每 5 分钟 or 用户点击 Catch Me Up)
cardService.ts / generateCard() or generateCatchMeUp()
  retrieverService.queryRelevantChunks()
    → 检查 has_materials (快速短路)
    → embedTexts([转录窗口], 'query') → Voyage AI
    → supabase.rpc('match_material_chunks') → top-5 chunks
  claudeService.generateSummaryCard() / generateCatchMeUp()
    → 拼接 [Excerpt 1]...[Excerpt N] 注入 prompt
    → Claude claude-sonnet-4-6 → JSON 卡片
  saveCard() → supabase.cards
```

---

## 六、关键设计决策

| 决策 | 原因 |
|---|---|
| Voyage AI `voyage-3-lite` 512 维 | 尺寸小、速度快，适合实时讲座场景；精度足够语义检索 |
| `input_type: 'document'` vs `'query'` | Voyage 对两种场景的向量空间分别优化，混用会降低检索质量 |
| IVFFlat 索引 (`lists=100`) | 近似最近邻，比精确搜索快；100 个聚类中心适合中等规模数据 |
| `session_id` 冗余字段在 `material_chunks` | 避免 JOIN `lecture_materials`，RPC 直接过滤，查询更快 |
| `has_materials` 快速短路标志 | 多数会话无材料，不应每次都打 embedding API 和数据库 |
| Fire-and-poll 上传模式 | PDF 解析 + embedding 可能耗时数秒，同步等待会导致请求超时 |
| 批次 Embedding（每批 ≤32 块） | 防止单次请求体超过 Voyage AI 的大小限制 |
| 分块重叠 100 字符 | 跨块边界的句子不会被截断丢失上下文 |

## ADDED Requirements

### Requirement: Structured JSON intermediate format
系统 SHALL 定义统一的中间 JSON 格式，AI 输出该格式后由前端转换为各类型文件。

#### Scenario: AI returns structured data
- **WHEN** 用户请求生成文件（Excel/Word/PPT/PDF）
- **THEN** 系统通过提示词引导 AI 返回统一结构的 JSON 数据，包含 title、headers、rows、styles 等字段

### Requirement: Excel generation
系统 SHALL 将结构化 JSON 转换为 Excel 文件并触发下载。

#### Scenario: Generate Excel from table data
- **WHEN** 用户请求生成 Excel 且 AI 返回表格类 JSON 数据
- **THEN** 系统使用 SheetJS 生成带样式的 .xlsx 文件并触发浏览器下载

### Requirement: Word generation
系统 SHALL 将结构化 JSON 转换为 Word 文件并触发下载。

#### Scenario: Generate Word from document data
- **WHEN** 用户请求生成 Word 且 AI 返回文档类 JSON 数据
- **THEN** 系统使用 docx.js 生成 .docx 文件并触发浏览器下载

### Requirement: PPT generation
系统 SHALL 将结构化 JSON 转换为 PPT 文件并触发下载。

#### Scenario: Generate PPT from presentation data
- **WHEN** 用户请求生成 PPT 且 AI 返回演示类 JSON 数据
- **THEN** 系统使用 PptxGenJS 生成 .pptx 文件并触发浏览器下载

### Requirement: PDF generation
系统 SHALL 将结构化 JSON 转换为 PDF 文件并触发下载。

#### Scenario: Generate PDF from any structured data
- **WHEN** 用户请求生成 PDF
- **THEN** 系统使用 jsPDF 生成 .pdf 文件并触发浏览器下载

### Requirement: Lazy loading of file generation libraries
系统 SHALL 按需加载文件生成库（动态 import），避免首屏加载过大。

#### Scenario: Dynamic import on demand
- **WHEN** 用户首次触发生成某类型文件
- **THEN** 系统动态 import 对应的库，加载完成后生成文件；后续调用直接使用缓存

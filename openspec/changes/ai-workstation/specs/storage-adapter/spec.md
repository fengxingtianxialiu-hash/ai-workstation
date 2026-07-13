## ADDED Requirements

### Requirement: Unified storage interface
系统 SHALL 提供统一的存储接口（get/set/remove），屏蔽底层平台差异。

#### Scenario: Platform-agnostic storage call
- **WHEN** 业务层调用 storage.get(key)
- **THEN** 适配层根据当前运行平台（H5/小程序）调用对应的底层存储 API

### Requirement: H5 implementation with localStorage + IndexedDB
H5 端 SHALL 使用 localStorage 存储轻量配置，IndexedDB 存储大容量数据。

#### Scenario: Small config data storage
- **WHEN** 存储主题偏好、当前模型等轻量配置
- **THEN** 数据存入 localStorage

#### Scenario: Large data storage
- **WHEN** 存储对话历史、图片等大容量数据
- **THEN** 数据存入 IndexedDB

### Requirement: Mini-program interface reservation
适配层 SHALL 预留小程序端的存储接口，使用 uni.setStorage / uni.getStorage。

#### Scenario: Mini-program storage fallback
- **WHEN** 应用运行在小程序环境
- **THEN** 适配层使用 uni.setStorage 替代 localStorage，并提供容量管理策略

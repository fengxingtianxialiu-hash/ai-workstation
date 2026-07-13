## ADDED Requirements

### Requirement: AES-GCM encryption for API Keys
系统 SHALL 使用 Web Crypto API 的 AES-GCM 算法加密存储 API Key。

#### Scenario: Encrypt and store API Key
- **WHEN** 用户设置加密密码并保存 API Key
- **THEN** 系统使用密码派生 AES 密钥，加密 API Key 后存入 localStorage

#### Scenario: Decrypt API Key for use
- **WHEN** 用户输入正确密码解锁
- **THEN** 系统解密 API Key 存入内存，后续请求使用内存中的明文 Key

### Requirement: Password non-persistence
系统 SHALL 不持久化存储解密密码，关闭页面后需重新输入。

#### Scenario: Password cleared on page close
- **WHEN** 用户关闭浏览器标签页后重新打开
- **THEN** 系统要求重新输入解密密码才能使用 API

#### Scenario: Session storage option
- **WHEN** 用户勾选"记住到关闭页面"
- **THEN** 密码存入 sessionStorage，关闭标签页后自动清除

### Requirement: Optional encryption
系统 SHALL 允许用户选择不加密（明文存储），但给出安全提示。

#### Scenario: Skip encryption
- **WHEN** 用户选择不设置加密密码
- **THEN** 系统以明文存储 API Key，并在设置页显示安全警告

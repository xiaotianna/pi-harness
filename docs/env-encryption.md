# .env 加密备份

在项目根目录运行 `pnpm env:encrypt`，脚本会生成 `.env.enc`，可随代码提交。首次运行自动生成随机的 256 位密钥 `.env.key`；后续加密复用该密钥，每次生成新的随机 nonce。使用 Node 内置 AES-256-GCM 验证密文完整性，加密后会验证能否完整还原再替换密文文件。

`.env` 和 `.env.key` 已加入忽略规则。请把 `.env.key` 单独备份到密码管理器，勿提交到仓库；丢失后无法恢复密文中的配置。拥有密文和密钥的人可以读取全部配置。

换机器后，将备份的 `.env.key` 放回项目根目录，运行 `pnpm env:decrypt` 恢复 `.env`。解密创建的文件权限为 `0600`，且拒绝覆盖已有 `.env`。需要恢复时先妥善移走现有配置。

修改 `.env` 后重新运行 `pnpm env:encrypt`，提交更新后的 `.env.enc`。运行 `pnpm env:check` 可验证加解密、错误密钥和密文篡改处理，不读取实际配置。

此脚本用于手动备份根目录 `.env`，不改变 daemon 的配置加载或凭据存储方式。如果明文密钥曾经提交过，加密新文件不会移除历史中的明文，应先在对应服务中撤销并更换泄露的密钥。

# 新 clone 后

1. 从密码管理器或旧机器取出备份的 `.env.key`，放到项目根目录，与 `.env.enc` 同级。
2. 在根目录执行：
   ```bash
   node scripts/env-crypt.mjs decrypt
   ```
3. 成功后会生成 `.env`，再正常安装依赖、启动项目。

解密只需要 Node.js，无需先安装依赖。**没有 `.env.key` 就无法解密，所以务必单独备份。**

# push

每次修改 .env 后，先运行：

```bash
pnpm env:encrypt
```

然后正常提交、push，带上更新后的 .env.enc。首次还要提交脚本、package.json、.gitignore 和说明文档。

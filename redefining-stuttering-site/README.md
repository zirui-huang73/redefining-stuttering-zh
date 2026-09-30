# 《重新定义口吃》中文阅读网站

基于 Astro 的纯静态阅读网站。正文直接来自上一级目录中的中文 Markdown 译稿。

## 本地运行

需要 Node.js 22 或更高版本。

```bash
cd redefining-stuttering-site
npm install
npm run dev
```

浏览器访问 Astro 输出的本地地址。

## 内容更新

直接修改上一级目录中的：

- `00-书前内容.md`
- `01-*.md` 至 `65-*.md`
- `00-术语表.md`
- `images/`

每次运行开发服务器或生产构建前，`scripts/prepare-content.mjs` 都会：

1. 检查全部章节是否齐全；
2. 读取标题、原书页码和预计阅读时间；
3. 修正书中图片为站内路径；
4. 生成临时内容索引。

不要直接编辑 `src/generated/` 或 `public/book-images/`，它们会在下一次构建时重新生成。

## 验证

```bash
npm run check
npm test
```

`npm test` 会执行生产构建，并确认首页、404 页面、67 个阅读页面及书中图片全部生成。

## 免费部署到 Cloudflare

建议把 `Redefining-Stuttering-zh` 整个目录作为 Git 仓库上传。网站项目需要读取上一级目录中的译稿，因此不要只上传 `redefining-stuttering-site` 子目录。

在 Cloudflare 控制台中：

1. 进入 **Workers & Pages**，选择 **Create application → Pages → Connect to Git**。
2. 选择包含本目录的 GitHub 或 GitLab 仓库。
3. 将 **Root directory** 设置为：

   ```text
   redefining-stuttering-site
   ```

4. 将 **Build command** 设置为：

   ```text
   npm run build
   ```

5. 将 **Build output directory** 设置为：

   ```text
   dist
   ```

6. 将 Node.js 版本设为 `24`，然后部署。

Cloudflare Pages 免费套餐足以托管本网站。以后只需修改译稿并推送到 Git，Cloudflare 就会自动重新构建。

如果 Cloudflare 项目要求填写 **Deploy command**，使用：

```text
npx wrangler deploy --config wrangler.jsonc
```

`wrangler.jsonc` 已明确指定只上传构建完成的 `dist/` 静态资源，避免 Wrangler 将网站自动改造成服务端渲染项目。

也可以先在本地构建，再使用 Wrangler 直接上传：

```bash
npm run build
npx wrangler pages deploy dist
```

执行直接上传时，Cloudflare 会要求登录并选择或创建 Pages 项目。

## 主要功能

- 按八部分分组的章节侧栏
- 桌面固定导航与移动端抽屉
- 当前章节高亮
- 篇内目录
- 上一篇／下一篇
- 深色模式
- 小、中、大三级字号
- 本地偏好保存，不使用 Cookie 或分析服务
- 响应式表格、脚注、引文与原书图片

## 发布说明

网站页脚标注本项目是“非官方中文译本，仅供非商业阅读与研究”，并提供英文原版链接。该说明不等同于取得翻译或公开传播授权，正式上线前请自行评估相关权利与风险。

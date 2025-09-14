# Next.js 项目

这个项目是使用 Next.js 创建的一个基础应用。

## 技术栈

- Next.js 15.5.2
- React 19.1.0
- TypeScript
- Tailwind CSS

## 项目结构

```
app/
  favicon.ico
  globals.css
  layout.tsx
  page.tsx
public/
  静态资源文件
next.config.ts
package.json
postcss.config.mjs
tsconfig.json
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

### 构建生产版本

```bash
npm run build
```

### 启动生产服务器

```bash
npm start
```

## 功能说明

这是一个基础的 Next.js 应用模板，包含了以下功能：

- 响应式设计
- 支持 TypeScript
- 集成 Tailwind CSS
- 快速开发体验

## 开发提示

- 编辑 `app/page.tsx` 来修改首页内容
- 使用 `app/layout.tsx` 来设置全局布局
- 全局样式可以在 `app/globals.css` 中修改
- 静态资源放在 `public` 目录下

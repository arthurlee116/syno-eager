<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# AGENTS.md

> AI 编码助手的项目指南文件

## 项目概述

Syno-Eager 是一个同义词查询 Web 应用，帮助用户快速查找单词的同义词和相关表达。
基于 React 19 + TypeScript + Vite 构建，使用 Vercel Serverless Functions 作为后端 API。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19, TypeScript 5.9 |
| 构建工具 | Vite (rolldown-vite) |
| 样式 | Tailwind CSS 4, CSS Modules |
| 状态管理 | TanStack React Query |
| UI 组件 | Radix UI, shadcn/ui, Lucide Icons |
| 动画 | Framer Motion |
| API | Vercel Serverless Functions, OpenAI SDK |
| 测试 | Vitest (单元), Playwright (E2E) |
| 代码规范 | ESLint, TypeScript Strict Mode |

## 项目结构

```
syno-eager/
├── api/                    # Vercel Serverless Functions
│   └── lookup.ts           # 同义词查询 API 端点
├── src/
│   ├── components/         # React 组件
│   │   ├── ui/             # shadcn/ui 基础组件
│   │   ├── SearchBar.tsx   # 搜索输入组件
│   │   └── ResultsView.tsx # 结果展示组件
│   ├── hooks/              # 自定义 React Hooks
│   ├── lib/                # 工具函数和类型定义
│   │   └── types.ts        # TypeScript 类型
│   ├── test/               # 测试配置和工具
│   ├── App.tsx             # 主应用组件
│   └── main.tsx            # 应用入口
├── e2e/                    # Playwright E2E 测试
├── public/                 # 静态资源
└── openspec/               # OpenSpec 规范文档
```

## 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器

# 构建
pnpm build            # TypeScript 编译 + Vite 构建

# 测试
pnpm test             # 运行所有测试 (单元 + E2E)
pnpm test:unit        # 仅运行 Vitest 单元测试
pnpm test:e2e         # 仅运行 Playwright E2E 测试

# 代码质量
pnpm lint             # ESLint 检查
```

## 代码规范

### TypeScript
- 启用严格模式 (strict: true)
- 使用 `@/*` 路径别名引用 src 目录
- 优先使用类型推断，复杂类型显式声明
- 接口用于对象类型，type 用于联合类型和工具类型

### React
- 使用函数组件和 Hooks
- 组件文件使用 PascalCase 命名
- 每个组件一个文件，测试文件放在同目录
- Props 类型定义在组件文件顶部

### 样式
- 使用 Tailwind CSS utility classes
- 复杂样式使用 `clsx` 和 `tailwind-merge` 组合
- 遵循 shadcn/ui 组件的变体模式 (CVA)

### 测试
- 单元测试文件命名: `*.test.tsx` 或 `*.test.ts`
- 使用 Testing Library 的用户行为测试模式
- E2E 测试放在 `e2e/` 目录

## API 开发指南

### Vercel Serverless Functions
- API 文件放在 `api/` 目录
- 导出默认函数处理请求
- 使用 Zod 进行请求参数验证
- 错误响应使用统一格式

```typescript
// api/example.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 实现逻辑
}
```

## 组件开发模式

### shadcn/ui 组件
- 基础 UI 组件位于 `src/components/ui/`
- 使用 `class-variance-authority` 定义变体
- 支持 `className` prop 进行样式扩展

### 业务组件
- 位于 `src/components/` 根目录
- 包含对应的 `.test.tsx` 测试文件
- 使用 TanStack Query 管理服务端状态

## Git 提交规范

使用语义化提交信息:
- `feat:` 新功能
- `fix:` Bug 修复
- `perf:` 性能优化
- `chore:` 构建/配置变更
- `docs:` 文档更新
- `refactor:` 代码重构
- `test:` 测试相关

## 注意事项

1. **不要**修改 `src/components/ui/` 中的 shadcn 基础组件
2. **不要**在代码中硬编码 API 密钥或敏感信息
3. **始终**在提交前运行 `pnpm lint` 和 `pnpm test`
4. **优先**使用现有的工具函数和组件
5. **保持**组件的单一职责原则

## OpenSpec 集成

本项目使用 OpenSpec 管理变更规范。涉及以下情况时，请先查阅 `openspec/AGENTS.md`:
- 架构变更或重大功能
- 破坏性变更
- 性能或安全相关工作
- 需要明确规范的模糊需求

---

*最后更新: 2026-02-08*

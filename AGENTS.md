# 五子棋 (Wuziqi / Gomoku)

一个基于 WebSocket 的在线五子棋对弈项目，支持双人对战和人机对战。前端使用 React + Canvas 渲染棋盘，后端使用 Express + Socket.IO 管理房间与对局状态。

---

## 项目概述

- **项目名称**：五子棋 — 墨韵对弈
- **技术栈**：React 18 + TypeScript + Vite（前端），Express + Socket.IO + tsx（后端）
- **运行模式**：浏览器客户端通过 WebSocket 连接到 Node.js 服务器进行实时对弈
- **支持模式**：
  - PvP（双人对战）：创建 4 位数字房间号，好友输入房间号加入
  - PvE（人机对战）：本地与 AI 对弈，AI 执白棋

---

## 项目结构

本项目为 monorepo 结构，根目录通过 `concurrently` 同时启动前后端。

```
.
├── package.json           # 根目录脚本：并发启动 client / server
├── shared/
│   └── types.ts           # 前后端共享的类型定义与常量
├── client/                # 前端（React + Vite）
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html         # 入口 HTML，引入 Google Fonts
│   └── src/
│       ├── main.tsx       # React 应用挂载点
│       ├── App.tsx        # 主视图切换（home / game）
│       ├── App.css        # 全局样式
│       ├── vite-env.d.ts
│       ├── components/
│       │   ├── Home.tsx       # 大厅：创建/加入房间
│       │   ├── GameRoom.tsx   # 游戏房间 UI（对局信息、悔棋、结果）
│       │   └── Board.tsx      # Canvas 棋盘渲染与交互
│       ├── hooks/
│       │   └── useSocket.ts   # Socket.IO 连接与事件封装
│       └── utils/
│           └── sound.ts       # Web Audio API 落子/胜利音效
├── server/                # 后端（Express + Socket.IO）
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts       # HTTP 服务器 + Socket.IO 事件总线
│       ├── game.ts        # 棋盘操作、胜负判定、和棋检测
│       ├── room.ts        # RoomManager：房间创建、加入、销毁
│       └── ai.ts          # AI 落子策略（启发式评估）
```

### 共享代码

`shared/types.ts` 定义了前后端共用的类型与常量（如 `BOARD_SIZE = 15`、`Player`、`Room` 等）。

- 前端通过相对路径 `../../../shared/types` 直接导入 TypeScript 类型。
- 后端通过 `../../shared/types.js` 导入（编译后按 `.js` 解析，实际由 tsx 运行时直接执行 `.ts`）。

---

## 构建与运行

### 环境要求

- Node.js（支持 npm）

### 安装依赖

```bash
# 根目录安装 concurrently
npm install

# 安装前端依赖
cd client && npm install

# 安装后端依赖
cd server && npm install
```

### 开发模式

在根目录运行以下命令，会同时启动前端 dev server 和后端服务器：

```bash
npm run dev
```

- 前端 Vite 开发服务器：`http://localhost:5173`
- 后端服务器：`http://localhost:3001`
- Vite 配置中已代理 `/socket.io` 到 `localhost:3001`，开发时前端页面会自动连接后端。

### 单独启动

```bash
# 仅启动后端
cd server && npm run dev        # tsx watch src/index.ts

# 仅启动前端
cd client && npm run dev        # vite
```

### 生产构建

```bash
# 构建前端到 client/dist/
cd client && npm run build      # tsc && vite build

# 启动生产服务器（会托管 client/dist 静态资源并处理所有路由回退到 index.html）
cd server && npm start          # tsx src/index.ts
```

后端 `index.ts` 中通过 `express.static` 托管 `client/dist`，因此生产环境只需运行后端即可同时提供前端页面。

### 端口与环境变量

- 后端默认监听 `3001`，可通过环境变量 `PORT` 覆盖：
  ```bash
  PORT=8080 npm start
  ```

---

## 代码组织与关键模块

### 前端

| 文件 | 职责 |
|------|------|
| `App.tsx` | 视图状态管理（home / game），连接 `useSocket` hook |
| `components/Home.tsx` | 大厅界面，支持创建 PvP/PvE 房间或输入 4 位房间号加入 |
| `components/GameRoom.tsx` | 对局界面，显示双方信息、棋盘、悔棋按钮、胜负弹窗 |
| `components/Board.tsx` | 使用 HTML5 Canvas 绘制 15×15 棋盘、棋子、星位、落子提示和最后落子标记 |
| `hooks/useSocket.ts` | 封装 Socket.IO 客户端连接、房间事件监听与发送方法 |
| `utils/sound.ts` | 使用 `AudioContext` 生成落子音效与胜利和弦音效 |

### 后端

| 文件 | 职责 |
|------|------|
| `src/index.ts` | Express 应用、HTTP 服务器、Socket.IO 初始化、所有事件处理器（`room:create`, `room:join`, `game:move`, `game:undo-request`, `game:undo-response`, `room:leave`, `disconnect`） |
| `src/game.ts` | 棋盘初始化、落子验证、五子连珠胜负判定（四个方向扫描）、和棋检测（棋盘满） |
| `src/room.ts` | `RoomManager` 类管理内存中的房间映射，房间号为 4 位随机数字，自动生成中文随机昵称 |
| `src/ai.ts` | `getAIMove` 函数，通过启发式评分评估每个空位，综合进攻与防守得分选择最优落子，优先选择中心点 (7,7) |

### Socket.IO 事件

| 事件名 | 方向 | 说明 |
|--------|------|------|
| `room:create` | C→S | 创建房间，`mode: 'pvp' \| 'pve'` |
| `room:join` | C→S | 加入指定房间号 |
| `room:joined` | S→C | 成功加入房间，返回房间状态与 playerId |
| `room:update` | S→C | 广播房间状态更新 |
| `room:error` | S→C | 加入失败返回错误信息（中文） |
| `room:opponent-left` | S→C | 对手断开连接 |
| `game:move` | C→S | 落子 |
| `game:undo-request` | C→S | 请求悔棋 |
| `game:undo-requested` | S→C | 向对手发送悔棋请求 |
| `game:undo-pending` | S→C | 告知请求方悔棋请求已发送 |
| `game:undo-response` | C→S | 对手响应悔棋（同意/拒绝） |

---

## 代码风格与约定

- **语言**：TypeScript，严格模式启用（`strict: true`）。
- **缩进与格式**：使用 2 空格缩进，未配置 ESLint / Prettier，保持现有风格一致即可。
- **导入风格**：前端使用 ES Module（`"type": "module"`），后端同样使用 ES Module（`import.meta.url` 等）。
- **类型导入**：显式使用 `import type { ... }` 导入类型。
- **UI 文本**：项目面向中文用户，所有界面文案、错误提示均为中文。
- **注释**：代码注释较少，以自描述命名为主。

---

## 测试

**当前项目未配置任何测试框架，也没有测试文件。**

如需添加测试，建议：
- 后端逻辑测试：在 `server/` 下引入 `vitest` 或 `jest`，测试 `game.ts`（胜负判定、落子规则）和 `ai.ts`（AI 评分逻辑）。
- 前端组件测试：可使用 `@testing-library/react` + `vitest`。

---

## 部署注意事项

- 生产构建后，只需运行 `server/src/index.ts`（通过 `tsx` 或编译为 JS），服务器会自动托管 `client/dist` 静态文件。
- Socket.IO CORS 在开发环境配置为 `origin: '*'`；生产部署时建议收紧为实际域名。
- 房间与对局状态全部保存在内存（`RoomManager` 中的 `Map`），**无持久化**。服务器重启后所有房间数据会丢失。
- 未配置反向代理、HTTPS、负载均衡或数据库，如需扩展需自行引入。

---

## 安全提示

- CORS 当前设置为允许所有来源（`origin: '*'`），生产环境应限制为实际前端域名。
- 无身份验证机制，玩家身份仅依赖 Socket.IO 自动生成的 `socket.id`。
- 输入验证：后端对落子位置进行边界和占用检查，但对房间号等输入仅做存在性校验。
- 无速率限制，公开部署时建议增加防刷机制。

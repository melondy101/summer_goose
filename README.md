# 大鹅的奇怪暑假 · Summer

一个治愈系、温暖荒诞的 Web + AI 轻策略卡牌小游戏：帮把小破烂当宝贝的大鹅阿满，在七天暑假里办一场「夏天来过的小证据」小展览。

## 游戏设定

阿满挎着偏大的草绿色布袋，袋口总露着一片叶子，口头禅是「这可是好东西。」暑假的最后七天，它在蝉鸣湾河边准备自己的小展位。

一局约 3 分钟（待试玩验证）：14 次三选一，布袋最多装 6 张活动卡，按五个公开配方合成展品。挑战是点亮「小小创造」「身体出过门」「日子有回声」三种展签；没集齐、甚至没有展品，也能开张、结算和重开。

策略来自有限位置与共享材料的取舍，不靠惩罚；重玩来自新的候选组合和本局没做过的展品，不加经营、跑图或签到。

## 当前状态

2026-10-25：在 M1 闭环上新增一批「看得见、可传播」的功能（详见 [营销功能说明](docs/marketing-features.md)）：Web Audio 合成音效与阿满的签名「嘎」、结算页「同一副牌挑战」一键复制链接（每局自动种子，好友打开拿到一模一样的 14 轮候选）、展品图鉴 X/5 与下局预告、PWA 装进口袋离线可玩、开始页主角卡、移动端刘海屏适配与全局错误兜底。存档 schema 升到 v2 并带 v1→v2 迁移链。

2026-10-24：M1 可玩闭环已在本地通过 Vitest 79、`tsc -b`、ESLint、`vite build`、Playwright 22。五张展品图都在 `assets/concepts/`，由 `src/game/artwork.ts` 接入，游戏里没有占位块。

- 仓库：https://github.com/melondy101/summer_goose
- 可玩地址：https://summergoose.vercel.app/

这是 Vercel 项目 `summer_goose` 上的静态模板站，没有运行时 AI。2026-10-24 核验了首页 HTTP 200，页面含「大鹅的奇怪暑假」，`/concepts/exhibit-training.png` 返回 PNG。还没有在这个地址上完整玩一局。

阿满使用 [C 版简化线稿](assets/concepts/aman-c-simple-v1.png)，原样进入游戏，不重画。主角卡版式见设计第 5.4 节；示意文件不是提交用的卡片，正式文件 `assets/delivery/aman-protagonist-card.png` 还没有。

- 规则层在 `src/game/`（纯 reducer + 可注入键值随机源），界面在 `src/components/game/`；存档损坏时会显示「存档读不出来了」提示页与「开启新局」，不静默丢弃进度。
- 开发测试种子：URL 加 `?seed=<值>` 可使整局候选可复现，界面标注「测试模式」；只用于试玩与自动化，不作为随机平衡已通过的证据。
- 本地验证：Vitest 79、`tsc -b`、ESLint、`vite build`、Playwright 22 条（1440×900 与 390×844）全部通过，控制台无错误。逐项结果见 [开发顺序与完成标准](docs/implementation-plan.md)。
- 尚未做：运行时 AI（M2）、手账 PNG 导出、主角卡成品、发布链接上的完整一局、赛事提交资料。
- 待真人实测：一局时长是否约 3 分钟、不靠口头讲解是否一看就会玩、玩完是否想再来一局。设计第 7 节明确这三项不能用规则测试通过替代。

2026-10-24 已授权创建上面的仓库和 Vercel 站点。新建站点、后端资源和更换托管平台仍需单独授权。当前按普通浏览器网页游戏设计，钱包、链上资产、代币不在本次范围内。

## 文档入口

- [MVP 产品与技术设计](docs/mvp-design.md)：阿满与蝉鸣湾、活动与配方、完整闭环、AI 美术与文案、赛事验收。
- [营销功能说明](docs/marketing-features.md)：音效与「嘎」、同一副牌挑战、展品图鉴、PWA、移动端适配与兜底的实现与验证入口。
- [开发顺序与完成标准](docs/implementation-plan.md)：先保证可玩闭环、AI 美术和赛事硬交付，再安排运行时 AI、导出与最终回归。
- [1024 超能 Coding 周末游戏赛道要求](docs/1024-coding-weekend-game-track.md)：可玩链接、游戏内提示、主角卡与提交期限。
- [Maker 积分调查](docs/maker-credits.md)：已观察的额度、限制与尚未核实的能力。
- [项目协作约定](AGENTS.md)：项目边界与后续实现规则。
- [展品生图稿](prompt.md)：五张展品图的提示词、验收和保存路径。

## 技术与赛事交付

已落地：TypeScript + React 19 + Vite 静态前端，Tailwind CSS v4 + shadcn/ui 基础交互，纯 reducer 规则、localStorage 续玩，Vitest + Playwright 验证。实际锁定版本见 [开发顺序与完成标准](docs/implementation-plan.md) 的验证记录；本地开发用 Bun，锁文件 bun.lock，未混用安装器。游戏不需要 SSR、Next.js 服务端或专用游戏引擎。

尚未落地：服务端 AI（Qoder Edge Function + 原生 fetch，同源 /functions/v1/app 分发）、Canvas 2D 手账 PNG 导出。

公开站点是 Vercel 静态前端，构建命令 `bun run build`，产物目录 `dist`。运行时函数仍按 Qoder Edge Function 设计，尚未实现；未实现前不新增第二套函数入口。密钥不能放进 VITE_ 前端变量。实际初始化用的是标准 Vite react-ts 结构（本机没有 Qoder 官方起步模板），包名 `summer_goose`，锁文件 bun.lock。若改用官方模板，需遵循其 Node 版本与安装流程，不混用安装器。

阿满和五件展品必须在制作期用 AI 生成并随游戏静态发布；运行时 AI 仅通过服务端函数生成纪念物文案和阿满的结尾信，未配置或失败时保留模板玩法。两类 AI 使用分别记录，不能用模板冒充真实模型接入；模型提供方、预算和持久计费保护仍需在接入前确认。

赛事交付包含浏览器或手机直接可玩的链接、完整一局与重开、游戏内操作提示，以及「起始描述或草图 → AI 生成角色 → 游戏内形象」主角卡一张。2026-10-25 15:00 封板，16:00 提交截止；使用已有项目、模板或开源代码时注明来源和本次新增内容。

本项目独立于 TapTap Maker。Maker 制作积分与 Web 游戏运行时模型费用分别核算；赛事限时额度也不作为活动后可玩的前提。

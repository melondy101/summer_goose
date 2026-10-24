# Brief：五件展品图（大鹅的奇怪暑假）

- 任务来源：仓库根 prompt.md（用户指定，未获授权不创建应用代码）。
- 主题：温馨浏览器小游戏《大鹅的奇怪暑假》的五件展品插画，各 1024×1024 PNG。
- 商品：无实体商品；核心对象为五件独立展品（石头单间、绕树远征纪念章、树荫体验报告、瓶盖碰碰棋、风的迟到记录）。
- 风格锚点：与 `assets/concepts/aman-c-simple-v1.png`（阿满）同一套：暖米白底 `#FBF4E7`、暖棕轮廓 `#807050`、中粗圆润描边、平涂实色，无纹理/渐变/投影/边框/水印/文字；画面无鹅、鸟、人或阿满。
- 提示词：严格使用 prompt.md 各条目英文提示词，不加内容；模型版本 seedream_5.0_flash。
- 交付路径（覆盖同名文件，不得另存）：
  - assets/concepts/exhibit-tool.png
  - assets/concepts/exhibit-training.png
  - assets/concepts/exhibit-essay.png
  - assets/concepts/exhibit-demo.png
  - assets/concepts/exhibit-evening.png
- 验收：按 prompt.md 中文验收条目逐项检查，单张不达标重画，最多三次；三次仍不达标不保存该张并说明原因。
- 禁止：不做主角卡，不改阿满图 / aman-style-study-v1.png / protagonist-card-layout.svg；不用色块、SVG、手绘代替。

## 五张指令合同（对应 prompt.md 英文提示词）

1. exhibit-tool：小圆角布口袋 #A0A078，袋口椭圆，内一颗圆石 #C8C0B0 几乎填满袋口；无缝线/褶皱/抽绳/装饰/叶子。
2. exhibit-training：叶子形纸章 #F7F1E0，短叶柄 #A0A078；章面仅一条手绘圆线 + 圈内一个小圆点；无孔/绳/刻字。
3. exhibit-essay：横放圆角纸条（宽约为高两倍）#F7F1E0，正好三道空白横线；左上角斜压一片叶子 #A0A078，叶脉 #908060。
4. exhibit-demo：近正方形纸 #F7F1E0，手绘 3×3 格；正好四个扁圆瓶盖占四格（两个 #E8A060、两个 #A0A078），每盖外圈+内圈；无金属高光/齿边/标志。
5. exhibit-evening：竖放圆角纸 #F7F1E0，正好三道空白横线；右上角同色内翻纸角；纸左侧两小段弧线表示风；无钟/云脸/箭头。

## 生产记录

- workspace: cws_59536874965099522（本轮新建，画布卡片已交付）
- 执行模式：parallel（五张互不依赖，预先锁定为同一固定批次）
- 每个结果双通道：design-cli +create → +get；RichMediaCard 单项交付；并另存到上述本地交付路径（prompt.md 要求）。

## 验收结果（2026-10-24）

- exhibit-tool.png：通过（第 1 版）。
- exhibit-essay.png：通过（第 1 版）。
- exhibit-evening.png：通过（第 1 版）。
- exhibit-demo.png：通过（第 4 版；第 1 版 6 盖、第 2 版 5 盖、第 3 版 7 盖，均数量错误）。
- exhibit-training.png：初轮未通过，**用户要求继续尝试后，第 5 版通过并已保存**：
  - 第 1~4 版（原版+3 次重画）：白描边或果实造型（无花果/柠檬/牛油果）始终未达标。
  - 编辑版 1（image_edit 改造牛油果外形）：仍呈牛油果水滴造型，未达标。
  - 第 5 版（seedream_5.0_pro，强化"叶片剪影、排除水果"）：呈带叶尖与短叶柄的叶片形纸章，章面一条手绘圆线+圈内一个小圆点，奶油纸色、单一暖棕轮廓、暖米白底、无白描边，达标。
  - 已保存至 assets/concepts/exhibit-training.png（1024×1024 PNG）。

- 交付路径最终状态：assets/concepts/ 下五张全部存在且均 1024×1024 PNG：exhibit-tool.png、exhibit-training.png、exhibit-essay.png、exhibit-demo.png、exhibit-evening.png。

## 追加记录（2026-10-24 晚，Pollinations 第五次尝试）

> 注：本 brief 开头「未获授权不创建应用代码」是那一次任务的范围约束。应用开发已于同日获得用户授权并完成 M1，本条只说明展品图这一项的现状。

- 通道：scripts/gen_exhibit_training.py 走 Pollinations `image.pollinations.ai`（flux，width/height=1024，seed=42，nologo=true）。
- 结果：**未通过，未保存，已从目标路径删除**。实测文件为 768×768（非 1024×1024），四角为棕褐色（约 rgb 173,130,87）而非 #FBF4E7 米白底，主体轮廓无法确认为叶子形纸章。
- 复测：同通道后续请求（flux/turbo、多个 seed）均返回 `HTTP 402 Payment Required`，免费额度已不可用。
- 结论：exhibit-training.png 仍是素材缺口。补图前不得用色块、SVG 或手绘代替进入提交版本；规则试玩可用同色块占位，但须在提交前替换为真实 AI 生成图。补图通道待用户确认。

> 更新（同日稍后）：用户要求继续尝试后，改用 seedream_5.0_pro 生成第 5 版并通过验收，exhibit-training.png 已保存，素材缺口已补齐。Pollinations 通道记录保留作历史参考。

> 更新（再后，画布编辑）：应画布指令把底部叶柄改为实心鼠尾草绿 #A0A078 填充、外圈单一 #807050 描边，并去除贴纸光晕边；其余叶片、手绘圆线、小圆点、底色保持不变。最终版已回写 assets/concepts/exhibit-training.png（1024×1024 PNG，四角底色 ≈ #FBF4E7，含实心 #A0A078 叶柄，已核验）。

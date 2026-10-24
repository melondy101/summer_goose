import type { RecipeId } from "./types";

/** 阿满主视觉：C 版简化线稿，原样使用，不重画、不加表情。 */
export const AMAN_IMAGE = "/concepts/aman-c-simple-v1.png";

/** 五件展品的 AI 生成图，文件都在 assets/concepts/。 */
export const EXHIBIT_IMAGES: Record<RecipeId, string> = {
  tool: "/concepts/exhibit-tool.png",
  training: "/concepts/exhibit-training.png",
  essay: "/concepts/exhibit-essay.png",
  demo: "/concepts/exhibit-demo.png",
  evening: "/concepts/exhibit-evening.png",
};

export function exhibitImage(recipeId: RecipeId): string {
  return EXHIBIT_IMAGES[recipeId];
}

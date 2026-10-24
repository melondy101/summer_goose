import { EXHIBIT_IMAGES } from "@/game/artwork";
import type { RecipeId } from "@/game/types";

interface ExhibitImageProps {
  recipeId: RecipeId;
  className?: string;
  alt?: string;
}

/** 展品图。五张图都使用 assets/concepts/ 里已验收的 AI 生成稿。 */
export function ExhibitImage({ recipeId, className, alt }: ExhibitImageProps) {
  return (
    <img
      src={EXHIBIT_IMAGES[recipeId]}
      alt={alt ?? ""}
      className={className}
      draggable={false}
    />
  );
}

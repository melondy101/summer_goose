import { Button } from "@/components/ui/button";

interface CorruptSaveScreenProps {
  onStartNew: () => void;
}

/**
 * 存档无法通过校验时的明确入口。设计第 3 节要求提示开启新局，
 * 不能静默卡死，也不静默丢弃进度。
 */
export function CorruptSaveScreen({ onStartNew }: CorruptSaveScreenProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 p-4">
      <h1 className="text-xl font-bold text-ink">存档读不出来了</h1>
      <p className="text-sm leading-relaxed text-ink/85">
        这台设备上保存的暑假进度无法识别，可能是版本不同或数据损坏。
        已经保存的进度找不回来了，可以直接开启一个新的暑假。
      </p>
      <Button size="lg" onClick={onStartNew} data-testid="start-after-corrupt">
        开启新局
      </Button>
    </main>
  );
}

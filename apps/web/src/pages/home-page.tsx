import { Button } from "@heroui/react";

export function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <section className="flex max-w-xl flex-col items-center gap-4 text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-neutral-500 uppercase">
          Local Agent Harness
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">PI Workbench</h1>
        <p className="max-w-md text-sm leading-6 text-neutral-400">
          项目基础设施已初始化，业务功能将在后续阶段实现。
        </p>
        <Button isDisabled>Infrastructure Ready</Button>
      </section>
    </main>
  );
}

"use client";

type FxGroupProps = {
  title: string;
  children: React.ReactNode;
};

/**
 * Labelled band of master stages. The rail carries two of them — the send buses
 * channels feed by choice, and the stages the whole mix passes through whether
 * it likes it or not — so the boxes read as two kinds of thing rather than one
 * undifferentiated stack.
 */
export default function FxGroup({ title, children }: FxGroupProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[10px] font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
        {title}
      </h2>

      {children}
    </section>
  );
}

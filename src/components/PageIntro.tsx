type PageIntroProps = {
  title: string;
  subtitle: string;
  description: string;
  tip?: string;
};

/**
 * Shared page masthead — subtitle stacks above title; optional amber tip strip.
 */
export default function PageIntro({ title, subtitle, description, tip }: PageIntroProps) {
  return (
    <header className="mb-6">
      <p className="body-font text-[13px] font-semibold uppercase tracking-[0.12em] text-[#189080]">
        {subtitle}
      </p>
      <h1 className="heading-font mt-2 text-[24px] font-bold leading-tight text-[#111827]">{title}</h1>
      <p className="body-font mt-3 max-w-2xl text-[15px] leading-[1.6] text-[#4B5563]">{description}</p>
      {tip ? (
        <div className="body-font mt-4 border-l-4 border-amber-400 bg-[#FFFBEB] p-3 text-sm leading-snug text-[#92400E]">
          💡 {tip}
        </div>
      ) : null}
    </header>
  );
}

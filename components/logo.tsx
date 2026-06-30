"use client";

type LogoColor = "amber" | "blue" | "green";

const config: Record<LogoColor, { bg: string; border: string; text: string; shadow: string }> = {
  amber: {
    bg: "bg-amber/10",
    border: "border-amber",
    text: "text-amber",
    shadow: "rgba(217,140,69,0.2)",
  },
  blue: {
    bg: "bg-blue/10",
    border: "border-blue",
    text: "text-blue",
    shadow: "rgba(91,138,158,0.2)",
  },
  green: {
    bg: "bg-green/10",
    border: "border-green",
    text: "text-green",
    shadow: "rgba(120,168,144,0.2)",
  },
};

export function Logo({ color = "amber" }: { color?: LogoColor }) {
  const c = config[color];

  return (
    <div className="w-16 h-16 mx-auto mb-3 relative flex items-center justify-center">
      <div
        className={`absolute inset-0 ${c.bg} ${c.border} border-2`}
        style={{
          clipPath: "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)",
          boxShadow: `0 0 24px ${c.shadow}`,
        }}
      />
      <span className={`font-heading text-lg font-bold ${c.text} relative z-10`}>C//</span>
    </div>
  );
}

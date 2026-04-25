type LogoProps = {
  className?: string;
};

export default function Logo({ className }: LogoProps) {
  return (
    <h1 className={`heading-font text-3xl font-bold tracking-tight ${className ?? ""}`}>
      <span className="text-brand-teal">My</span>
      <span className="text-brand-dark">Grade</span>
      <span className="text-brand-orange">Pal</span>
    </h1>
  );
}

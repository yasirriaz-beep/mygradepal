import ParentBottomNav from "@/components/parent/ParentBottomNav";
import ParentTopBar from "@/components/parent/ParentTopBar";

export default function ParentPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#f0f8f7] pb-24">
      <ParentTopBar />
      <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6">{children}</main>
      <ParentBottomNav />
    </div>
  );
}

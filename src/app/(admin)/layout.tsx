import Sidebar from "./Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
        {children}
      </main>
    </div>
  );
}

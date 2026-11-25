import BackToTop from "@/components/ui/BackToTop";
import Sidebar from "./Sidebar";

/**
 * 로그인 확인은 proxy에서 끝난다. 여기는 화면 구성만 담당한다.
 */
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
      <BackToTop />
    </div>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "프로젝트 기록장",
  description: "작업한 프로젝트와 일정을 기록하는 개인 관리자",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

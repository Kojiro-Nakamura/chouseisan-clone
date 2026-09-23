import { Inter } from "next/font/google";
import "./globals.css";

export const runtime = 'edge';

const inter = Inter({
  subsets: ["latin"],
});

export const metadata = {
  title: "調整さんclone",
  description: "シンプルで使いやすい日程調整ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}

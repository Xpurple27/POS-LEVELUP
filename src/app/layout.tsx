import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/provider";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {
  title: "LEVELUP — Manajemen Kedai",
  description: "Sistem kasir dan manajemen coffee shop",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}

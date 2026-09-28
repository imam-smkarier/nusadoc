import { AppShell } from "@/components/app/AppShell";
import { AppStoreProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/Modal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppStoreProvider>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </AppStoreProvider>
    </AuthProvider>
  );
}

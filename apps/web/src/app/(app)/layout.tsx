import { Toaster } from "@/components/ui/sonner";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { requireOrg } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, org } = await requireOrg();

  return (
    <SidebarProvider>
      <AppSidebar orgName={org.orgName} role={org.role} email={user.email ?? ""} />
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="!h-5" />
          <span className="text-sm font-medium">{org.orgName}</span>
        </header>
        <div className="min-w-0 flex-1 p-4 sm:p-6">{children}</div>
      </SidebarInset>
      <Toaster position="top-center" richColors />
    </SidebarProvider>
  );
}

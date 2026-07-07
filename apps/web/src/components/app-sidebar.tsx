"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Code2,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";
import { signOut } from "@/actions/auth";
import { LogoMark } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const NAV = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, adminOnly: false },
  { title: "Certificates", href: "/certificates", icon: ScrollText, adminOnly: false },
  { title: "Team", href: "/team", icon: Users, adminOnly: true },
  { title: "API", href: "/developers", icon: Code2, adminOnly: true },
  { title: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];

export function AppSidebar({
  orgName,
  role,
  email,
}: {
  orgName: string;
  role: string;
  email: string;
}) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-2">
          <LogoMark className="size-9" />
          <div className="flex min-w-0 flex-col">
            <span className="text-base font-bold tracking-tight">FieldCert</span>
            <span className="text-sidebar-foreground/70 truncate text-xs">{orgName}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.filter((item) => !item.adminOnly || role === "admin").map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname.startsWith(item.href)}
                    className="h-11 text-[15px] data-[active=true]:font-semibold"
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-medium">{email}</span>
            <span className="text-sidebar-foreground/70 text-xs capitalize">{role}</span>
          </div>
          <form action={signOut}>
            <Button
              variant="ghost"
              size="icon"
              type="submit"
              aria-label="Sign out"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

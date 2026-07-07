"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileCheck2, LayoutDashboard, LogOut, ScrollText } from "lucide-react";
import { signOut } from "@/actions/auth";
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
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Certificates", href: "/certificates", icon: ScrollText },
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
        <div className="flex items-center gap-2 px-2 py-1.5">
          <FileCheck2 className="text-primary size-5" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">FieldCert</span>
            <span className="text-muted-foreground text-xs">{orgName}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname.startsWith(item.href)}
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
            <span className="text-muted-foreground text-xs capitalize">{role}</span>
          </div>
          <form action={signOut}>
            <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

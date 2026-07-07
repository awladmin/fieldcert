"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import type { OrgRole } from "@/lib/auth";
import { cancelInvite, inviteMember, removeMember, updateMemberRole } from "@/actions/team";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_OPTIONS: Array<{ value: OrgRole; label: string; hint: string }> = [
  { value: "engineer", label: "Engineer", hint: "Creates and completes certificates" },
  { value: "qs", label: "QS", hint: "Reviews and approves certificates" },
  { value: "office", label: "Office", hint: "Manages customers and paperwork, free seat" },
  { value: "admin", label: "Admin", hint: "Full control including billing and team, free seat" },
];

interface Member {
  userId: string;
  role: OrgRole;
  name: string;
  email: string;
}

interface Invite {
  id: string;
  email: string;
  role: OrgRole;
}

export function TeamManager({
  currentUserId,
  members,
  invites,
  seats,
  engineerCount,
  accountType,
}: {
  currentUserId: string;
  members: Member[];
  invites: Invite[];
  seats: number;
  engineerCount: number;
  accountType: "individual" | "business";
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("engineer");
  const [pending, startTransition] = useTransition();

  function submitInvite() {
    startTransition(async () => {
      const result = await inviteMember(email, role);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`Invite sent to ${email}. They join automatically when they sign in.`);
        setEmail("");
      }
    });
  }

  function act(fn: () => Promise<{ error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.error) toast.error(result.error);
      else toast.success(successMessage);
    });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Team</h1>
        {accountType === "business" && (
          <Badge variant="outline" className="tabular-nums">
            {engineerCount} of {seats} engineer seats used
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite someone</CardTitle>
          <CardDescription>
            They sign in with their email and a one-time code, and join your team automatically.
            No passwords, no setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="engineer@example.co.uk"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={submitInvite} disabled={pending || !email.trim()}>
            <UserPlus className="size-4" />
            Invite
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell className="font-medium">
                    {m.name}
                    {m.userId === currentUserId && (
                      <span className="text-muted-foreground ml-1 text-xs">(you)</span>
                    )}
                  </TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>
                    {m.userId === currentUserId ? (
                      <Badge variant="outline" className="capitalize">{m.role}</Badge>
                    ) : (
                      <Select
                        value={m.role}
                        onValueChange={(v) =>
                          act(() => updateMemberRole(m.userId, v as OrgRole), "Role updated")
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {m.userId !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${m.name}`}
                        onClick={() => act(() => removeMember(m.userId), "Member removed")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invites</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell className="capitalize">{invite.role}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => act(() => cancelInvite(invite.id), "Invite cancelled")}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

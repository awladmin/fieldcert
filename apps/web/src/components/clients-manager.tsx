"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { addClientAsInstallation, deleteClient, saveClient } from "@/actions/clients";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ClientRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  addressLabel: string;
  line1: string;
  line2: string;
  town: string;
  postcode: string;
  installationCount: number;
}

/** Shared field set for the create and edit dialogs. */
function ClientFields({ prefix, defaults }: { prefix: string; defaults?: ClientRow }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${prefix}-name`}>Name</Label>
        <Input id={`${prefix}-name`} name="name" defaultValue={defaults?.name} required className="h-11" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${prefix}-email`}>Email</Label>
          <Input id={`${prefix}-email`} name="email" type="email" defaultValue={defaults?.email} className="h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${prefix}-phone`}>Phone</Label>
          <Input id={`${prefix}-phone`} name="phone" defaultValue={defaults?.phone} className="h-11" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${prefix}-line1`}>Address</Label>
        <Input id={`${prefix}-line1`} name="line1" placeholder="Address line 1" defaultValue={defaults?.line1} className="h-11" />
        <Input name="line2" placeholder="Address line 2 (optional)" aria-label="Address line 2" defaultValue={defaults?.line2} className="h-11" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="town" placeholder="Town or city" aria-label="Town or city" defaultValue={defaults?.town} className="h-11" />
          <Input name="postcode" placeholder="Postcode" aria-label="Postcode" defaultValue={defaults?.postcode} className="h-11" />
        </div>
      </div>
    </>
  );
}

export function ClientsManager({ clients }: { clients: ClientRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState<ClientRow | null>(null);
  const [installPrompt, setInstallPrompt] = useState<{ id: string; name: string } | null>(null);

  const [pending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string>();
  const [editError, setEditError] = useState<string>();

  // Form actions run the server action inside a transition so the result can
  // drive the "add as installation?" follow-up prompt directly.
  function submitCreate(formData: FormData) {
    startTransition(async () => {
      const result = await saveClient({}, formData);
      if (result.error) {
        setCreateError(result.error);
        return;
      }
      setCreateError(undefined);
      setCreateOpen(false);
      toast.success(`${result.clientName} added`);
      if (result.hasAddress && result.clientId) {
        setInstallPrompt({ id: result.clientId, name: result.clientName ?? "the client" });
      }
    });
  }

  function submitEdit(formData: FormData) {
    startTransition(async () => {
      const result = await saveClient({}, formData);
      if (result.error) {
        setEditError(result.error);
        return;
      }
      setEditError(undefined);
      setEditing(null);
      toast.success("Client updated");
    });
  }

  async function confirmDelete() {
    if (!deleting) return;
    const result = await deleteClient(deleting.id);
    if (result.error) toast.error(result.error);
    else toast.success(`${deleting.name} deleted`);
    setDeleting(null);
  }

  async function confirmInstallation() {
    if (!installPrompt) return;
    const result = await addClientAsInstallation(installPrompt.id);
    if (result.error) toast.error(result.error);
    else toast.success("Installation added");
    setInstallPrompt(null);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <UserPlus className="size-4" />
            New client
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New client</DialogTitle>
              <DialogDescription>
                The person or company ordering the report. Their details prefill every certificate.
              </DialogDescription>
            </DialogHeader>
            <form action={submitCreate} className="flex flex-col gap-4">
              <ClientFields prefix="cc" />
              {createError && (
                <Alert variant="destructive">
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={pending} className="h-11">
                {pending ? "Saving" : "Add client"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="text-right">Installations</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span className="text-muted-foreground text-xs">{c.phone}</span>}
                  {!c.email && !c.phone && "-"}
                </div>
              </TableCell>
              <TableCell>{c.addressLabel || "-"}</TableCell>
              <TableCell className="text-right tabular-nums">{c.installationCount}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {clients.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                No clients yet. Add your first and it becomes a one-tap pick on every certificate.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit client</DialogTitle>
            <DialogDescription>Changes apply to future certificates, not issued ones.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form action={submitEdit} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={editing.id} />
              <ClientFields prefix="ce" defaults={editing} />
              {editError && (
                <Alert variant="destructive">
                  <AlertDescription>{editError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={pending} className="h-11">
                {pending ? "Saving" : "Save changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={installPrompt !== null} onOpenChange={(open) => !open && setInstallPrompt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add as installation?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to add an installation at {installPrompt?.name}&apos;s address? Most
              domestic jobs inspect the client&apos;s own property.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmInstallation}>Yes, add it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their certificates stay in the register but lose the link to this client record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete client</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

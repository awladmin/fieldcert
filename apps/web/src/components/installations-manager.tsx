"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { HousePlus, Pencil, Trash2 } from "lucide-react";
import { deleteInstallation, saveInstallation } from "@/actions/installations";
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

export interface InstallationRow {
  id: string;
  addressLabel: string;
  line1: string;
  line2: string;
  town: string;
  postcode: string;
  uprn: string;
  customerId: string;
  clientName: string;
  certificateCount: number;
}

const NO_CLIENT = "none";

/** Shared field set for the create and edit dialogs. */
function InstallationFields({
  prefix,
  defaults,
  clients,
}: {
  prefix: string;
  defaults?: InstallationRow;
  clients: Array<{ id: string; name: string }>;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${prefix}-line1`}>Address</Label>
        <Input id={`${prefix}-line1`} name="line1" placeholder="Address line 1" defaultValue={defaults?.line1} required className="h-11" />
        <Input name="line2" placeholder="Address line 2 (optional)" aria-label="Address line 2" defaultValue={defaults?.line2} className="h-11" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="town" placeholder="Town or city" aria-label="Town or city" defaultValue={defaults?.town} className="h-11" />
          <Input name="postcode" placeholder="Postcode" aria-label="Postcode" defaultValue={defaults?.postcode} className="h-11" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${prefix}-uprn`}>UPRN (optional)</Label>
        <Input id={`${prefix}-uprn`} name="uprn" placeholder="e.g. 100023336956" defaultValue={defaults?.uprn} className="h-11" />
        <p className="text-muted-foreground text-xs">
          The Unique Property Reference Number. Lets housing associations and connected platforms
          match this property exactly.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Client</Label>
        <Select name="customerId" defaultValue={defaults?.customerId || NO_CLIENT}>
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CLIENT}>No client</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

export function InstallationsManager({
  installations,
  clients,
}: {
  installations: InstallationRow[];
  clients: Array<{ id: string; name: string }>;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<InstallationRow | null>(null);
  const [deleting, setDeleting] = useState<InstallationRow | null>(null);

  const [pending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string>();
  const [editError, setEditError] = useState<string>();

  function submitCreate(formData: FormData) {
    startTransition(async () => {
      const result = await saveInstallation({}, formData);
      if (result.error) {
        setCreateError(result.error);
        return;
      }
      setCreateError(undefined);
      setCreateOpen(false);
      toast.success("Installation added");
    });
  }

  function submitEdit(formData: FormData) {
    startTransition(async () => {
      const result = await saveInstallation({}, formData);
      if (result.error) {
        setEditError(result.error);
        return;
      }
      setEditError(undefined);
      setEditing(null);
      toast.success("Installation updated");
    });
  }

  async function confirmDelete() {
    if (!deleting) return;
    const result = await deleteInstallation(deleting.id);
    if (result.error) toast.error(result.error);
    else toast.success("Installation deleted");
    setDeleting(null);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Installations</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <HousePlus className="size-4" />
            New installation
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New installation</DialogTitle>
              <DialogDescription>
                The property being inspected. Its address prefills every certificate for it.
              </DialogDescription>
            </DialogHeader>
            <form action={submitCreate} className="flex flex-col gap-4">
              <InstallationFields prefix="ic" clients={clients} />
              {createError && (
                <Alert variant="destructive">
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={pending} className="h-11">
                {pending ? "Saving" : "Add installation"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Address</TableHead>
            <TableHead>UPRN</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="text-right">Certificates</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {installations.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.addressLabel}</TableCell>
              <TableCell className="font-mono text-xs">{row.uprn || "-"}</TableCell>
              <TableCell>{row.clientName || "-"}</TableCell>
              <TableCell className="text-right tabular-nums">{row.certificateCount}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${row.addressLabel}`} onClick={() => setEditing(row)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${row.addressLabel}`} onClick={() => setDeleting(row)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {installations.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                No installations yet. Add the properties you inspect, or create one automatically
                when you add a client.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit installation</DialogTitle>
            <DialogDescription>Changes apply to future certificates, not issued ones.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form action={submitEdit} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={editing.id} />
              <InstallationFields prefix="ie" defaults={editing} clients={clients} />
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

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this installation?</AlertDialogTitle>
            <AlertDialogDescription>
              Certificates for {deleting?.addressLabel} stay in the register but lose the link to
              this record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete installation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Wrench } from "lucide-react";
import { addEquipment, deleteEquipment } from "@/actions/branding";
import { EQUIPMENT_KIND_LABELS, EQUIPMENT_KINDS } from "@/lib/equipment";
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

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export interface EquipmentRow {
  id: string;
  kind: string;
  name: string;
  serial: string;
  calibrationDue: string | null;
}

/** The test instrument register; serials feed the certificate editor. */
export function EquipmentCard({ equipment }: { equipment: EquipmentRow[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await addEquipment(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Instrument added to the register");
        formRef.current?.reset();
      }
    });
  }

  function remove(id: string, name: string) {
    startTransition(async () => {
      const result = await deleteEquipment(id);
      if (result.error) toast.error(result.error);
      else toast.success(`${name} removed`);
    });
  }

  // Module-scope hoisting keeps the comparison render-pure.
  const calibrationState = (due: string | null) => {
    if (!due) return null;
    return due < TODAY_ISO ? "overdue" : "ok";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="text-primary size-4" /> Test equipment register
        </CardTitle>
        <CardDescription>
          Your instruments with serial numbers and calibration dates. They become one-tap picks in
          the certificate editor, and assessors ask for exactly this list.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form ref={formRef} action={submit} className="grid items-end gap-3 sm:grid-cols-[170px_1fr_1fr_150px_auto]">
          <div className="flex flex-col gap-2">
            <Label>Type</Label>
            <Select
              name="kind"
              items={EQUIPMENT_KINDS.map((kind) => ({ value: kind, label: EQUIPMENT_KIND_LABELS[kind] }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {EQUIPMENT_KIND_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="eq-name">Instrument</Label>
            <Input id="eq-name" name="name" placeholder="e.g. Megger MFT1741" className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="eq-serial">Serial / asset no</Label>
            <Input id="eq-serial" name="serial" placeholder="e.g. 101067675" className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="eq-cal">Calibration due</Label>
            <Input id="eq-cal" name="calibrationDue" type="date" className="h-11" />
          </div>
          <Button type="submit" disabled={pending}>
            Add
          </Button>
        </form>

        {equipment.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Instrument</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Calibration due</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{EQUIPMENT_KIND_LABELS[row.kind as keyof typeof EQUIPMENT_KIND_LABELS] ?? row.kind}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="font-mono text-xs">{row.serial}</TableCell>
                  <TableCell>
                    {row.calibrationDue ? (
                      <span className={calibrationState(row.calibrationDue) === "overdue" ? "text-destructive font-semibold" : ""}>
                        {new Date(row.calibrationDue).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {calibrationState(row.calibrationDue) === "overdue" ? " (overdue)" : ""}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" aria-label={`Remove ${row.name}`} onClick={() => remove(row.id, row.name)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

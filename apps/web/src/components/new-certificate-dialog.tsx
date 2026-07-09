"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, ChevronRight, Lock, RefreshCw } from "lucide-react";
import { createCertificate, type CreateCertificateState } from "@/actions/certificates";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

export interface ClientOption {
  id: string;
  label: string;
  hasAddress: boolean;
}

export interface InstallationOption {
  id: string;
  label: string;
  customerId: string | null;
}

export interface MemberOption {
  id: string;
  name: string;
  role: string;
}

const NONE = "none";
const NEW = "new";
const CLIENT_ADDRESS = "client-address";

/** The certificate families we mean to support. Only EICR is live today; the
 *  rest render as greyed "Coming soon" so the picker shows the full roadmap.
 *  Backlog: build the EIC and Minor Works editors + PDFs behind these. */
const CERT_TYPES = [
  {
    kind: "EICR" as const,
    name: "Electrical Installation Condition Report",
    standard: "BS 7671:2018+A3(2024)",
    blurb: "Periodic inspection of an existing installation.",
    badgeClass: "bg-blue-600 text-white dark:bg-blue-500",
    live: true,
  },
  {
    kind: "EIC" as const,
    name: "Electrical Installation Certificate",
    standard: "New work and major alterations",
    blurb: "Certifies a new installation or a significant addition.",
    badgeClass: "bg-violet-600 text-white dark:bg-violet-500",
    live: false,
  },
  {
    kind: "MEIWC" as const,
    name: "Minor Electrical Installation Works Certificate",
    standard: "Small additions and alterations",
    blurb: "A single circuit altered, not a new circuit.",
    badgeClass: "bg-teal-600 text-white dark:bg-teal-500",
    live: false,
  },
];

function generateReference() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `EICR-${date}-${suffix}`;
}

export function NewCertificateDialog({
  clients,
  installations,
  members,
  currentUserId,
  qsApprovalRequired,
  defaultOpen = false,
}: {
  clients: ClientOption[];
  installations: InstallationOption[];
  members: MemberOption[];
  currentUserId: string;
  qsApprovalRequired: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [step, setStep] = useState<"type" | "details">("type");
  const [reference, setReference] = useState(generateReference);
  const [clientChoice, setClientChoice] = useState(NONE);
  const [installationChoice, setInstallationChoice] = useState(NONE);
  const [clientLine1, setClientLine1] = useState("");
  const [state, formAction, pending] = useActionState<CreateCertificateState, FormData>(
    createCertificate,
    {}
  );

  const newClient = clientChoice === NEW;
  const selectedClient = clients.find((c) => c.id === clientChoice);
  // Offer "same address as the client" when the chosen client has one to copy.
  const clientAddressAvailable = newClient ? clientLine1.trim().length > 0 : Boolean(selectedClient?.hasAddress);
  // Installations linked to the chosen client come first; unlinked ones stay available.
  const installationOptions =
    selectedClient == null
      ? installations
      : [...installations].sort((a, b) =>
          Number(b.customerId === selectedClient.id) - Number(a.customerId === selectedClient.id)
        );

  const qsCandidates = members.filter((m) => m.role === "qs" || m.role === "admin");
  const showAssignment = members.length > 1;
  const showQs = qsApprovalRequired && qsCandidates.length > 0;

  const clientMode = newClient ? "new" : clientChoice === NONE ? "none" : "existing";
  const installationMode =
    installationChoice === NEW
      ? "new"
      : installationChoice === CLIENT_ADDRESS
        ? "client-address"
        : installationChoice === NONE
          ? "none"
          : "existing";

  // value -> label maps so the trigger shows names, not raw ids.
  const clientItems = [
    { value: NONE, label: "No client yet" },
    ...clients.map((c) => ({ value: c.id, label: c.label })),
    { value: NEW, label: "Add a new client..." },
  ];
  const installationItems = [
    { value: NONE, label: "No installation yet" },
    ...(clientAddressAvailable ? [{ value: CLIENT_ADDRESS, label: "Same address as the client" }] : []),
    ...installationOptions.map((p) => ({ value: p.id, label: p.label })),
    { value: NEW, label: "Add a new installation..." },
  ];
  const memberItems = members.map((m) => ({ value: m.id, label: m.name }));
  const qsItems = qsCandidates.map((m) => ({ value: m.id, label: m.name }));

  const eicrType = CERT_TYPES[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setStep("type");
      }}
    >
      <DialogTrigger render={<Button />}>New certificate</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {step === "type" ? (
          <>
            <DialogHeader>
              <DialogTitle>Select certificate type</DialogTitle>
              <DialogDescription>
                Choose the certificate you want to create. More types are on the way.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {CERT_TYPES.map((type) =>
                type.live ? (
                  <button
                    key={type.kind}
                    type="button"
                    onClick={() => setStep("details")}
                    className="hover:border-primary hover:bg-muted/50 focus-visible:ring-ring group flex items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Badge className={type.badgeClass}>{type.kind}</Badge>
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-medium">{type.name}</span>
                      <span className="text-muted-foreground text-xs">{type.blurb}</span>
                    </div>
                    <ChevronRight className="text-muted-foreground group-hover:text-foreground size-4" />
                  </button>
                ) : (
                  <div
                    key={type.kind}
                    aria-disabled
                    className="bg-muted/30 flex cursor-not-allowed items-center gap-3 rounded-lg border border-dashed p-3 opacity-70"
                  >
                    <Badge variant="outline" className="text-muted-foreground">
                      {type.kind}
                    </Badge>
                    <div className="flex flex-1 flex-col">
                      <span className="text-muted-foreground text-sm font-medium">{type.name}</span>
                      <span className="text-muted-foreground text-xs">{type.blurb}</span>
                    </div>
                    <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                      <Lock className="size-3" />
                      Coming soon
                    </span>
                  </div>
                )
              )}
            </div>
          </>
        ) : (
          <>
        <DialogHeader>
          <DialogTitle>Add certificate</DialogTitle>
          <DialogDescription>
            The certificate opens in the editor with these details already filled in.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-5">
          <button
            type="button"
            onClick={() => setStep("type")}
            className="text-muted-foreground hover:text-foreground -mb-1 flex items-center gap-1 self-start text-xs font-medium transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Change certificate type
          </button>

          <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-3">
            <Badge className={eicrType.badgeClass}>{eicrType.kind}</Badge>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{eicrType.name}</span>
              <span className="text-muted-foreground text-xs">{eicrType.standard}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="nc-reference">Certificate number</Label>
            <div className="flex gap-2">
              <Input
                id="nc-reference"
                name="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
                className="h-11 font-mono"
              />
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setReference(generateReference())}
              >
                <RefreshCw className="size-4" />
                Regenerate
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Letters, numbers, hyphens and underscores only.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="nc-job">Job number (optional)</Label>
            <Input id="nc-job" name="jobNumber" className="h-11" />
            <p className="text-muted-foreground text-xs">
              Shows in the footer of the certificate if provided.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Client</Label>
            <input type="hidden" name="clientMode" value={clientMode} />
            {!newClient && clientChoice !== NONE && (
              <input type="hidden" name="customerId" value={clientChoice} />
            )}
            <Select
              items={clientItems}
              value={clientChoice}
              onValueChange={(v) => {
                setClientChoice(v ?? NONE);
                if (installationChoice === CLIENT_ADDRESS) setInstallationChoice(NONE);
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No client yet</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
                <SelectItem value={NEW}>Add a new client...</SelectItem>
              </SelectContent>
            </Select>
            {newClient && (
              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="nc-client-name">Client name</Label>
                  <Input id="nc-client-name" name="clientName" required className="h-11" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="nc-client-email">Email</Label>
                    <Input id="nc-client-email" name="clientEmail" type="email" className="h-11" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="nc-client-phone">Phone</Label>
                    <Input id="nc-client-phone" name="clientPhone" className="h-11" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="nc-client-line1">Address</Label>
                  <Input
                    id="nc-client-line1"
                    name="clientLine1"
                    placeholder="Address line 1"
                    value={clientLine1}
                    onChange={(e) => setClientLine1(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input name="clientTown" placeholder="Town or city" aria-label="Town or city" className="h-11" />
                  <Input name="clientPostcode" placeholder="Postcode" aria-label="Postcode" className="h-11" />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Installation</Label>
            <input type="hidden" name="installationMode" value={installationMode} />
            {installationMode === "existing" && (
              <input type="hidden" name="propertyId" value={installationChoice} />
            )}
            <Select items={installationItems} value={installationChoice} onValueChange={(v) => setInstallationChoice(v ?? NONE)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No installation yet</SelectItem>
                {clientAddressAvailable && (
                  <SelectItem value={CLIENT_ADDRESS}>Same address as the client</SelectItem>
                )}
                {installationOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
                <SelectItem value={NEW}>Add a new installation...</SelectItem>
              </SelectContent>
            </Select>
            {installationChoice === NEW && (
              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <Input name="instLine1" placeholder="Address line 1" aria-label="Address line 1" required className="h-11" />
                <Input name="instLine2" placeholder="Address line 2 (optional)" aria-label="Address line 2" className="h-11" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input name="instTown" placeholder="Town or city" aria-label="Town or city" className="h-11" />
                  <Input name="instPostcode" placeholder="Postcode" aria-label="Postcode" className="h-11" />
                </div>
                <Input name="instUprn" placeholder="UPRN (optional)" aria-label="UPRN" className="h-11" />
              </div>
            )}
          </div>

          {showAssignment && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Assigned engineer</Label>
                <Select items={memberItems} name="assignedTo" defaultValue={currentUserId}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showQs && (
                <div className="flex flex-col gap-2">
                  <Label>QS reviewer</Label>
                  <Select
                    items={qsItems}
                    name="qsMember"
                    defaultValue={
                      qsCandidates.some((m) => m.id === currentUserId)
                        ? currentUserId
                        : qsCandidates[0].id
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {qsCandidates.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={pending} className="h-11">
            {pending ? "Creating" : "Create certificate"}
          </Button>
        </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

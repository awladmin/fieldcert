import { requireOrg } from "@/lib/auth";
import { OrgSettings } from "@/components/org-settings";
import { BrandingCard, type BrandingValues } from "@/components/branding-card";
import { EquipmentCard, type EquipmentRow } from "@/components/equipment-card";
import { SignatureCard } from "@/components/signature-card";
import type { OrgBranding } from "@/lib/pdf/branding";

export const metadata = { title: "Settings" };

const HOUR = 60 * 60;

export default async function SettingsPage() {
  const { supabase, user, org } = await requireOrg();
  const isAdmin = org.role === "admin";

  const [{ data: orgRow }, { data: profile }, { data: equipmentRows }] = await Promise.all([
    supabase.from("orgs").select("branding").eq("id", org.orgId).single(),
    supabase.from("profiles").select("signature_path").eq("id", user.id).single(),
    supabase
      .from("org_equipment")
      .select("id, kind, name, serial, calibration_due")
      .eq("org_id", org.orgId)
      .order("kind"),
  ]);

  const branding = (orgRow?.branding ?? {}) as OrgBranding;
  const signedUrl = async (path: string | null | undefined) => {
    if (!path) return null;
    const { data } = await supabase.storage.from("fieldcert").createSignedUrl(path, HOUR);
    return data?.signedUrl ?? null;
  };
  const [logoUrl, schemeLogoUrl, signatureUrl] = await Promise.all([
    signedUrl(branding.logoPath),
    signedUrl(branding.schemeLogoPath),
    signedUrl(profile?.signature_path),
  ]);

  const brandingValues: BrandingValues = {
    color: branding.color ?? "",
    enrolmentNumber: branding.enrolmentNumber ?? "",
    address: branding.address ?? "",
    phone: branding.phone ?? "",
    website: branding.website ?? "",
    logoUrl,
    schemeLogoUrl,
  };

  const equipment: EquipmentRow[] = (equipmentRows ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    serial: row.serial,
    calibrationDue: row.calibration_due,
  }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SignatureCard currentSignatureUrl={signatureUrl} />
      <EquipmentCard equipment={equipment} />
      {isAdmin && <BrandingCard initial={brandingValues} />}
      {isAdmin && (
        <OrgSettings
          orgName={org.orgName}
          qsApprovalRequired={org.qsApprovalRequired}
          plan={org.plan}
          seats={org.seats}
          accountType={org.accountType}
          subscriptionStatus={org.subscriptionStatus}
          trialEndsAt={org.trialEndsAt}
        />
      )}
    </div>
  );
}

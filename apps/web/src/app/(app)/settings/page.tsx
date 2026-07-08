import { requireAdmin } from "@/lib/auth";
import { OrgSettings } from "@/components/org-settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { org } = await requireAdmin();

  return (
    <OrgSettings
      orgName={org.orgName}
      qsApprovalRequired={org.qsApprovalRequired}
      plan={org.plan}
      seats={org.seats}
      accountType={org.accountType}
      subscriptionStatus={org.subscriptionStatus}
      trialEndsAt={org.trialEndsAt}
    />
  );
}

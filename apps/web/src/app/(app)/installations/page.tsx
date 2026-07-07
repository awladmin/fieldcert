import { requireOrg } from "@/lib/auth";
import { InstallationsManager, type InstallationRow } from "@/components/installations-manager";

export const metadata = { title: "Installations | FieldCert" };

interface StoredAddress {
  line1?: string;
  line2?: string;
  town?: string;
  postcode?: string;
}

export default async function InstallationsPage() {
  const { supabase, org } = await requireOrg();
  const [{ data: properties }, { data: customers }, { data: certs }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, address, customer_id, customers(name)")
      .eq("org_id", org.orgId)
      .order("created_at", { ascending: false }),
    supabase.from("customers").select("id, name").eq("org_id", org.orgId).order("name"),
    supabase.from("certificates").select("property_id").eq("org_id", org.orgId),
  ]);

  const certificateCounts = new Map<string, number>();
  for (const c of certs ?? []) {
    if (c.property_id) {
      certificateCounts.set(c.property_id, (certificateCounts.get(c.property_id) ?? 0) + 1);
    }
  }

  const installations: InstallationRow[] = (properties ?? []).map((p) => {
    const address = (p.address ?? {}) as StoredAddress;
    return {
      id: p.id,
      addressLabel: [address.line1, address.town, address.postcode].filter(Boolean).join(", ") || "(no address)",
      line1: address.line1 ?? "",
      line2: address.line2 ?? "",
      town: address.town ?? "",
      postcode: address.postcode ?? "",
      customerId: p.customer_id ?? "",
      clientName: p.customers?.name ?? "",
      certificateCount: certificateCounts.get(p.id) ?? 0,
    };
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <InstallationsManager installations={installations} clients={customers ?? []} />
    </div>
  );
}

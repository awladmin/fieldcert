import { requireOrg } from "@/lib/auth";
import { ClientsManager, type ClientRow } from "@/components/clients-manager";

export const metadata = { title: "Clients" };

interface StoredAddress {
  line1?: string;
  line2?: string;
  town?: string;
  postcode?: string;
}

function addressLabel(address: StoredAddress | null): string {
  if (!address?.line1) return "";
  return [address.line1, address.town, address.postcode].filter(Boolean).join(", ");
}

export default async function ClientsPage() {
  const { supabase, org } = await requireOrg();
  const [{ data: customers }, { data: properties }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone, address")
      .eq("org_id", org.orgId)
      .order("name"),
    supabase.from("properties").select("customer_id").eq("org_id", org.orgId),
  ]);

  const installationCounts = new Map<string, number>();
  for (const p of properties ?? []) {
    if (p.customer_id) {
      installationCounts.set(p.customer_id, (installationCounts.get(p.customer_id) ?? 0) + 1);
    }
  }

  const clients: ClientRow[] = (customers ?? []).map((c) => {
    const address = (c.address ?? {}) as StoredAddress;
    return {
      id: c.id,
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      addressLabel: addressLabel(address),
      line1: address.line1 ?? "",
      line2: address.line2 ?? "",
      town: address.town ?? "",
      postcode: address.postcode ?? "",
      installationCount: installationCounts.get(c.id) ?? 0,
    };
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <ClientsManager clients={clients} />
    </div>
  );
}

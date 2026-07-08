/**
 * Companies House lookup: suggests the registered company from the user's
 * email domain, the trick that makes onboarding feel like magic. Needs
 * COMPANIES_HOUSE_API_KEY (free, register at developer.company-information.service.gov.uk);
 * silently disabled when absent.
 */
export interface CompanySuggestion {
  name: string;
  address: string;
}

const GENERIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "outlook.co.uk",
  "yahoo.com",
  "yahoo.co.uk",
  "icloud.com",
  "live.com",
  "live.co.uk",
  "btinternet.com",
  "aol.com",
  "sky.com",
  "talktalk.net",
]);

export async function suggestCompanyFromEmail(email: string): Promise<CompanySuggestion | null> {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) return null;

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain || GENERIC_DOMAINS.has(domain)) return null;
  const query = domain.split(".")[0]!.replace(/[-_]/g, " ").trim();
  if (query.length < 3) return null;

  try {
    const res = await fetch(
      `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(query)}&items_per_page=1`,
      {
        headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      items?: Array<{ title?: string; address_snippet?: string; company_status?: string }>;
    };
    const item = json.items?.[0];
    if (!item?.title || item.company_status !== "active") return null;
    return { name: titleCase(item.title), address: item.address_snippet ?? "" };
  } catch {
    return null;
  }
}

/** Companies House returns names in caps; certificates deserve better. */
function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => (word === "ltd" ? "Ltd" : word === "llp" ? "LLP" : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

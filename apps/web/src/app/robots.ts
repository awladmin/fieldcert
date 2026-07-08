import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The product lives behind auth; keep crawlers on the marketing pages.
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/certificates",
          "/clients",
          "/installations",
          "/team",
          "/settings",
          "/developers",
          "/onboarding",
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: "https://fieldcert.co.uk/sitemap.xml",
  };
}

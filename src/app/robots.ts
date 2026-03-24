import type { MetadataRoute } from "next";
import { getInstanceIdentity } from "@/lib/config/instance";

export default function robots(): MetadataRoute.Robots {
  const identity = getInstanceIdentity();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/library", "/library/"],
        disallow: ["/api/", "/login", "/register", "/profile"],
      },
    ],
    sitemap: `https://${identity.domain}/sitemap.xml`,
  };
}

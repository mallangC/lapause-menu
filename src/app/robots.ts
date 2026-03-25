import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/*/admin", "/*/admin/", "/setup", "/api/"],
      },
    ],
    sitemap: "https://www.flo-aide.com/sitemap.xml",
  };
}

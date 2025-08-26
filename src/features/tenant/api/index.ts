function getTenantId(req: Request){
  const h = req.headers;
  const t = h.get("x-tenant-id");
  if (t) return t;
  const host = h.get("host") ?? "";
  const sub = host.split(".")[0];
  if (sub && sub !== "www" && sub !== "localhost") return sub;
  const url = new URL(req.url);
  return url.searchParams.get("tenant") ?? "public"; // fallback
}


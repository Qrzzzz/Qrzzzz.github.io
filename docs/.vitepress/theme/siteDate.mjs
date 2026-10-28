const formatter = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Shanghai"
});

// Editorial day-only dates stay on their original day in every visitor timezone.
export function formatSiteDate(value) {
  if (value == null || value === "") return "";
  const date = new Date(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00+08:00` : value);
  return Number.isFinite(date.getTime()) ? formatter.format(date) : "";
}

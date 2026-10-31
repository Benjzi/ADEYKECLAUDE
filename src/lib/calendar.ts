type CalEvent = {
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description: string | null;
};

const stamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const range = (e: CalEvent) => {
  const s = new Date(e.starts_at);
  const t = e.ends_at ? new Date(e.ends_at) : new Date(s.getTime() + 2 * 60 * 60 * 1000);
  return [s, t] as const;
};

export function googleCalendarUrl(e: CalEvent): string {
  const [s, t] = range(e);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(s)}/${stamp(t)}`,
    details: e.description ?? "",
    location: e.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

const esc = (v: string) =>
  v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Downloads an .ics file (works with Apple/Outlook/any calendar app). */
export function downloadIcs(e: CalEvent, slug: string) {
  const [s, t] = range(e);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Adey CP//Events//EN",
    "BEGIN:VEVENT",
    `UID:${slug}@adeycpca.org`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(s)}`,
    `DTEND:${stamp(t)}`,
    `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : "",
    e.description ? `DESCRIPTION:${esc(e.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  a.download = `${slug}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

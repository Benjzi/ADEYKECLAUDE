import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-shim";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { listAllEvents, getEventById, saveEvent, deleteEvent } from "@/lib/cms-admin";
import { MediaUpload, slugify } from "@/components/admin/MediaUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const listQuery = queryOptions({
  queryKey: ["admin", "events", "list"],
  queryFn: () => listAllEvents(),
});

export const Route = createFileRoute("/_authenticated/aleka/events")({
  loader: ({ context }) => context.queryClient.ensureQueryData(listQuery),
  component: EventsAdmin,
  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">{error.message}</div>
  ),
});

function EventsAdmin() {
  const qc = useQueryClient();
  const { data: items } = useSuspenseQuery(listQuery);
  const [editor, setEditor] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const del = useServerFn(deleteEvent);
  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Event deleted");
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Events</h2>
          <p className="text-sm text-muted-foreground">Create, edit, publish upcoming and past events.</p>
        </div>
        <Button onClick={() => setEditor({ open: true, id: null })}><Plus className="mr-2 h-4 w-4" /> New event</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {items.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No events yet. Click <strong>New event</strong> to create the first one.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/60 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Where</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((n) => (
                <tr key={n.id} className="text-sm">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{n.title}</div>
                    <div className="text-xs text-muted-foreground">/events/{n.slug}</div>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={n.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(n.starts_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.location ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditor({ open: true, id: n.id })}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete event?</AlertDialogTitle>
                            <AlertDialogDescription>This permanently deletes "{n.title}".</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMut.mutate(n.id)} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editor.open ? <EventEditor key={editor.id ?? "new"} id={editor.id} onClose={() => setEditor({ open: false, id: null })} /> : null}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = { published: "bg-emerald-100 text-emerald-800", draft: "bg-muted text-body", scheduled: "bg-amber-100 text-amber-800" };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

function EventEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const detail = useSuspenseQuery(queryOptions({
    queryKey: ["admin", "events", "detail", id ?? "new"],
    queryFn: async () => (id ? await getEventById({ data: { id } }) : null),
  }));
  const save = useServerFn(saveEvent);
  const [form, setForm] = useState(() => defaultForm(detail.data));
  const [slugTouched, setSlugTouched] = useState(false);

  const saveMut = useMutation({
    mutationFn: () => save({ data: form as any }),
    onSuccess: () => {
      toast.success(id ? "Event updated" : "Event created");
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader><SheetTitle>{id ? "Edit event" : "New event"}</SheetTitle></SheetHeader>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); saveMut.mutate(); }}>
          <div>
            <Label>Title</Label>
            <Input required value={form.title} onChange={(e) => {
              const v = e.target.value;
              setForm((f) => ({ ...f, title: v, slug: slugTouched ? f.slug : slugify(v) }));
            }} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input required value={form.slug} onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value })); }} />
          </div>
          <div>
            <Label>Cover image</Label>
            <MediaUpload folder="events" value={form.cover_image_url} onChange={(url) => setForm((f) => ({ ...f, cover_image_url: url }))} />
          </div>
          <div>
            <Label>Short description</Label>
            <Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))} />
          </div>
          <div>
            <Label>Details (Markdown)</Label>
            <Textarea rows={10} className="font-mono text-sm" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Starts at</Label>
              <Input required type="datetime-local" value={form.starts_at ? toLocalInput(form.starts_at) : ""}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: fromLocalInput(e.target.value) ?? "" }))} />
            </div>
            <div>
              <Label>Ends at (optional)</Label>
              <Input type="datetime-local" value={form.ends_at ? toLocalInput(form.ends_at) : ""}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: fromLocalInput(e.target.value) }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Location</Label>
              <Input value={form.location ?? ""} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value || null }))} />
            </div>
            <div>
              <Label>RSVP URL</Label>
              <Input placeholder="https://…" value={form.rsvp_url ?? ""} onChange={(e) => setForm((f) => ({ ...f, rsvp_url: e.target.value || null }))} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function defaultForm(row: any | null) {
  return {
    id: row?.id as string | undefined,
    title: row?.title ?? "",
    slug: row?.slug ?? "",
    description: row?.description ?? "",
    body: row?.body ?? "",
    cover_image_url: (row?.cover_image_url ?? null) as string | null,
    location: row?.location ?? "",
    starts_at: (row?.starts_at ?? new Date().toISOString()) as string,
    ends_at: (row?.ends_at ?? null) as string | null,
    rsvp_url: row?.rsvp_url ?? "",
    status: (row?.status ?? "draft") as "draft" | "scheduled" | "published",
    published_at: (row?.published_at ?? null) as string | null,
  };
}
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string) { if (!v) return null; return new Date(v).toISOString(); }

import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-shim";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { listAllNews, getNewsById, saveNews, deleteNews } from "@/lib/cms-admin";
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
  queryKey: ["admin", "news", "list"],
  queryFn: () => listAllNews(),
});

export const Route = createFileRoute("/_authenticated/aleka/news")({
  loader: ({ context }) => context.queryClient.ensureQueryData(listQuery),
  component: NewsAdmin,
  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">
      {error.message}
    </div>
  ),
});

type EditorState = { open: boolean; id: string | null };

function NewsAdmin() {
  const qc = useQueryClient();
  const { data: items } = useSuspenseQuery(listQuery);
  const [editor, setEditor] = useState<EditorState>({ open: false, id: null });
  const del = useServerFn(deleteNews);
  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Article deleted");
      qc.invalidateQueries({ queryKey: ["admin", "news"] });
      qc.invalidateQueries({ queryKey: ["news"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const counts = {
    published: items.filter((n: any) => n.status === "published").length,
    draft: items.filter((n: any) => n.status === "draft").length,
    scheduled: items.filter((n: any) => n.status === "scheduled").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">News</h2>
          <p className="text-sm text-muted-foreground">Create, edit, publish, and unpublish articles.</p>
        </div>
        <Button onClick={() => setEditor({ open: true, id: null })}>
          <Plus className="mr-2 h-4 w-4" /> New article
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-2xl font-bold text-emerald-700">{counts.published}</div>
          <div className="text-xs text-muted-foreground">Published</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-2xl font-bold text-amber-700">{counts.scheduled}</div>
          <div className="text-xs text-muted-foreground">Scheduled</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-2xl font-bold text-muted-foreground">{counts.draft}</div>
          <div className="text-xs text-muted-foreground">Drafts</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {items.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No articles yet. Click <strong>New article</strong> to create the first one.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/60 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((n) => (
                <tr key={n.id} className="text-sm">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{n.title}</div>
                    <div className="text-xs text-muted-foreground">/news/{n.slug}</div>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={n.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{n.category ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(n.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditor({ open: true, id: n.id })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete article?</AlertDialogTitle>
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

      {editor.open ? (
        <NewsEditor key={editor.id ?? "new"} id={editor.id} onClose={() => setEditor({ open: false, id: null })} />
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-800",
    draft: "bg-muted text-body",
    scheduled: "bg-amber-100 text-amber-800",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

function NewsEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const detail = useSuspenseQuery(
    queryOptions({
      queryKey: ["admin", "news", "detail", id ?? "new"],
      queryFn: async () => (id ? await getNewsById({ data: { id } }) : null),
    }),
  );
  const save = useServerFn(saveNews);
  const [form, setForm] = useState(() => defaultForm(detail.data));
  const [slugTouched, setSlugTouched] = useState(false);

  const saveMut = useMutation({
    mutationFn: () => save({ data: form as any }),
    onSuccess: () => {
      toast.success(id ? "Article updated" : "Article created");
      qc.invalidateQueries({ queryKey: ["admin", "news"] });
      qc.invalidateQueries({ queryKey: ["news"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader><SheetTitle>{id ? "Edit article" : "New article"}</SheetTitle></SheetHeader>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); saveMut.mutate(); }}>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={form.title} onChange={(e) => {
              const v = e.target.value;
              setForm((f) => ({ ...f, title: v, slug: slugTouched ? f.slug : slugify(v) }));
            }} />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" required value={form.slug} onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value })); }} />
          </div>
          <div>
            <Label>Cover image</Label>
            <MediaUpload folder="news" value={form.cover_image_url} onChange={(url) => setForm((f) => ({ ...f, cover_image_url: url }))} />
          </div>
          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea id="excerpt" rows={2} value={form.excerpt ?? ""} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value || null }))} />
          </div>
          <div>
            <Label htmlFor="body">Body (Markdown)</Label>
            <Textarea id="body" rows={12} className="font-mono text-sm" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={form.category ?? ""} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value || null }))} />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" value={form.tags.join(", ")} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            {form.status === "scheduled" ? (
              <div>
                <Label htmlFor="pub">Publish at</Label>
                <Input id="pub" type="datetime-local" value={form.published_at ? toLocalInput(form.published_at) : ""}
                  onChange={(e) => setForm((f) => ({ ...f, published_at: fromLocalInput(e.target.value) }))} />
              </div>
            ) : null}
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
    excerpt: row?.excerpt ?? "",
    body: row?.body ?? "",
    cover_image_url: (row?.cover_image_url ?? null) as string | null,
    category: row?.category ?? "",
    tags: (row?.tags ?? []) as string[],
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

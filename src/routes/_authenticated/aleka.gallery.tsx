import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-shim";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, FolderOpen, Upload, Loader2, ImagePlus } from "lucide-react";
import {
  listAllGallery, saveGalleryItem, deleteGalleryItem, reorderGallery,
  listGalleryCategories, saveGalleryCategory, deleteGalleryCategory,
  uploadMedia, listAllEvents, listAllNews,
} from "@/lib/cms-admin";
import { MediaUpload, slugify } from "@/components/admin/MediaUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


const itemsQuery = queryOptions({ queryKey: ["admin", "gallery", "items"], queryFn: () => listAllGallery() });
const catsQuery = queryOptions({ queryKey: ["admin", "gallery", "cats"], queryFn: () => listGalleryCategories() });
const eventsQuery = queryOptions({ queryKey: ["admin", "gallery", "events"], queryFn: () => listAllEvents() });
const newsQuery = queryOptions({ queryKey: ["admin", "gallery", "news"], queryFn: () => listAllNews() });

export const Route = createFileRoute("/_authenticated/aleka/gallery")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(itemsQuery),
      context.queryClient.ensureQueryData(catsQuery),
      context.queryClient.ensureQueryData(eventsQuery),
      context.queryClient.ensureQueryData(newsQuery),
    ]);
  },
  component: GalleryAdmin,
  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">{error.message}</div>
  ),
});

function GalleryAdmin() {
  const qc = useQueryClient();
  const { data: items } = useSuspenseQuery(itemsQuery);
  const { data: cats } = useSuspenseQuery(catsQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: news } = useSuspenseQuery(newsQuery);
  const [editor, setEditor] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const del = useServerFn(deleteGalleryItem);
  const reorder = useServerFn(reorderGallery);

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["admin", "gallery"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      qc.invalidateQueries({ queryKey: ["public", "gallery"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function move(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= items.length) return;
    const a = items[idx], b = items[next];
    await reorder({ data: { orders: [{ id: a.id, sort_order: next }, { id: b.id, sort_order: idx }] } });
    qc.invalidateQueries({ queryKey: ["admin", "gallery", "items"] });
    qc.invalidateQueries({ queryKey: ["public", "gallery"] });
  }

  const upload = useServerFn(uploadMedia);
  const save = useServerFn(saveGalleryItem);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [bulkBusy, setBulkBusy] = useState<{ done: number; total: number } | null>(null);
  const [targetAlbum, setTargetAlbum] = useState<string>("none");
  const [dragOver, setDragOver] = useState(false);

  async function fileToBase64(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  async function handleBulk(files: FileList | null) {
    if (!files || files.length === 0) return;
    let arr = Array.from(files).filter((f) => f.type.startsWith("image/") && f.size <= 8 * 1024 * 1024);
    if (arr.length === 0) { toast.error("Choose image files under 8 MB each"); return; }
    if (arr.length > 100) {
      toast.warning("Only the first 100 photos in this batch will be uploaded.");
      arr = arr.slice(0, 100);
    }
    setBulkBusy({ done: 0, total: arr.length });
    let success = 0;
    for (let i = 0; i < arr.length; i++) {
      try {
        const f = arr[i];
        const base64 = await fileToBase64(f);
        const up = await upload({ data: { folder: "gallery", filename: f.name, contentType: f.type, base64 } });
        await save({ data: {
          title: null, caption: null, image_url: up.url,
          category_id: targetAlbum === "none" ? null : targetAlbum,
          sort_order: items.length + i, status: "published",
        } as any });
        success++;
      } catch (e: any) {
        toast.error(`Failed: ${arr[i].name}`);
      }
      setBulkBusy({ done: i + 1, total: arr.length });
    }
    setBulkBusy(null);
    if (success > 0) toast.success(`Uploaded ${success} photo${success === 1 ? "" : "s"}`);
    qc.invalidateQueries({ queryKey: ["admin", "gallery"] });
    qc.invalidateQueries({ queryKey: ["public", "gallery"] });
  }

  const [quickNaming, setQuickNaming] = useState(false);
  const [quickName, setQuickName] = useState("");
  const saveCat = useServerFn(saveGalleryCategory);
  const [creatingAlbum, setCreatingAlbum] = useState(false);

  async function createQuickAlbum() {
    const name = quickName.trim();
    if (!name) { toast.error("Give the album a title"); return; }
    setCreatingAlbum(true);
    try {
      const row: any = await saveCat({ data: { name, slug: slugify(name), sort_order: cats.length } });
      qc.invalidateQueries({ queryKey: ["admin", "gallery", "cats"] });
      setTargetAlbum(row.id);
      setQuickNaming(false);
      setQuickName("");
      toast.success(`Album "${name}" created — now choose your photos`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not create album");
    } finally {
      setCreatingAlbum(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Gallery</h2>
          <p className="text-sm text-muted-foreground">Organize photos into albums, upload in bulk (up to 100 at once), reorder, and publish.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AlbumsDialog cats={cats} events={events} news={news} />
          <Button onClick={() => setEditor({ open: true, id: null })}><Plus className="mr-2 h-4 w-4" /> Single photo</Button>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleBulk(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition sm:flex-row sm:justify-between sm:text-left ${
          dragOver ? "border-primary bg-primary-soft/50" : "border-border bg-card"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ImagePlus className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Drag &amp; drop photos here, or choose files</div>
            <div className="text-xs text-muted-foreground">Up to 100 images at once · 8&nbsp;MB each · all land in the selected album</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {quickNaming ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                placeholder="New album title…"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createQuickAlbum(); } if (e.key === "Escape") setQuickNaming(false); }}
                className="w-44"
              />
              <Button size="sm" disabled={creatingAlbum} onClick={createQuickAlbum}>{creatingAlbum ? "…" : "Create"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setQuickNaming(false)}>Cancel</Button>
            </div>
          ) : (
            <Select value={targetAlbum} onValueChange={(v) => { if (v === "__new") setQuickNaming(true); else setTargetAlbum(v); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Album" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {cats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                <SelectItem value="__new">+ New album…</SelectItem>
              </SelectContent>
            </Select>
          )}
          <input
            ref={bulkInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { handleBulk(e.target.files); e.target.value = ""; }}
          />
          <Button variant="outline" disabled={!!bulkBusy || quickNaming} onClick={() => bulkInputRef.current?.click()}>
            {bulkBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {bulkBusy ? `Uploading ${bulkBusy.done}/${bulkBusy.total}…` : "Choose files"}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          No photos yet. Click <strong>Upload photo</strong> to add the first one.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((it, idx) => {
            const cat = cats.find((c) => c.id === it.category_id);
            return (
              <div key={it.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
                <div className="relative aspect-square">
                  <img src={it.image_url} alt={it.title ?? ""} className="h-full w-full object-cover" />
                  <div className="absolute right-1 top-1 flex gap-1">
                    <StatusPill status={it.status} />
                  </div>
                  <div className="absolute bottom-1 left-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button className="rounded-md bg-black/70 p-1 text-white" onClick={() => move(idx, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button className="rounded-md bg-black/70 p-1 text-white" onClick={() => move(idx, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-semibold">{it.title ?? "Untitled"}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{cat?.name ?? "Uncategorized"}</div>
                  <div className="mt-2 flex justify-between">
                    <Button size="sm" variant="ghost" onClick={() => setEditor({ open: true, id: it.id })}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove photo?</AlertDialogTitle>
                          <AlertDialogDescription>This deletes the item permanently.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMut.mutate(it.id)} className="bg-destructive text-white">Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editor.open ? <ItemEditor key={editor.id ?? "new"} id={editor.id} items={items} cats={cats} onClose={() => setEditor({ open: false, id: null })} /> : null}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = { published: "bg-emerald-500 text-white", draft: "bg-black/70 text-white", scheduled: "bg-amber-500 text-white" };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

function ItemEditor({ id, items, cats, onClose }: { id: string | null; items: any[]; cats: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const row = id ? items.find((i) => i.id === id) : null;
  const save = useServerFn(saveGalleryItem);
  const [form, setForm] = useState({
    id: row?.id as string | undefined,
    title: row?.title ?? "",
    caption: row?.caption ?? "",
    image_url: (row?.image_url ?? "") as string,
    category_id: (row?.category_id ?? null) as string | null,
    sort_order: (row?.sort_order ?? items.length) as number,
    status: (row?.status ?? "published") as "draft" | "scheduled" | "published",
  });

  const saveMut = useMutation({
    mutationFn: () => save({ data: { ...form, title: form.title || null, caption: form.caption || null } as any }),
    onSuccess: () => {
      toast.success(id ? "Photo updated" : "Photo added");
      qc.invalidateQueries({ queryKey: ["admin", "gallery"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      qc.invalidateQueries({ queryKey: ["public", "gallery"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{id ? "Edit photo" : "New photo"}</SheetTitle></SheetHeader>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); if (!form.image_url) { toast.error("Upload an image"); return; } saveMut.mutate(); }}>
          <div>
            <Label>Image</Label>
            <MediaUpload folder="gallery" value={form.image_url || null} onChange={(url) => setForm((f) => ({ ...f, image_url: url ?? "" }))} />
          </div>
          <div>
            <Label>Title (optional)</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Caption (optional)</Label>
            <Textarea rows={2} value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category_id ?? "none"} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === "none" ? null : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

function AlbumsDialog({ cats, events, news }: { cats: any[]; events: any[]; news: any[] }) {
  const qc = useQueryClient();
  const save = useServerFn(saveGalleryCategory);
  const del = useServerFn(deleteGalleryCategory);
  const [editingId, setEditingId] = useState<string | null | "new">(null);
  const [form, setForm] = useState({ name: "", description: "", cover_image_url: "" as string | null, event_id: "none" as string, news_id: "none" as string });

  function startNew() {
    setForm({ name: "", description: "", cover_image_url: null, event_id: "none", news_id: "none" });
    setEditingId("new");
  }
  function startEdit(c: any) {
    setForm({ name: c.name, description: c.description ?? "", cover_image_url: c.cover_image_url ?? null, event_id: c.event_id ?? "none", news_id: c.news_id ?? "none" });
    setEditingId(c.id);
  }

  const saveMut = useMutation({
    mutationFn: () => save({
      data: {
        id: editingId === "new" ? undefined : editingId,
        name: form.name,
        slug: slugify(form.name),
        sort_order: cats.length,
        description: form.description || null,
        cover_image_url: form.cover_image_url,
        event_id: form.event_id === "none" ? null : form.event_id,
        news_id: form.news_id === "none" ? null : form.news_id,
      },
    }),
    onSuccess: () => {
      toast.success(editingId === "new" ? "Album created" : "Album updated");
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["admin", "gallery", "cats"] });
      qc.invalidateQueries({ queryKey: ["public", "gallery"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Album deleted"); qc.invalidateQueries({ queryKey: ["admin", "gallery"] }); qc.invalidateQueries({ queryKey: ["public", "gallery"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog onOpenChange={(open) => { if (!open) setEditingId(null); }}>
      <DialogTrigger asChild><Button variant="outline"><FolderOpen className="mr-2 h-4 w-4" /> Albums</Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Gallery albums</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {editingId ? (
            <form
              onSubmit={(e) => { e.preventDefault(); if (!form.name.trim()) { toast.error("Name required"); return; } saveMut.mutate(); }}
              className="space-y-3 rounded-xl border border-border p-4"
            >
              <div>
                <Label>Album title</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <Label>Cover image (optional — defaults to first photo)</Label>
                <MediaUpload folder="gallery" value={form.cover_image_url} onChange={(url) => setForm((f) => ({ ...f, cover_image_url: url }))} />
              </div>
              <div>
                <Label>Link to an event (optional — embeds this album on that event's page)</Label>
                <Select value={form.event_id} onValueChange={(v) => setForm((f) => ({ ...f, event_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not linked to an event</SelectItem>
                    {events.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Link to a news article (optional — shows "View Photos" on that article)</Label>
                <Select value={form.news_id} onValueChange={(v) => setForm((f) => ({ ...f, news_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not linked to a news article</SelectItem>
                    {news.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save album"}</Button>
              </div>
            </form>
          ) : (
            <Button variant="outline" className="w-full" onClick={startNew}><Plus className="mr-2 h-4 w-4" /> New album</Button>
          )}

          <ul className="divide-y divide-border rounded-lg border border-border">
            {cats.length === 0 ? (
              <li className="p-3 text-sm text-muted-foreground">No albums yet.</li>
            ) : cats.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {c.cover_image_url ? <img src={c.cover_image_url} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{c.name}</span>
                      {c.album_code ? (
                        <button
                          type="button"
                          title="Copy album ID"
                          onClick={() => { navigator.clipboard?.writeText(c.album_code); toast.success(`Copied ${c.album_code}`); }}
                          className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-primary-soft hover:text-primary"
                        >{c.album_code}</button>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{c.description || `/${c.slug}`}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {c.event_id ? (
                        <span className="inline-flex items-center rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          {events.find((e: any) => e.id === c.event_id)?.title ?? "Linked event"}
                        </span>
                      ) : null}
                      {c.news_id ? (
                        <span className="inline-flex items-center rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent-dark">
                          {news.find((n: any) => n.id === c.news_id)?.title ?? "Linked article"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => delMut.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-shim";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Upload, Loader2, ImagePlus, Pencil, Trash2, ArrowUp, ArrowDown, Settings, Copy,
} from "lucide-react";
import {
  listAllGallery, listGalleryCategories, saveGalleryItem, deleteGalleryItem, reorderGallery,
  saveGalleryCategory, uploadMedia, listAllEvents, listAllNews,
} from "@/lib/cms-admin";
import { MediaUpload } from "@/components/admin/MediaUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const itemsQuery = queryOptions({ queryKey: ["admin", "gallery", "items"], queryFn: () => listAllGallery() });
const catsQuery = queryOptions({ queryKey: ["admin", "gallery", "cats"], queryFn: () => listGalleryCategories() });
const eventsQuery = queryOptions({ queryKey: ["admin", "gallery", "events"], queryFn: () => listAllEvents() });
const newsQuery = queryOptions({ queryKey: ["admin", "gallery", "news"], queryFn: () => listAllNews() });

export const Route = createFileRoute("/_authenticated/aleka/gallery/$albumId")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(itemsQuery),
      context.queryClient.ensureQueryData(catsQuery),
      context.queryClient.ensureQueryData(eventsQuery),
      context.queryClient.ensureQueryData(newsQuery),
    ]);
  },
  component: AlbumDetail,
  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">{error.message}</div>
  ),
});

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function AlbumDetail() {
  const { albumId } = Route.useParams();
  const qc = useQueryClient();
  const { data: allItems } = useSuspenseQuery(itemsQuery);
  const { data: cats } = useSuspenseQuery(catsQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: news } = useSuspenseQuery(newsQuery);

  const isUncategorized = albumId === "uncategorized";
  const album = isUncategorized ? null : cats.find((c: any) => c.id === albumId);
  const items = allItems
    .filter((it: any) => (isUncategorized ? !it.category_id : it.category_id === albumId))
    .sort((a: any, b: any) => a.sort_order - b.sort_order);

  const upload = useServerFn(uploadMedia);
  const save = useServerFn(saveGalleryItem);
  const del = useServerFn(deleteGalleryItem);
  const reorder = useServerFn(reorderGallery);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [bulkBusy, setBulkBusy] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  async function handleBulk(files: FileList | null) {
    if (!files || files.length === 0) return;
    let arr = Array.from(files).filter((f) => f.type.startsWith("image/") && f.size <= 8 * 1024 * 1024);
    if (arr.length === 0) { toast.error("Choose image files under 8 MB each"); return; }
    if (arr.length > 100) { toast.warning("Only the first 100 photos will be uploaded."); arr = arr.slice(0, 100); }
    setBulkBusy({ done: 0, total: arr.length });
    let success = 0;
    for (let i = 0; i < arr.length; i++) {
      try {
        const f = arr[i];
        const base64 = await fileToBase64(f);
        const up = await upload({ data: { folder: "gallery", filename: f.name, contentType: f.type, base64 } });
        await save({ data: {
          title: null, caption: null, image_url: up.url,
          category_id: isUncategorized ? null : albumId,
          sort_order: items.length + i, status: "published",
        } as any });
        success++;
      } catch {
        toast.error(`Failed: ${arr[i].name}`);
      }
      setBulkBusy({ done: i + 1, total: arr.length });
    }
    setBulkBusy(null);
    if (success > 0) toast.success(`Added ${success} photo${success === 1 ? "" : "s"}`);
    qc.invalidateQueries({ queryKey: ["admin", "gallery"] });
    qc.invalidateQueries({ queryKey: ["public", "gallery"] });
  }

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Photo deleted");
      qc.invalidateQueries({ queryKey: ["admin", "gallery"] });
      qc.invalidateQueries({ queryKey: ["public", "gallery"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const moveMut = useMutation({
    mutationFn: (orders: { id: string; sort_order: number }[]) => reorder({ data: { orders } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "gallery", "items"] }),
    onError: (e: any) => toast.error(e.message),
  });

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[index], b = items[j];
    moveMut.mutate([{ id: a.id, sort_order: b.sort_order }, { id: b.id, sort_order: a.sort_order }]);
  }

  if (!isUncategorized && !album) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
        Album not found. <Link to="/aleka/gallery" className="text-primary underline">Back to Gallery</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/aleka/gallery" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> All Albums
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
              {isUncategorized ? "Uncategorized" : album.name}
              {album?.album_code ? (
                <button
                  onClick={() => { navigator.clipboard?.writeText(album.album_code); toast.success(`Copied ${album.album_code}`); }}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-normal text-muted-foreground hover:bg-primary-soft hover:text-primary"
                ><Copy className="h-3 w-3" /> {album.album_code}</button>
              ) : null}
            </h2>
            <p className="text-sm text-muted-foreground">
              {items.length} photo{items.length === 1 ? "" : "s"}{album?.description ? ` · ${album.description}` : ""}
            </p>
          </div>
          {!isUncategorized ? <FolderSettingsDialog album={album} events={events} news={news} /> : null}
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleBulk(e.dataTransfer.files); }}
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition sm:flex-row sm:justify-between sm:text-left ${dragOver ? "border-primary bg-primary-soft/50" : "border-border bg-card"}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><ImagePlus className="h-5 w-5" /></div>
          <div>
            <div className="text-sm font-semibold">Drag &amp; drop photos here, or choose files</div>
            <div className="text-xs text-muted-foreground">Up to 100 images at once · 8&nbsp;MB each</div>
          </div>
        </div>
        <input ref={bulkInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleBulk(e.target.files); e.target.value = ""; }} />
        <Button variant="outline" disabled={!!bulkBusy} onClick={() => bulkInputRef.current?.click()}>
          {bulkBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {bulkBusy ? `Uploading ${bulkBusy.done}/${bulkBusy.total}…` : "Choose files"}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">No photos in this album yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((it: any, i: number) => (
            <div key={it.id} className="group relative overflow-hidden rounded-xl border border-border bg-card">
              <img src={it.image_url} alt={it.title ?? ""} className="aspect-square w-full object-cover" />
              <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-1.5 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="secondary" className="h-7 w-7 p-0" onClick={() => setEditing(it)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => delMut.mutate(it.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="flex justify-center gap-1">
                  <Button size="sm" variant="secondary" className="h-7 w-7 p-0" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="secondary" className="h-7 w-7 p-0" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing ? <EditPhotoDialog item={editing} cats={cats} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function EditPhotoDialog({ item, cats, onClose }: { item: any; cats: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const save = useServerFn(saveGalleryItem);
  const [title, setTitle] = useState(item.title ?? "");
  const [caption, setCaption] = useState(item.caption ?? "");
  const [categoryId, setCategoryId] = useState(item.category_id ?? "none");

  const saveMut = useMutation({
    mutationFn: () => save({ data: { id: item.id, title: title || null, caption: caption || null, category_id: categoryId === "none" ? null : categoryId, image_url: item.image_url, sort_order: item.sort_order, status: "published" } as any }),
    onSuccess: () => { toast.success("Photo updated"); qc.invalidateQueries({ queryKey: ["admin", "gallery"] }); qc.invalidateQueries({ queryKey: ["public", "gallery"] }); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit photo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <img src={item.image_url} alt="" className="aspect-video w-full rounded-lg object-cover" />
          <div><Label>Title (optional)</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Caption (optional)</Label><Textarea rows={2} value={caption} onChange={(e) => setCaption(e.target.value)} /></div>
          <div>
            <Label>Move to album</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {cats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FolderSettingsDialog({ album, events, news }: { album: any; events: any[]; news: any[] }) {
  const qc = useQueryClient();
  const save = useServerFn(saveGalleryCategory);
  const [name, setName] = useState(album.name);
  const [description, setDescription] = useState(album.description ?? "");
  const [cover, setCover] = useState<string | null>(album.cover_image_url ?? null);
  const [eventId, setEventId] = useState(album.event_id ?? "none");
  const [newsId, setNewsId] = useState(album.news_id ?? "none");
  const [open, setOpen] = useState(false);

  const saveMut = useMutation({
    mutationFn: () => save({ data: { id: album.id, name, slug: album.slug, sort_order: album.sort_order, description: description || null, cover_image_url: cover, event_id: eventId === "none" ? null : eventId, news_id: newsId === "none" ? null : newsId } }),
    onSuccess: () => { toast.success("Album updated"); qc.invalidateQueries({ queryKey: ["admin", "gallery", "cats"] }); qc.invalidateQueries({ queryKey: ["public", "gallery"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Folder settings</Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Album settings</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Album title</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>Cover image</Label><MediaUpload folder="gallery" value={cover} onChange={setCover} /></div>
          <div>
            <Label>Link to an event (optional)</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked</SelectItem>
                {events.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Link to a news article (optional)</Label>
            <Select value={newsId} onValueChange={setNewsId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked</SelectItem>
                {news.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save changes"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

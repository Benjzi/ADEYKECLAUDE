import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-shim";
import { useState } from "react";
import { toast } from "sonner";
import { FolderPlus, FolderOpen, Trash2, Images } from "lucide-react";
import { listAllGallery, listGalleryCategories, saveGalleryCategory, deleteGalleryCategory } from "@/lib/cms-admin";
import { MediaUpload, slugify } from "@/components/admin/MediaUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const itemsQuery = queryOptions({ queryKey: ["admin", "gallery", "items"], queryFn: () => listAllGallery() });
const catsQuery = queryOptions({ queryKey: ["admin", "gallery", "cats"], queryFn: () => listGalleryCategories() });

export const Route = createFileRoute("/_authenticated/aleka/gallery/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(itemsQuery),
      context.queryClient.ensureQueryData(catsQuery),
    ]);
  },
  component: GalleryFolders,
  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">{error.message}</div>
  ),
});

function GalleryFolders() {
  const qc = useQueryClient();
  const { data: items } = useSuspenseQuery(itemsQuery);
  const { data: cats } = useSuspenseQuery(catsQuery);
  const del = useServerFn(deleteGalleryCategory);
  const [newOpen, setNewOpen] = useState(false);

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Album deleted (photos moved to Uncategorized)");
      qc.invalidateQueries({ queryKey: ["admin", "gallery"] });
      qc.invalidateQueries({ queryKey: ["public", "gallery"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const uncategorizedCount = items.filter((it: any) => !it.category_id).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Gallery</h2>
          <p className="text-sm text-muted-foreground">Photos live inside albums — open one to add, remove, edit, or reorder its photos.</p>
        </div>
        <NewAlbumDialog cats={cats} open={newOpen} onOpenChange={setNewOpen} />
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {cats.map((c: any) => {
          const count = items.filter((it: any) => it.category_id === c.id).length;
          return (
            <div key={c.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-card)]">
              <Link to="/aleka/gallery/$albumId" params={{ albumId: c.id }} className="block">
                <div className="relative aspect-square bg-muted">
                  {c.cover_image_url ? (
                    <img src={c.cover_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground"><FolderOpen className="h-10 w-10" /></div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                  <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                    <Images className="h-3.5 w-3.5" /> {count}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="truncate font-heading text-sm font-bold text-white">{c.name}</div>
                    {c.album_code ? <div className="font-mono text-[10px] text-white/70">{c.album_code}</div> : null}
                  </div>
                </div>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="absolute right-1.5 top-1.5 h-7 w-7 p-0 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/40 hover:text-white">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{c.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>The album is removed, but its {count} photo{count === 1 ? "" : "s"} move to Uncategorized rather than being deleted.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => delMut.mutate(c.id)} className="bg-destructive text-white">Delete album</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        })}

        <Link to="/aleka/gallery/$albumId" params={{ albumId: "uncategorized" }} className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card/50 shadow-[var(--shadow-soft)] transition hover:border-primary/40">
          <div className="flex aspect-square flex-col items-center justify-center gap-2 text-muted-foreground">
            <FolderOpen className="h-10 w-10" />
            <div className="text-sm font-semibold">Uncategorized</div>
            <div className="inline-flex items-center gap-1 text-xs"><Images className="h-3.5 w-3.5" /> {uncategorizedCount}</div>
          </div>
        </Link>

        <button
          onClick={() => setNewOpen(true)}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 text-primary transition hover:border-primary hover:bg-primary-soft/40"
        >
          <FolderPlus className="h-10 w-10" />
          <div className="text-sm font-semibold">New album</div>
        </button>
      </div>
    </div>
  );
}

function NewAlbumDialog({ cats, open, onOpenChange }: { cats: any[]; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const save = useServerFn(saveGalleryCategory);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string | null>(null);

  const saveMut = useMutation({
    mutationFn: () => save({ data: { name, slug: slugify(name), sort_order: cats.length, description: description || null, cover_image_url: cover } }),
    onSuccess: () => {
      toast.success("Album created");
      qc.invalidateQueries({ queryKey: ["admin", "gallery", "cats"] });
      setName(""); setDescription(""); setCover(null);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button><FolderPlus className="mr-2 h-4 w-4" /> New album</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create album</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) { toast.error("Name required"); return; } saveMut.mutate(); }} className="space-y-3">
          <div>
            <Label>Album title</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Cover image (optional — can set later from inside the album)</Label>
            <MediaUpload folder="gallery" value={cover} onChange={setCover} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? "Creating…" : "Create album"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

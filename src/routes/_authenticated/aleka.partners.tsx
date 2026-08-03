import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-shim";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { listAllPartners, savePartner, deletePartner } from "@/lib/cms-admin";
import { MediaUpload } from "@/components/admin/MediaUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const listQuery = queryOptions({ queryKey: ["admin", "partners"], queryFn: () => listAllPartners() });

export const Route = createFileRoute("/_authenticated/aleka/partners")({
  loader: ({ context }) => context.queryClient.ensureQueryData(listQuery),
  component: PartnersAdmin,
  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">{error.message}</div>
  ),
});

function PartnersAdmin() {
  const qc = useQueryClient();
  const { data: items } = useSuspenseQuery(listQuery);
  const [editor, setEditor] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const del = useServerFn(deletePartner);
  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Partner removed");
      qc.invalidateQueries({ queryKey: ["admin", "partners"] });
      qc.invalidateQueries({ queryKey: ["public", "partners"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Partners</h2>
          <p className="text-sm text-muted-foreground">Logos rendered on the home page's trusted-by strip.</p>
        </div>
        <Button onClick={() => setEditor({ open: true, id: null })}><Plus className="mr-2 h-4 w-4" /> Add partner</Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          No partners yet. Click <strong>Add partner</strong> to add the first one.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex h-20 items-center justify-center rounded-lg bg-muted/40">
                {p.logo_url ? <img src={p.logo_url} alt={p.name} className="max-h-full max-w-full object-contain" /> :
                  <span className="text-sm text-muted-foreground">No logo</span>}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  {p.website_url ? (
                    <a href={p.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      Visit <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditor({ open: true, id: p.id })}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {p.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This permanently deletes the partner.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMut.mutate(p.id)} className="bg-destructive text-white">Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editor.open ? <PartnerEditor key={editor.id ?? "new"} id={editor.id} items={items} onClose={() => setEditor({ open: false, id: null })} /> : null}
    </div>
  );
}

function PartnerEditor({ id, items, onClose }: { id: string | null; items: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const row = id ? items.find((i) => i.id === id) : null;
  const save = useServerFn(savePartner);
  const [form, setForm] = useState({
    id: row?.id as string | undefined,
    name: row?.name ?? "",
    logo_url: (row?.logo_url ?? null) as string | null,
    website_url: row?.website_url ?? "",
    sort_order: (row?.sort_order ?? items.length) as number,
    status: (row?.status ?? "published") as "draft" | "scheduled" | "published",
  });
  const saveMut = useMutation({
    mutationFn: () => save({ data: { ...form, website_url: form.website_url || null } as any }),
    onSuccess: () => {
      toast.success(id ? "Updated" : "Added");
      qc.invalidateQueries({ queryKey: ["admin", "partners"] });
      qc.invalidateQueries({ queryKey: ["public", "partners"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{id ? "Edit partner" : "New partner"}</SheetTitle></SheetHeader>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); saveMut.mutate(); }}>
          <div>
            <Label>Logo</Label>
            <MediaUpload folder="partners" value={form.logo_url} onChange={(url) => setForm((f) => ({ ...f, logo_url: url }))} />
          </div>
          <div>
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Website</Label>
            <Input type="url" placeholder="https://…" value={form.website_url} onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
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

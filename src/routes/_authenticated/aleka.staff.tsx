import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-shim";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { listAllStaff, saveStaff, deleteStaff } from "@/lib/cms-admin";
import { MediaUpload } from "@/components/admin/MediaUpload";
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

const listQuery = queryOptions({ queryKey: ["admin", "staff"], queryFn: () => listAllStaff() });

export const Route = createFileRoute("/_authenticated/aleka/staff")({
  loader: ({ context }) => context.queryClient.ensureQueryData(listQuery),
  component: StaffAdmin,
  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">{error.message}</div>
  ),
});

function StaffAdmin() {
  const qc = useQueryClient();
  const { data: items } = useSuspenseQuery(listQuery);
  const [editor, setEditor] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const del = useServerFn(deleteStaff);
  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Staff member removed");
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      qc.invalidateQueries({ queryKey: ["public", "staff"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff</h2>
          <p className="text-sm text-muted-foreground">Team profiles shown on the About page.</p>
        </div>
        <Button onClick={() => setEditor({ open: true, id: null })}><Plus className="mr-2 h-4 w-4" /> Add member</Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          No staff yet. Click <strong>Add member</strong> to create the first profile.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="flex gap-4">
                {s.photo_url ? <img src={s.photo_url} alt="" className="h-16 w-16 rounded-full object-cover" /> :
                  <div className="h-16 w-16 rounded-full bg-primary-soft" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{s.full_name}</div>
                  <div className="truncate text-sm text-muted-foreground">{s.role_title ?? "—"}</div>
                  <div className="mt-1 text-xs"><StatusPill status={s.status} /></div>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditor({ open: true, id: s.id })}><Pencil className="h-4 w-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove {s.full_name}?</AlertDialogTitle>
                      <AlertDialogDescription>This deletes the profile permanently.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMut.mutate(s.id)} className="bg-destructive text-white">Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {editor.open ? <StaffEditor key={editor.id ?? "new"} id={editor.id} items={items} onClose={() => setEditor({ open: false, id: null })} /> : null}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = { published: "bg-emerald-100 text-emerald-800", draft: "bg-muted text-body", scheduled: "bg-amber-100 text-amber-800" };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

function StaffEditor({ id, items, onClose }: { id: string | null; items: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const row = id ? items.find((i) => i.id === id) : null;
  const save = useServerFn(saveStaff);
  const [form, setForm] = useState({
    id: row?.id as string | undefined,
    full_name: row?.full_name ?? "",
    role_title: row?.role_title ?? "",
    bio: row?.bio ?? "",
    photo_url: (row?.photo_url ?? null) as string | null,
    email: row?.email ?? "",
    phone: row?.phone ?? "",
    sort_order: (row?.sort_order ?? items.length) as number,
    status: (row?.status ?? "published") as "draft" | "scheduled" | "published",
  });
  const saveMut = useMutation({
    mutationFn: () => save({ data: { ...form, role_title: form.role_title || null, bio: form.bio || null, email: form.email || null, phone: form.phone || null } as any }),
    onSuccess: () => {
      toast.success(id ? "Profile updated" : "Profile added");
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      qc.invalidateQueries({ queryKey: ["public", "staff"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{id ? "Edit member" : "New member"}</SheetTitle></SheetHeader>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); saveMut.mutate(); }}>
          <div>
            <Label>Photo</Label>
            <MediaUpload folder="staff" value={form.photo_url} onChange={(url) => setForm((f) => ({ ...f, photo_url: url }))} />
          </div>
          <div>
            <Label>Full name</Label>
            <Input required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <Label>Role / title</Label>
            <Input value={form.role_title} onChange={(e) => setForm((f) => ({ ...f, role_title: e.target.value }))} />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea rows={4} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
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

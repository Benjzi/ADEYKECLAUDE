import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-shim";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, ShieldCheck, Shield, Ban, RotateCcw } from "lucide-react";
import { listUsers, setUserRoles, inviteUser, deleteUser, setUserBanned } from "@/lib/cms-admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const listQuery = queryOptions({ queryKey: ["admin", "users"], queryFn: () => listUsers() });

export const Route = createFileRoute("/_authenticated/aleka/users")({
  loader: ({ context }) => context.queryClient.ensureQueryData(listQuery),
  component: UsersAdmin,
  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">
      {error.message === "Forbidden: admin role required"
        ? "Only admins can manage users."
        : error.message}
    </div>
  ),
});

function UsersAdmin() {
  const qc = useQueryClient();
  const { data: users } = useSuspenseQuery(listQuery);
  const { data: me } = useQuery({
    queryKey: ["me", "user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
    staleTime: 60_000,
  });
  const myId = me?.id ?? "";

  const setRoles = useServerFn(setUserRoles);
  const del = useServerFn(deleteUser);
  const ban = useServerFn(setUserBanned);

  const roleMut = useMutation({
    mutationFn: (v: { userId: string; roles: ("admin" | "editor")[] }) => setRoles({ data: v }),
    onSuccess: () => { toast.success("Roles updated"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); qc.invalidateQueries({ queryKey: ["me", "roles"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (userId: string) => del({ data: { userId } }),
    onSuccess: () => { toast.success("Account deleted"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const banMut = useMutation({
    mutationFn: (v: { userId: string; banned: boolean }) => ban({ data: v }),
    onSuccess: (_r, v) => { toast.success(v.banned ? "Account disabled" : "Account reactivated"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function toggle(u: (typeof users)[number], role: "admin" | "editor") {
    const current = new Set(u.roles as string[]);
    if (current.has(role)) current.delete(role); else current.add(role);
    roleMut.mutate({ userId: u.id, roles: Array.from(current) as ("admin" | "editor")[] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Users &amp; Roles</h2>
          <p className="text-sm text-muted-foreground">Grant admin or editor access. Admin-only page.</p>
        </div>
        <InviteDialog />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full">
          <thead className="bg-muted/60 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Last sign-in</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="text-sm">
                <td className="px-4 py-3">
                  <div className="font-semibold">{u.email}</div>
                  {u.id === myId ? <div className="text-xs text-muted-foreground">You</div> : null}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex items-center gap-2">
                      <Checkbox checked={u.roles.includes("admin")} onCheckedChange={() => toggle(u, "admin")} />
                      <span className="inline-flex items-center gap-1 text-xs font-semibold"><ShieldCheck className="h-3.5 w-3.5" /> Admin</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <Checkbox checked={u.roles.includes("editor")} onCheckedChange={() => toggle(u, "editor")} />
                      <span className="inline-flex items-center gap-1 text-xs font-semibold"><Shield className="h-3.5 w-3.5" /> Editor</span>
                    </label>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "Never"}
                </td>
                <td className="px-4 py-3">
                  {u.banned ? (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">Disabled</span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id !== myId ? (
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title={u.banned ? "Reactivate account" : "Disable account"}
                        onClick={() => banMut.mutate({ userId: u.id, banned: !u.banned })}
                      >
                        {u.banned ? <RotateCcw className="h-4 w-4 text-emerald-700" /> : <Ban className="h-4 w-4 text-amber-600" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete account?</AlertDialogTitle>
                            <AlertDialogDescription>This permanently removes {u.email} and revokes their access.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-white" onClick={() => delMut.mutate(u.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InviteDialog() {
  const qc = useQueryClient();
  const invite = useServerFn(inviteUser);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", isAdmin: false, isEditor: true });
  const mut = useMutation({
    mutationFn: () => invite({
      data: {
        email: form.email,
        password: form.password,
        fullName: form.fullName || undefined,
        roles: [form.isAdmin ? "admin" as const : null, form.isEditor ? "editor" as const : null].filter(Boolean) as ("admin" | "editor")[],
      },
    }),
    onSuccess: () => {
      toast.success(`Invited ${form.email}. Share the password securely.`);
      setForm({ email: "", password: "", fullName: "", isAdmin: false, isEditor: true });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><UserPlus className="mr-2 h-4 w-4" /> Invite user</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite a new user</DialogTitle></DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!form.isAdmin && !form.isEditor) { toast.error("Pick at least one role"); return; }
          mut.mutate();
        }} className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <Label>Full name (optional)</Label>
            <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input required type="text" minLength={10} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <p className="mt-1 text-xs text-muted-foreground">Share this once via a secure channel. User can change it after sign-in.</p>
          </div>
          <div className="flex gap-4">
            <label className="inline-flex items-center gap-2">
              <Checkbox checked={form.isAdmin} onCheckedChange={(v) => setForm((f) => ({ ...f, isAdmin: !!v }))} />
              <span className="text-sm">Admin</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <Checkbox checked={form.isEditor} onCheckedChange={(v) => setForm((f) => ({ ...f, isEditor: !!v }))} />
              <span className="text-sm">Editor</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Creating…" : "Create user"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

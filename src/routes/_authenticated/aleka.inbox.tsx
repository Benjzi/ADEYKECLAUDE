import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Trash2, Eye, EyeOff } from "lucide-react";
import { listContactMessages, markMessageRead, deleteContactMessage, type ContactMessage } from "@/lib/cms-admin";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const listQuery = queryOptions({ queryKey: ["admin", "contact-messages"], queryFn: () => listContactMessages() });

export const Route = createFileRoute("/_authenticated/aleka/inbox")({
  loader: ({ context }) => context.queryClient.ensureQueryData(listQuery),
  component: Inbox,
  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">{error.message}</div>
  ),
});

function Inbox() {
  const qc = useQueryClient();
  const { data: messages } = useSuspenseQuery(listQuery);
  const [selected, setSelected] = useState<ContactMessage | null>(messages[0] ?? null);

  const readMut = useMutation({
    mutationFn: (v: { id: string; is_read: boolean }) => markMessageRead({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "contact-messages"] }); qc.invalidateQueries({ queryKey: ["admin", "stats"] }); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteContactMessage({ data: { id } }),
    onSuccess: () => {
      toast.success("Message deleted");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["admin", "contact-messages"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function open(m: ContactMessage) {
    setSelected(m);
    if (!m.is_read) readMut.mutate({ id: m.id, is_read: true });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contact Inbox</h2>
          <p className="text-sm text-muted-foreground">Messages sent from the public contact form.</p>
        </div>
        <div className="text-xs text-muted-foreground">{messages.length} total · {messages.filter((m) => !m.is_read).length} unread</div>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
          <div className="mt-3 font-heading text-lg text-ink">No messages yet</div>
          <p className="mt-1 text-sm">Messages from the public contact form will show up here.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <ul className="max-h-[70vh] overflow-y-auto divide-y divide-border rounded-2xl border border-border bg-card">
            {messages.map((m) => {
              const active = selected?.id === m.id;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => open(m)}
                    className={`block w-full text-left p-4 transition ${active ? "bg-primary-soft" : "hover:bg-muted/40"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {!m.is_read ? <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}
                        <div className="truncate font-semibold text-ink">{m.name}</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground shrink-0">{new Date(m.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{m.email}</div>
                    {m.subject ? <div className="mt-1 truncate text-xs font-semibold text-primary">{m.subject}</div> : null}
                    <div className="mt-1 line-clamp-2 text-sm text-body">{m.message}</div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="rounded-2xl border border-border bg-card p-6">
            {selected ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-xl font-bold text-ink">{selected.subject || "(No subject)"}</h3>
                    <div className="mt-1 text-sm text-body">
                      From <span className="font-semibold">{selected.name}</span> &lt;<a href={`mailto:${selected.email}`} className="text-primary hover:underline">{selected.email}</a>&gt;
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => readMut.mutate({ id: selected.id, is_read: !selected.is_read })}>
                      {selected.is_read ? <><EyeOff className="mr-1.5 h-4 w-4" /> Mark unread</> : <><Eye className="mr-1.5 h-4 w-4" /> Mark read</>}
                    </Button>
                    <a href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject || "your message"}`)}`} className="btn-primary text-sm">
                      <Mail className="h-4 w-4" /> Reply
                    </a>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                          <AlertDialogDescription>This permanently removes the message.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-white" onClick={() => delMut.mutate(selected.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="mt-6 whitespace-pre-wrap rounded-xl bg-muted/40 p-5 text-sm leading-relaxed text-body">{selected.message}</div>
              </>
            ) : (
              <div className="py-16 text-center text-muted-foreground">Select a message to read.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import "./styles.css";
import { routeTree } from "./routeTree.gen";
import logo from "@/assets/adey-logo.png";

// After a new deploy, a tab that was already open still points at the old
// hashed files, which no longer exist ("Importing a module script failed").
// Reload once to pick up the new version; the flag stops any reload loop.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  try {
    const last = Number(sessionStorage.getItem("adeycp-chunk-reload") || 0);
    if (Date.now() - last < 30_000) return;
    sessionStorage.setItem("adeycp-chunk-reload", String(Date.now()));
  } catch {
    /* storage unavailable: reload anyway */
  }
  window.location.reload();
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

function PendingSplash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <img src={logo} alt="" className="h-14 w-14 animate-pulse rounded-full" />
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-[loading-bar_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
    </div>
  );
}

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultPendingComponent: PendingSplash,
  defaultErrorComponent: ({ error }) => {
    if (
      /importing a module script failed|dynamically imported module|Failed to fetch dynamically/i.test(
        error.message,
      )
    ) {
      try {
        const last = Number(sessionStorage.getItem("adeycp-chunk-reload") || 0);
        if (Date.now() - last > 30_000) {
          sessionStorage.setItem("adeycp-chunk-reload", String(Date.now()));
          window.location.reload();
        }
      } catch {
        /* ignore */
      }
    }
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="font-semibold text-ink">This page couldn't load.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The site was just updated. Reload to continue.
        </p>
        <button type="button" className="btn-primary mt-4" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  },
  // Show the splash almost immediately instead of a blank screen, but not
  // so fast that a normally-instant navigation flickers.
  defaultPendingMs: 150,
  defaultPendingMinMs: 250,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </React.StrictMode>,
);

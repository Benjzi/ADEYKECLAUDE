import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/donate/success")({
  head: () => ({
    meta: [
      { title: "Thank you — Adey CP" },
      { name: "description", content: "Thank you for supporting Adey CP." },
    ],
  }),
  component: DonateSuccess,
});

function DonateSuccess() {
  return (
    <SiteLayout>
      <section className="section-pad">
        <div className="container-adey mx-auto max-w-xl text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
          <h1 className="mt-4 text-3xl">Thank you.</h1>
          <p className="mt-3 text-body">
            Your gift changes lives. A receipt will be emailed once payment
            verification is complete.
          </p>
          <Link to="/" className="btn-primary mt-6">Back to Home</Link>
        </div>
      </section>
    </SiteLayout>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogPage } from "@/components/catalog/CatalogPage";

export const metadata: Metadata = {
  title: "All Topics — Engineering Playbook",
  description: "Browse every topic in the Engineering Playbook catalog.",
};

export default function TopicsIndexRoute() {
  return (
    <Suspense>
      <CatalogPage />
    </Suspense>
  );
}

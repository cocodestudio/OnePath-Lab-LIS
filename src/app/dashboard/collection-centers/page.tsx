import { redirect } from "next/navigation";

export default function CollectionCentersIndexPage() {
  redirect("/dashboard/settings?tab=collection-centers");
}


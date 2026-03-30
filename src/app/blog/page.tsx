import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Legacy Journal Redirect",
  description: "Compatibility route preserved while the public journal moves to /journal.",
};

export default async function BlogIndexPage() {
  redirect("/journal");
}

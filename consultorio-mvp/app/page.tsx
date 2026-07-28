import { redirect } from "next/navigation";
import { MeriggiApp } from "@/components/meriggi-app";
import { getCurrentProfile } from "@/lib/auth";

export default async function Page() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  if (configured) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/login");
  }

  return <MeriggiApp />;
}

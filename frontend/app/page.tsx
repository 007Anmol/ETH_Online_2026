import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isManufacturerRole } from "@/lib/types";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (isManufacturerRole(session.role)) {
    redirect("/manufacturer");
  }

  redirect("/scan");
}

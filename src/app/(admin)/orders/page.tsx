import { redirect } from "next/navigation";

export default function LegacyOrdersPage(): never {
  redirect("/sales");
}

import { redirect } from "next/navigation";

export default function AuthRedirectPage() {
  redirect("/fr/auth");
}

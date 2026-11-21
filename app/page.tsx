import { redirect } from "next/navigation";

export default function Home() {
  // The dashboard middleware performs the authentication check. Keeping the
  // public root free of session/database initialization also makes setup and
  // health checks reliable before the first migration is applied.
  redirect("/dashboard");
}

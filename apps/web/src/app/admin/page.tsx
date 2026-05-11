import { redirect } from "next/navigation";

/**
 * /admin — defensive top-level redirect.
 *
 * The Administrator surface lives at /user/admin. Top-level /admin is a
 * common URL operators type — this redirect absorbs it so no one hits
 * a 404 trying to reach the operations center.
 */
export default function AdminRootRedirect(): never {
  redirect("/user/admin");
}

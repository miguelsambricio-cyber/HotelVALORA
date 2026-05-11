import { redirect } from "next/navigation";

/**
 * /user/ root redirects to the Administrator landing.
 *
 * The user-facing surface today is the existing /settings/* tree; /user/
 * is reserved for the institutional administrator + AI Operations sub-tree.
 * Direct visits to /user/ land on /user/admin so deep links never 404.
 */
export default function UserRootPage(): never {
  redirect("/user/admin");
}

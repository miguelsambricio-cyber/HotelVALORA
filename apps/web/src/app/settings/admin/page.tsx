import { redirect } from "next/navigation";

/**
 * /settings/admin — defensive redirect.
 *
 * The Administrator surface lives at /user/admin (institutional operations
 * center). Operators sometimes type `/settings/admin` because the Admin
 * link historically sat in the user-settings sidebar — this redirect
 * absorbs that habit + every external link / bookmark / share that
 * assumed the wrong path.
 */
export default function SettingsAdminRedirect(): never {
  redirect("/user/admin");
}

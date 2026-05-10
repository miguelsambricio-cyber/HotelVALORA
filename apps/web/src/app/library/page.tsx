import { redirect } from "next/navigation";

/**
 * /library has no landing of its own yet — drop straight onto the
 * Favoritos map (the only page shipped today). When future library
 * sub-pages exist (folders, all-reports table, …) replace this with a
 * real overview.
 */
export default function LibraryIndexPage() {
  redirect("/library/favorites-map");
}

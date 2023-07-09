import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useLocation, //
} from "@remix-run/react";
import { useState } from "react";

import { requireUserId, getSession
  // , commitSession
 } from "~/session.server";
// import { useUser } from "~/utils";
import { getOrganization } from "~/models/organization.server";
import { getWishListItemsWithVolunteerCount } from "~/models/la-lista-pa.server";
import { getWishListAsNote } from "~/models/note.server";
import { getUserById, updateKnownUrls } from "~/models/user.server";

/**
 * TODO1: This loads the wishlist, but lista/$listaId lo hace tb, es decir dos veces XO
 *
 * @param param0
 * @returns
 */
export async function loader({ request, params }: LoaderArgs) {
  const userId = await requireUserId(request);
  const user = await getUserById(userId);
  const organization = await getOrganization({ userId });

  if (!params.listaId) throw new Error("No listId provided");

  /**
   * latestKnownUrls allows to see lists
   */
  if (
    !(
      // user?.latestKnownUrls &&
      user?.latestKnownUrls?.includes(params.listaId)
    )
  ) {
    console.log(`
    User knows the url, but not yet in his known registry
    TODO: PLEASE ADD TO REGISTRY (DONE!)
    
    `);
    const addKnownUrl = function (original: string, toAdd: string) {
      console.log({ original, toAdd });
      if (original.includes(toAdd)) {
        throw new Error("Why you doing this!");
      }
      // if(isValid(toAdd))
      const serializableSeparator = "\n";

      return original.concat(serializableSeparator).concat(toAdd);
    };
    await updateKnownUrls(
      userId,
      addKnownUrl(user?.latestKnownUrls || "", `list${params.listaId}`)
    );
  }

  const session = await getSession(request);

  const globalMessage = session.get("globalMessage");
  let additional: {} = {};
  // if (session) {
  //   additional = {
  //     headers: {
  //       "Set-Cookie": await commitSession(session),
  //     },
  //   };
  // }
  console.log("ADD TO JSON", { additional, globalMessage });

  const wishListItems = await getWishListItemsWithVolunteerCount({
    noteId: params.listaId,
  });
  // console.log("getWishListItemsWithVolunteerCount", { wishListItems });
  const note = await getWishListAsNote({ id: params.listaId });

  console.log({ organization, list: "hey" });
  return json({
    wishListItems: wishListItems.map((w) => {
      // console.log({wwwww: w._count})
      return {
        ...w,
        url: `/lista/${params.listaId}/deseo/${w.id}`,
        volunteersCount: w._count.volunteers,
      };
    }),
    note,
    organization,
    globalMessage,
    // ...additional,
  }, 
  additional);
}

export default function WishListPageLayout() {
  console.log("Rendering WishListPageLayout");

  const data = useLoaderData<typeof loader>();
  const { globalMessage } = data;
  // const user = useUser()
  const location = useLocation();
  const [savedLocation] = useState(location.key);
  console.log({globalMessage1:globalMessage})
  console.log({"location.key === savedLocation":location.key === savedLocation})
  console.log({locationKey: location.key, savedLocation})

  return (
    <div className="flex h-full min-h-screen flex-col">

      <header className="flex items-center justify-between bg-slate-800 p-4 text-white">
        <h1 className="text-3xl font-bold">
          <Link to="/listas">Listas</Link>
        </h1>
        <p>
          {/* FIXME: Org should bot be optional */}
          Lista de deseos para "{data.note.title}"
        </p>
        <Form action="/logout" method="post">
          <button
            type="submit"
            className="rounded bg-slate-600 px-4 py-2 text-blue-100 hover:bg-blue-500 active:bg-blue-600"
          >
            Logout
          </button>
        </Form>
      </header>

      <main className="flex h-full bg-white">
        <div className="c-list h-full w-80 border-r bg-gray-50">
          {data.wishListItems.length === 0 ? (
            <p className="p-4">No wishs yet</p>
          ) : (
            <ol>
              {data.wishListItems.map((wish) => (
                <li key={wish.id}>
                  <NavLink
                    className={({ isActive }) =>
                      `block border-b p-4 text-xl ${isActive ? "bg-white" : ""}`
                    }
                    to={wish.url}
                  >
                    📝 {wish.title}
                    {wish.volunteersCount > 0
                      ? ` (${wish.volunteersCount})`
                      : ""}
                  </NavLink>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

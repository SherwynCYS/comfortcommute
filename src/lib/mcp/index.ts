import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listFavouritesTool from "./tools/list-favourites";
import listAlertsTool from "./tools/list-alerts";
import searchPlacesTool from "./tools/search-places";
import planCommuteTool from "./tools/plan-commute";
import saveFavouriteRouteTool from "./tools/save-favourite-route";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "comfortcommute",
  title: "ComfortCommute",
  version: "0.1.0",
  instructions:
    "Tools for ComfortCommute, a Singapore public-transport planner. Use `search_places` to resolve an address, station or bus stop into coordinates, then `plan_commute` to get ranked bus/MRT journeys priced for the commuter's fare card. Use `list_favourites`, `save_favourite_route` and `list_alerts` to manage saved journeys and see disruption alerts.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchPlacesTool, planCommuteTool, listFavouritesTool, saveFavouriteRouteTool, listAlertsTool],
});

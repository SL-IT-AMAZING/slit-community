import { fetchAllTools } from "@/services/supabase";
import ToolsList from "./tools-list";

export const metadata = {
  title: "Tools Management",
};

export default async function AdminToolsPage() {
  const tools = await fetchAllTools();
  return <ToolsList initialTools={tools} />;
}

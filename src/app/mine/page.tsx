import AgentProfilePanel from "@/components/AgentProfilePanel";
import MemoryCenter from "@/components/MemoryCenter";

export default function MinePage() {
  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      <AgentProfilePanel />
      <MemoryCenter />
    </main>
  );
}

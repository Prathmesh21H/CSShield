import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSession();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col">
        <Navbar user={user} />
        <main className="flex-1 bg-paper p-6">{children}</main>
      </div>
    </div>
  );
}
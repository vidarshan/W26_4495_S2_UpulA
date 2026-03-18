import ClientShell from "@/app/components/shells/ClientShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}

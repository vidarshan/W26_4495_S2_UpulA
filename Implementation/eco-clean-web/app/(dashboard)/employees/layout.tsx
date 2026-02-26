import UserShell from "@/app/components/shells/UserShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}

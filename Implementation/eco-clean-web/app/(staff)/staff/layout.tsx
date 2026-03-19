import StaffShell from "../../components/shells/StaffShell";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StaffShell>{children}</StaffShell>;
}

import { ReactNode } from "react";

export default function LayoutCards({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-5">{children}</div>;
}

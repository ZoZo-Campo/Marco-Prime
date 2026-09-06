import type { PropsWithChildren } from "preact/compat";
import { NavBar } from "./components/layout/navbar";

type LayoutProps = PropsWithChildren;

export function Layout({ children }: LayoutProps) {
  return (
    <div class="w-screen h-screen flex flex-col overflow-hidden">
      <main class="flex-1 flex overflow-auto">{children}</main>
      <NavBar />
    </div>
  );
}

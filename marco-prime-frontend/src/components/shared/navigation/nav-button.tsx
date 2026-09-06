import type { LucideIcon } from "lucide-preact";
import { useLocation } from "preact-iso";
import { cn } from "../../../utils/cn";
import { Button } from "../../ui/button";

interface NavButtonProps {
  icon: LucideIcon;
  label?: string;
  href: string;
}

export function NavButton({ icon: Icon, label, href }: NavButtonProps) {
  const { path, route } = useLocation();
  const isActive = path === href;

  return (
    <Button
      class={cn(label && "flex-1", isActive && "text-primary hover:text-primary")}
      variant="ghost"
      size="lg"
      onClick={() => route(href)}
    >
      <Icon />
      {label && <span>{label}</span>}
    </Button>
  );
}

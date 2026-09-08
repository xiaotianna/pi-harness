import { MagicWand } from "@gravity-ui/icons";

export function SkillIcon({ icon, className }: { icon: string | null; className: string }) {
  return icon ? (
    <img alt="" aria-hidden className={className} src={icon} />
  ) : (
    <MagicWand aria-hidden className={className} />
  );
}

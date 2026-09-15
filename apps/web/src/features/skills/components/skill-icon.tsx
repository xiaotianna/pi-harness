import { MagicWand } from "@gravity-ui/icons";

export function SkillIcon({
  icon,
  className,
  fillRaster = false,
}: {
  icon: string | null;
  className: string;
  fillRaster?: boolean;
}) {
  return icon ? (
    <img
      alt=""
      aria-hidden
      className={
        fillRaster && !icon.startsWith("data:image/svg+xml")
          ? "size-full rounded-xl object-cover"
          : className
      }
      src={icon}
    />
  ) : (
    <MagicWand aria-hidden className={className} />
  );
}

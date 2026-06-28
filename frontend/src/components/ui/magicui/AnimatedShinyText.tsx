import { type CSSProperties, type FC, type ComponentPropsWithoutRef } from "react";

export interface AnimatedShinyTextProps extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number;
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  shimmerWidth = 120,
  style,
  ...props
}) => {
  return (
    <span
      style={
        {
          "--shiny-width": `${shimmerWidth}px`,
          display: "inline-block",
          backgroundImage:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.85) 50%, transparent)",
          backgroundSize: "var(--shiny-width) 100%",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "-100% 0",
          animation: "shiny-text 4s cubic-bezier(0.6,0.6,0,1) infinite",
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </span>
  );
};

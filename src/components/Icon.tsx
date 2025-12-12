import AbsInc from "@/assets/illustrations/abs-inc.svg?react";
import AngleHoleFunction from "@/assets/illustrations/angle-hole-function.svg?react";
import ArcBoltHoleFunction from "@/assets/illustrations/arc-bolt-hole-function.svg?react";
import ArcContouringFunction from "@/assets/illustrations/arc-contouring-function.svg?react";
import BoltHolePcdFunction from "@/assets/illustrations/bolt-hole-pcd-function.svg?react";
import Calculator from "@/assets/illustrations/calculator.svg?react";
import Cancel from "@/assets/illustrations/cancel.svg?react";
import Dot from "@/assets/illustrations/dot.svg?react";
import Enter from "@/assets/illustrations/enter.svg?react";
import Function from "@/assets/illustrations/function.svg?react";
import GridHoleFunction from "@/assets/illustrations/grid-hole-function.svg?react";
import HalfFunction from "@/assets/illustrations/half-function.svg?react";
import InchMm from "@/assets/illustrations/inch-mm.svg?react";
import Number0 from "@/assets/illustrations/number-0.svg?react";
import Number1 from "@/assets/illustrations/number-1.svg?react";
import Number2 from "@/assets/illustrations/number-2.svg?react";
import Number3 from "@/assets/illustrations/number-3.svg?react";
import Number4 from "@/assets/illustrations/number-4.svg?react";
import Number5 from "@/assets/illustrations/number-5.svg?react";
import Number6 from "@/assets/illustrations/number-6.svg?react";
import Number7 from "@/assets/illustrations/number-7.svg?react";
import Number8 from "@/assets/illustrations/number-8.svg?react";
import Number9 from "@/assets/illustrations/number-9.svg?react";
import Preset from "@/assets/illustrations/preset.svg?react";
import PreSetDepthFunction from "@/assets/illustrations/pre-set-depth-function.svg?react";
import Reference from "@/assets/illustrations/reference.svg?react";
import SdmFunction from "@/assets/illustrations/sdm-function.svg?react";
import Setup from "@/assets/illustrations/setup.svg?react";
import SummingFunction from "@/assets/illustrations/summing-function.svg?react";
import TaperCalculation from "@/assets/illustrations/taper-calculation.svg?react";
import ToggleSign from "@/assets/illustrations/toggle-sign.svg?react";
import ToolOffsets from "@/assets/illustrations/tool-offsets.svg?react";
import VectoringFunction from "@/assets/illustrations/vectoring-function.svg?react";

const icons: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  "abs-inc": AbsInc,
  "angle-hole-function": AngleHoleFunction,
  "arc-bolt-hole-function": ArcBoltHoleFunction,
  "arc-contouring-function": ArcContouringFunction,
  "bolt-hole-pcd-function": BoltHolePcdFunction,
  "calculator": Calculator,
  "cancel": Cancel,
  "dot": Dot,
  "enter": Enter,
  "function": Function,
  "grid-hole-function": GridHoleFunction,
  "half-function": HalfFunction,
  "inch-mm": InchMm,
  "number-0": Number0,
  "number-1": Number1,
  "number-2": Number2,
  "number-3": Number3,
  "number-4": Number4,
  "number-5": Number5,
  "number-6": Number6,
  "number-7": Number7,
  "number-8": Number8,
  "number-9": Number9,
  "preset": Preset,
  "pre-set-depth-function": PreSetDepthFunction,
  "reference": Reference,
  "sdm-function": SdmFunction,
  "setup": Setup,
  "summing-function": SummingFunction,
  "taper-calculation": TaperCalculation,
  "toggle-sign": ToggleSign,
  "tool-offsets": ToolOffsets,
  "vectoring-function": VectoringFunction,
};

interface IconProps {
  name: string;
  className?: string;
  alt?: string;
}

const Icon = ({ name, className = "w-full h-full", alt = "" }: IconProps) => {
  const SvgIcon = icons[name];

  if (!SvgIcon) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <SvgIcon
      className={`icon ${className}`}
      role="img"
      aria-label={alt}
    />
  );
};

export default Icon;

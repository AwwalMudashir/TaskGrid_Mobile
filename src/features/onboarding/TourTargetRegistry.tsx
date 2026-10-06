import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type TourTargetKey = "tasks" | "messages" | "wallet" | "profile";
export type TourTargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TourTargetContextValue = {
  targets: Partial<Record<TourTargetKey, TourTargetRect>>;
  registerTarget(key: TourTargetKey, rect: TourTargetRect): void;
};

const TourTargetContext = createContext<TourTargetContextValue | null>(null);

function sameRect(left: TourTargetRect | undefined, right: TourTargetRect) {
  return (
    left?.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

export function TourTargetProvider({ children }: PropsWithChildren) {
  const [targets, setTargets] = useState<
    Partial<Record<TourTargetKey, TourTargetRect>>
  >({});

  const registerTarget = useCallback(
    (key: TourTargetKey, rect: TourTargetRect) => {
      setTargets((current) =>
        sameRect(current[key], rect) ? current : { ...current, [key]: rect },
      );
    },
    [],
  );

  const value = useMemo(
    () => ({ targets, registerTarget }),
    [registerTarget, targets],
  );
  return (
    <TourTargetContext.Provider value={value}>
      {children}
    </TourTargetContext.Provider>
  );
}

export function useTourTargets() {
  const context = useContext(TourTargetContext);
  if (!context)
    throw new Error("useTourTargets must be used inside TourTargetProvider");
  return context;
}

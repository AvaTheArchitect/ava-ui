import { useState, useEffect, useCallback } from "react";

interface BaseComponentState {
  isLoaded: boolean;
  isActive: boolean;
}

export function useBaseComponent(componentName: string = "component") {
  const [state, setState] = useState<BaseComponentState>({
    isLoaded: false,
    isActive: false,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isLoaded: true,
      }));
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleToggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: !prev.isActive,
    }));
  }, []);

  return {
    ...state,
    handleToggle,
  };
}

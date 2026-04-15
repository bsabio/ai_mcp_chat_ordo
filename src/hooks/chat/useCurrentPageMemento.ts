import { useEffect, useMemo } from "react";

import {
  createCurrentPageMemento,
  type CurrentPageMemento,
} from "@/lib/chat/CurrentPageMemento";

export function useCurrentPageMemento(currentPathname: string): CurrentPageMemento {
  const memento = useMemo(() => createCurrentPageMemento(), []);

  useEffect(() => {
    memento.start();
    return () => memento.stop();
  }, [memento]);

  useEffect(() => {
    memento.setPathname(currentPathname);
  }, [memento, currentPathname]);

  return memento;
}

import { createContext, useContext } from 'react';

export const MobileCtx = createContext<boolean>(false);

export const useMobile = (): boolean => useContext(MobileCtx);

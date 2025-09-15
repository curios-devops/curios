// Type fixes for React Router components
declare module 'react-router-dom' {
  import { ReactNode } from 'react';
  
  export interface OutletProps {
    context?: unknown;
  }
  
  export function Outlet(props?: OutletProps): ReactNode;
}

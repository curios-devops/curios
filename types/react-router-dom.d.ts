// Type augmentation for react-router-dom to fix VSCode language server cache issue
declare module 'react-router-dom' {
  export * from 'react-router';
  
  // DOM-specific exports
  export {
    BrowserRouter,
    HashRouter,
    Link,
    NavLink,
    Form,
    ScrollRestoration,
    createBrowserRouter,
    createHashRouter,
    RouterProvider,
  } from 'react-router-dom/dist/index';
  
  // Explicitly re-export useNavigate to fix cache issue
  export function useNavigate(): (to: string | number, options?: { replace?: boolean; state?: any }) => void;
}

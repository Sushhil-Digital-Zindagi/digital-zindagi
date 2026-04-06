/**
 * Lightweight hash-based router mimicking react-router-dom API.
 */
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface RouteContextType {
  pathname: string;
  search: string;
  params: Record<string, string>;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const RouterCtx = createContext<RouteContextType>({
  pathname: "/",
  search: "",
  params: {},
  navigate: () => {},
});

function parseHash() {
  const hash = window.location.hash;
  if (!hash || hash === "#") return { pathname: "/", search: "" };
  const withoutHash = hash.slice(1);
  const qIdx = withoutHash.indexOf("?");
  if (qIdx === -1) return { pathname: withoutHash || "/", search: "" };
  return {
    pathname: withoutHash.slice(0, qIdx) || "/",
    search: withoutHash.slice(qIdx),
  };
}

export function BrowserRouter({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState(parseHash);

  useEffect(() => {
    const handler = () => setLoc(parseHash());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    if (opts?.replace) window.location.replace(`#${to}`);
    else window.location.hash = to;
  }, []);

  const ctx = useMemo(
    () => ({ ...loc, params: {}, navigate }),
    [loc, navigate],
  );

  return <RouterCtx.Provider value={ctx}>{children}</RouterCtx.Provider>;
}

export function useNavigate() {
  return useContext(RouterCtx).navigate;
}

export function useLocation() {
  const { pathname, search } = useContext(RouterCtx);
  return { pathname, search };
}

export function useParams<T extends Record<string, string>>(): T {
  return useContext(RouterCtx).params as T;
}

export function useSearchParams(): [
  URLSearchParams,
  (p: URLSearchParams) => void,
] {
  const ctx = useContext(RouterCtx);
  const params = useMemo(
    () => new URLSearchParams(ctx.search.replace(/^\?/, "")),
    [ctx.search],
  );
  const setParams = useCallback(
    (newParams: URLSearchParams) => {
      const qs = newParams.toString();
      ctx.navigate(`${ctx.pathname}${qs ? `?${qs}` : ""}`);
    },
    [ctx],
  );
  return [params, setParams];
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children?: ReactNode;
}

export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const { navigate } = useContext(RouterCtx);
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      navigate(to);
    }
    onClick?.(e);
  };
  return (
    <a href={`#${to}`} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const { navigate } = useContext(RouterCtx);
  useEffect(() => {
    navigate(to, { replace });
  }, [to, replace, navigate]);
  return null;
}

function matchRoute(
  pattern: string,
  pathname: string,
): { matched: boolean; params: Record<string, string> } {
  if (pattern === "*") return { matched: true, params: {} };
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length)
    return { matched: false, params: {} };
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    const vp = pathParts[i];
    if (pp.startsWith(":")) params[pp.slice(1)] = decodeURIComponent(vp);
    else if (pp !== vp) return { matched: false, params: {} };
  }
  return { matched: true, params };
}

interface RouteProps {
  path: string;
  element: ReactNode;
}

export function Route(_props: RouteProps) {
  return null;
}

export function Routes({ children }: { children: ReactNode }) {
  const ctx = useContext(RouterCtx);
  const { pathname } = ctx;

  const childArray = (
    Array.isArray(children) ? children : [children]
  ) as React.ReactElement<RouteProps>[];
  for (const child of childArray) {
    if (!child || !child.props?.path) continue;
    const { matched, params } = matchRoute(child.props.path, pathname);
    if (matched) {
      return (
        <RouterCtx.Provider value={{ ...ctx, params }}>
          {child.props.element}
        </RouterCtx.Provider>
      );
    }
  }
  return null;
}

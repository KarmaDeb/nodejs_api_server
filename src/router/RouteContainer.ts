import type Route from "./route/Route";
import logger from "../logger";

export default class RouteContainer {

    public static readonly ROOT: RouteContainer = new RouteContainer('');

    private readonly path: string;
    private readonly parent: RouteContainer|undefined;

    private readonly routes: Array<Route> = Array();
    private readonly childs: Array<RouteContainer> = Array();

    private constructor(path: string, parent?: RouteContainer) {
        this.path = path;
        this.parent = parent;

        this.parseRoutes();
    }

    private async parseRoutes(): Promise<void> {
        const name: string = (this.path === '' ? 'main' : this.path);
        const dir: string = this.mapPath();

        const mod = await import(`../routes/${dir}routes.ts`);
        mod.register(this);
    }

    public getPath(): string {
        return this.path;
    }

    public hasRoute(route?: string): boolean {
        return this.routes.some((rt) => this.equalsIgnoreCase(rt.path, route));
    }

    public addRoute(route: Route): void {
        if (this.hasRoute(route.path))
            return;

        const fullPath: string = this.getCompletePath(route);
        logger.info(`Registered path: ${fullPath}`);

        this.routes.push(route);
    }

    public removeRoute(route: Route): void {
        if (!this.hasRoute(route.path))
            return;

        const index: number = this.routes.indexOf(route);
        this.routes.splice(index, 1);
    }

    public getRoute(route?: string): Route|null {
        if (route && route.trim().length === 0) {
            return this.routes.find((rt) => !rt.path || rt.path.trim().length === 0) || null;
        }

        if (route && !route.match(/[a-z0-9-]*/))
            throw new Error('Invalid route provided, only numbers, letters and - are allowed');

        return this.routes.find((rt) => this.equalsIgnoreCase(rt.path, route)) || null;
    }

    public fetchPath(subPath: string): RouteContainer|null {
        if (subPath.trim().length === 0) {
            throw new Error('Cannot create empty path route container');
        }

        if (!subPath.match(/[a-z0-9-]*/))
            throw new Error('Invalid route provided, only numbers, letters and - are allowed');

        return this.childs.find((c) => this.equalsIgnoreCase(c.getPath(), subPath)) || null;
    }

    public createPath(subPath: string): RouteContainer {
        if (subPath.trim().length === 0) {
            throw new Error('Cannot create empty path route container');
        }

        if (!subPath.match(/[a-z0-9-]*/))
            throw new Error('Invalid route provided, only numbers, letters and - are allowed');

        const existing: RouteContainer|undefined = this.childs.find((c) => this.equalsIgnoreCase(c.getPath(), subPath));
        if (existing)
            return existing;

        const container = new RouteContainer(subPath, this);
        this.childs.push(container);

        return container;
    }

    public add(type: number, handler: Function, path?: string): RouteContainer {
        if (path === '/')
            return this.add(type, handler);

        if (path && path.trim().length === 0) {
            throw new Error('Cannot create empty path route');
        }

        if (path && !path.match(/[a-z0-9-]*/))
            throw new Error('Invalid route provided, only numbers, letters and - are allowed');

        const route: Route = {
            path: path,
            type: type,
            process: handler
        }
        this.addRoute(route);

        return this;
    }

    public getChilds(): Array<RouteContainer> {
        return Array.from(this.childs);
    }

    public getRoutes(): Array<Route> {
        return Array.from(this.routes);
    }

    private equalsIgnoreCase(string1?: string, string2?: string): boolean {
        if (!string1)
            return !string2;

        if (!string2)
            return false;

        return string1.toLowerCase() === string2.toLowerCase();
    }

    private getCompletePath(route: Route): string {
        const name: string = route.path || '';
        let parent: RouteContainer|undefined = this.parent;
        if (!parent)
            return `/${name}`;

        let rt: string = `${this.path}/${name}`;
        while (parent) {
            const pPath = parent.path;
            if (pPath === '') break;

            rt = `${pPath}/${rt}`;

            parent = parent.parent;
        }
        if (!rt.startsWith('/'))
            rt = `/${rt}`;

        return rt;
    }

    private mapPath(): string {
        let parent: RouteContainer|undefined = this.parent;
        if (!parent)
            return `/${this.path}/`;

        let rt: string = `${this.path}/`;
        while (parent) {
            const pPath = parent.path;
            if (pPath === '') break;

            rt = `${pPath}/${rt}`;

            parent = parent.parent;
        }

        return rt;
    }
}
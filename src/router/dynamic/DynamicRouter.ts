import crypto from 'crypto';

import RouteContainer from "../RouteContainer";
import type Route from "../route/Route";
import DynamicRoutes from "./DynamicRoutes";
import type { Logger } from 'winston';

export default class DynamicRouter {

    private lastCall: number = Date.now();

    private readonly logger: Logger;
    private readonly paths: Map<string, RouteContainer> = new Map();
    private readonly routes: Map<RouteContainer, DynamicRoutes> = new Map();

    public constructor(logger: Logger) {
        this.logger = logger;

        const main: RouteContainer = RouteContainer.ROOT;
        this.mapContainer(main);
    }

    public findRoute(path: string): Route|null {
        const clean: string = path.substring(1);

        if (!clean.includes('/'))
            return null;

        const data: Array<string> = clean.split('/');
        const finalPath: string = data[data.length - 1];
        let rtBuilder = '';

        for (let i = 0; i < data.length - 1; i++) {
            rtBuilder += `/${data[i]}`;
        }

        const container: RouteContainer|undefined = this.paths.get(rtBuilder);

        if (!container)
            return null;
        
        const routes: DynamicRoutes|undefined = this.routes.get(container);
        if (!routes) {
            this.logger.error(`Unexpected error. Dynamic route container was available, but no route was provided`);
            return null;
        }

        this.lastCall = Date.now();
        return routes.get(finalPath);
    }

    public getLastCall(): number {
        return this.lastCall;
    }

    public mapRouteMap(): Array<{type: number, route: string}> {
        const map: Array<{type: number, route: string}> = Array();

        this.paths.forEach((route: RouteContainer, path: string) => {
            const initial: string = path;

            const dynamic: DynamicRoutes|undefined = this.routes.get(route);
            if (!dynamic)
                return;

            for (const dPath of dynamic.getPaths()) {
                const route: Route|null = dynamic.get(dPath);
                if (!route) continue;

                map.push({
                    type: route.type,
                    route: `${initial}/${dPath}`
                });
            }
        });

        return map;
    }

    private mapContainer(container: RouteContainer, parent?: string): void {
        const children: Array<RouteContainer> = container.getChilds();
        const paths: Array<Route> = container.getRoutes();
        
        let routePath: string = crypto.randomBytes(6).toString('hex');
        if (parent) {
            routePath = `${parent}/${routePath}`;
        } else {
            routePath = `/${routePath}`;
        }

        this.paths.set(routePath, container);
        for (const sub of children)
            this.mapContainer(sub, routePath);

        this.routes.set(container, new DynamicRoutes(paths))
    }
}
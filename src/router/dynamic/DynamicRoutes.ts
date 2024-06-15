import crypto from 'crypto';

import type Route from "../route/Route";

export default class DynamicRoutes {

    private readonly routes: Map<string, Route> = new Map();

    public constructor(paths: Array<Route>) {
        this.mapPaths(paths);
    }

    get(path: string): Route|null {
        return this.routes.get(path) || null;
    }

    getPaths(): Array<string> {
        const keys: Array<string> = Array();
        this.routes.forEach((_, key: string) => {
            keys.push(key);
        });

        return keys;
    }

    private mapPaths(paths: Array<Route>): void {
        for (const path of paths) {
            let routePath: string = crypto.randomBytes(6).toString('hex');
            this.routes.set(routePath, path);
        }
    }
}
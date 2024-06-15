import type { Request, Response } from "express";
import type RouteContainer from "../../router/RouteContainer";
import { RouteType } from "../../router/route/RouteType";

export function register(path: RouteContainer) {
    path.add(RouteType.API_ROOT, (request: Request, response: Response) => {
        response.status(200).json({
            success: true
        });
    });
}
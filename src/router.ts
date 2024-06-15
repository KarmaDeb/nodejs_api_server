import RouteContainer from "./router/RouteContainer";

const root: RouteContainer = RouteContainer.ROOT;
const api: RouteContainer = root.createPath('api');
api.createPath('public');
api.createPath('admin');
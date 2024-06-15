import express from 'express';
import redis from 'redis';

import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';

import type { NextFunction, Request, Response } from 'express';

import CommandProcessor from './command/CommandProcessor';
import logger from './logger';

import type Command from './command/Command';
import type Route from './router/route/Route';

await import('./router');
import DynamicRouter from './router/dynamic/DynamicRouter';

import Config from './settings';

const cmdProcessor: CommandProcessor = new CommandProcessor(logger);
await cmdProcessor.process();

const application = express();
if (Config.rateLimit) {
    logger.info('Preparing to connect to redis...');

    
    let url: string = Config.redisCurl;
    if (Config.redisCurl.trim().length === 0) {
        url = `redis://${Config.redisConn.user}:${Config.redisConn.pass}@${Config.redisConn.host}:${Config.redisConn.port}`;
    }

    const redisClient: redis.RedisClientType = redis.createClient({
        url: Config.redisCurl
    });
    await redisClient.connect();
    logger.info('Connected!');

    const rateLimiter250: RateLimiterRedis = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rl250',
        points: 250,
        duration: 10 * 60,
        blockDuration: 10
    });
    const rateLimiter500: RateLimiterRedis = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rl500',
        points: 500,
        duration: 15 * 60,
        blockDuration: 5 * 60
    });

    const rateLimiterMiddleware = async (request: Request, response: Response, next: NextFunction) => {
        try {
            const address: string|undefined = request.ip;

            if (!address) {
                return response.json({
                    status: 400,
                    code: 1
                });
            }
            
            const rateLimitRes: RateLimiterRes = await rateLimiter250.consume(address, 1);
            await rateLimiter500.consume(address, 1);
    
            response.setHeader('X-RateLimit-Limit', '250, 500');
            response.setHeader('X-RateLimit-Remaining', `${rateLimitRes.remainingPoints}`);
    
            next();
        } catch (rateLimitException: any) {
            const retryAfter = Math.ceil(rateLimitException.msBeforeNext / 1000);

            response.setHeader('Retry-After', String(retryAfter));
            response.status(429).send('Too Many Requests');
        }
    };

    application.use(rateLimiterMiddleware);
}

application.use(express.json());

const dynamicRoutes: Map<string, DynamicRouter> = new Map();

application.all('*', (request: Request, response: Response) => {
    function tryFail() {
        if (request.method.toLowerCase() === 'head')
            return response.status(200).end();

        return response.status(404).end();
    };

    const path: string = request.path;
    const ip: string|null = ipv6Toipv4(request.ip);
    if (!ip) {
        response.json({
            status: 400,
            code: 1
        });
        return;
    }

    const userAgent: string|undefined = request.headers['user-agent'];
    if (!userAgent) {
        response.status(400).end();
        logger.debug(`Declining request from ${ip} because he did not provide a valid user agent`);
        return;
    }

    let router: DynamicRouter|undefined = dynamicRoutes.get(ip);
    if (path === '/' && request.method === 'PATCH') {
        if (router) {
            const lastCalled: number = router.getLastCall();
            const now: number = Date.now();
            const minutesElapsed: number = (now - lastCalled) / (1000 * 60);

            if (minutesElapsed >= 10)
                router = undefined;
        }

        if (!router) {
            router = new DynamicRouter(logger);
            dynamicRoutes.set(ip, router);

            const routeMap: Array<{route: string, type: number}> = [];
            for (const route of router.mapRouteMap()) {
                routeMap.push(route);
            }

            return response.status(200).json({
                routes: routeMap
            });
        }

        return response.status(200).end();
    }

    if (!router) {
        return response.status(401).json({
            code: 'Setup required'
        });
    }

    logger.debug(`Received ${request.method}: ${path} from ${ip}:${request.socket.remotePort}`);
    if (path.startsWith('/favicon')) {
        logger.debug('Ignoring favicon request...');
        return response.status(404).end();
    }

    const route: Route|null = router.findRoute(path);
    if (!route)
        return tryFail();

    route.process(request, response);
});

const PORT = process.env.PORT || 80;
application.listen(PORT, () => {
    console.log(`Webserver API runnin on: ${PORT}`);
});

for await (const line of console) {
    const fullLineArgs = line.trim();

    let cmd = fullLineArgs;
    const args: Array<string> = Array();
    if (fullLineArgs.includes(' ')) {
        const data: Array<string> = fullLineArgs.split(' ');
        cmd = data[0];
        for (let i = 1; i < data.length; i++) {
            const subArg: string = data[i];
            if (subArg.trim().length === 0) continue;

            args.push(data[i]);
        }
    }

    const command: Command|null = cmdProcessor.getCommand(cmd);
    if (command)
        command.execute(args);
}

function ipv6Toipv4(ipv6Address?: string): string|null {
    if (!ipv6Address)
        return null;

    const match = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ipv6Address);

    if (match) {
        const ipv4Address = match[1];
        return ipv4Address;
    } else {
        return ipv6Address;
    }
}
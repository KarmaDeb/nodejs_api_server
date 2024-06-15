const dotenv = await import('dotenv');
dotenv.config();

export default class Config {

    public static readonly rateLimit: boolean = process.env.RATE_LIMIT === 'true';
    public static readonly redisCurl: string = process.env.REDIS_CURL || '';
    public static readonly redisConn: {
        host: string,
        port: number,
        user: string,
        pass: string
    } = {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        user: process.env.REDIS_USER = '',
        pass: process.env.REDIS_PASS = ''
    };
}
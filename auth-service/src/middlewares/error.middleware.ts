import { Request, Response, NextFunction } from 'express';

export const errorMiddleware = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof Error) {
        console.error(err.stack || err.message);
    } else {
        console.error('Non-Error object thrown:', err);
    }

    res.status(500).json({ message: 'Internal Server Error' });
};
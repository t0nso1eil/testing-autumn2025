import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { Request, Response } from 'express';

export async function validateDto<T extends object>(
    dtoClass: new () => T,
    plain: object,
    req: Request,
    res: Response
): Promise<T | null> {
    const dto = plainToInstance(dtoClass, plain);

    try {
        const errors: ValidationError[] = await validate(dto);

        if (!errors || errors.length === 0) {
            return dto;
        }

        const errorMessages = errors.flatMap(error =>
            Object.values(error.constraints || {})
        );

        res.status(400).json({
            message: 'Validation failed',
            errors: errorMessages
        });
        return null;
    } catch (error) {
        console.error('Validation process error:', error);
        res.status(500).json({
            message: 'Internal validation error'
        });
        return null;
    }
}
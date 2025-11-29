import { validateDto } from "../../../src/utils/validate.util";
import { UpdateUserDto } from "../../../src/dto/user.dto";
import { validate } from 'class-validator';
import { Request, Response } from 'express';

jest.mock('class-validator');

const mockedValidate = jest.mocked(validate);

interface MockResponse extends Response {
    status: jest.Mock<any, any>;
    json: jest.Mock<any, any>;
}

describe('Validate DTO', () => {
    const mockRequest = {} as Request;

    const createMockResponse = (): MockResponse => {
        const res: any = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Successfull scenarios', () => {
        it('should return DTO when validation passes with valid data', async () => {
            // arrange
            const plainData = {
                username: 'username',
                email: 'email@mail.com',
                role: 'admin'
            };

            const res = createMockResponse();
            mockedValidate.mockResolvedValue([]);

            // act
            const result = await validateDto(UpdateUserDto, plainData, mockRequest, res);

            // assert
            expect(mockedValidate).toHaveBeenCalledWith(expect.any(UpdateUserDto));
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
            expect(result).toBeInstanceOf(UpdateUserDto);
            expect(result).toEqual(expect.objectContaining(plainData));
        });

        it('should return DTO when all fields are optional and not provided', async () => {
            // arrange
            const plainData = {};

            const res = createMockResponse();
            mockedValidate.mockResolvedValue([]);

            // act
            const result = await validateDto(UpdateUserDto, plainData, mockRequest, res);

            // assert
            expect(result).toBeInstanceOf(UpdateUserDto);
            expect(result).toEqual({});
        });

        it('should return DTO when only partial data provided', async () => {
            // arrange
            const plainData = { username: 'usrnm' };

            const res = createMockResponse();
            mockedValidate.mockResolvedValue([]);

            // act
            const result = await validateDto(UpdateUserDto, plainData, mockRequest, res);

            // assert
            expect(result).toBeInstanceOf(UpdateUserDto);
            expect(result).toEqual(expect.objectContaining(plainData));
        });
    });

    describe('Error scenarios', () => {
        it('should send 400 response and return null when single validation fails', async () => {
            // arrange
            const plainData = {
                email: 'invalidemail',
                username: 'username'
            };

            const res = createMockResponse();
            const mockErrors = [
                {
                    property: 'email',
                    constraints: {
                        isEmail: 'email must be an email'
                    },
                    children: []
                }
            ] as any;

            mockedValidate.mockResolvedValue(mockErrors);

            // act
            const result = await validateDto(UpdateUserDto, plainData, mockRequest, res);

            // assert
            expect(mockedValidate).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Validation failed',
                errors: ['email must be an email']
            });
            expect(result).toBeNull();
        });

        it('should handle empty constraints', async () => {
            // arrange
            const plainData = { username: 'username' };
            const res = createMockResponse();
            const mockErrors = [
                {
                    property: 'username',
                    constraints: {}
                }
            ] as any;

            mockedValidate.mockResolvedValue(mockErrors);

            // act
            const result = await validateDto(UpdateUserDto, plainData, mockRequest, res);

            // assert
            expect(res.json).toHaveBeenCalledWith({
                message: 'Validation failed',
                errors: []
            });
            expect(result).toBeNull();
        });
    });
});
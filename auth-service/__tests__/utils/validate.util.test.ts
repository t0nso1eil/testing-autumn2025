import { validateDto } from '../../src/utils/validate.util';
import { RegisterDto } from '../../src/dto/auth.dto';
import { validate } from 'class-validator';

jest.mock('class-validator');

const mockedValidate = jest.mocked(validate);

describe('Validate DTO', () => {
    const mockRequest = {} as any;
    const mockResponse = () => {
        const res: any = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return DTO when validation passes', async () => {
        // arrange
        const plainData = {
            username: 'username',
            email: 'email@mail.com',
            password: 'password',
        };

        const res = mockResponse();
        mockedValidate.mockResolvedValue([]);

        // act
        const result = await validateDto(RegisterDto, plainData, mockRequest, res);

        // assert
        expect(mockedValidate).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(result).toBeInstanceOf(RegisterDto);
        expect(result).toEqual(expect.objectContaining(plainData));
    });

    it('should send 400 response and return null when validation fails', async () => {
        // arrange
        const plainData = {
            username: 'ab',
            email: 'invalidemail',
            password: 'short'
        };

        const res = mockResponse();
        const mockErrors = [
            {
                property: 'username',
                constraints: { length: 'username must be longer than or equal to 3 characters' }
            },
            {
                property: 'email',
                constraints: { isEmail: 'email must be an email' }
            }
        ] as any;

        mockedValidate.mockResolvedValue(mockErrors);

        // act
        const result = await validateDto(RegisterDto, plainData, mockRequest, res);

        // assert
        expect(mockedValidate).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Validation failed',
            errors: [
                'username must be longer than or equal to 3 characters',
                'email must be an email'
            ]
        });
        expect(result).toBeNull();
    });

    it('should handle empty constraints', async () => {
        // arrange
        const plainData = { username: 'ab' };
        const res = mockResponse();
        const mockErrors = [
            {
                property: 'username',
                constraints: {}
            }
        ] as any;

        mockedValidate.mockResolvedValue(mockErrors);

        // act
        const result = await validateDto(RegisterDto, plainData, mockRequest, res);

        // assert
        expect(res.json).toHaveBeenCalledWith({
            message: 'Validation failed',
            errors: []
        });
        expect(result).toBeNull();
    });
});
import { AuthController } from "../../../src/controllers/auth.controller";
import authService from "../../../src/services/auth.service";
import { validateDto } from "../../../src/utils/validate.util";
import { RegisterDto, LoginDto } from "../../../src/dto/auth.dto";

jest.mock('../../../src/services/auth.service');
jest.mock('../../../src/utils/validate.util');

const mockedAuthService = jest.mocked(authService);
const mockedValidateDto = jest.mocked(validateDto);

describe('Auth controller', () => {
    let authController: AuthController;

    const createMockResponse = () => {
        const res: any = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    const createMockRequest = (body: any = {}, headers: any = {}, params: any = {}) => ({
        body,
        headers,
        params,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        authController = new AuthController();
    });

    describe('Register', () => {
        it('should successfully register user and return 201', async () => {
            // arrange
            const registerData = {
                username: 'username',
                email: 'email@email.com',
                password: 'password'
            };

            const userResponse = {
                id: 1,
                username: registerData.username,
                email: registerData.email,
                role: 'user'
            };

            const req = createMockRequest(registerData);
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(registerData as RegisterDto);
            mockedAuthService.register.mockResolvedValue(userResponse as any);

            // act
            await authController.register(req as any, res as any);

            // assert
            expect(mockedValidateDto).toHaveBeenCalledWith(
                RegisterDto,
                registerData,
                req,
                res
            );
            expect(mockedAuthService.register).toHaveBeenCalledWith(registerData);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(userResponse);
        });

        it('should return 400 when validation fails', async () => {
            // arrange
            const invalidData = { email: 'wrongemail', password: 'short' };
            const req = createMockRequest(invalidData);
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(null);

            // act
            await authController.register(req as any, res as any);

            // assert
            expect(mockedValidateDto).toHaveBeenCalled();
            expect(mockedAuthService.register).not.toHaveBeenCalled();
        });

        // ДОБАВЛЕННЫЙ ТЕСТ: регистрация с уже существующей почтой
        it('should return 400 when user already exists', async () => {
            // arrange
            const registerData = {
                username: 'username',
                email: 'existing@email.com',
                password: 'password'
            };

            const req = createMockRequest(registerData);
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(registerData as RegisterDto);
            mockedAuthService.register.mockRejectedValue(new Error('User already exists'));

            // act
            await authController.register(req as any, res as any);

            // assert
            expect(mockedValidateDto).toHaveBeenCalledWith(
                RegisterDto,
                registerData,
                req,
                res
            );
            expect(mockedAuthService.register).toHaveBeenCalledWith(registerData);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'User already exists' });
        });
    });

    describe('Login', () => {
        it('should login user successfully and return token', async () => {
            // arrange
            const loginData = {
                email: 'email@email.com',
                password: 'password'
            };

            const loginResponse = { token: 'tokentokentoken' };

            const req = createMockRequest(loginData);
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(loginData as LoginDto);
            mockedAuthService.login.mockResolvedValue(loginResponse as any);

            // act
            await authController.login(req as any, res as any);

            // assert
            expect(mockedValidateDto).toHaveBeenCalledWith(
                LoginDto,
                loginData,
                req,
                res
            );
            expect(mockedAuthService.login).toHaveBeenCalledWith(loginData);
            expect(res.json).toHaveBeenCalledWith(loginResponse);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should return 401 for invalid credentials', async () => {
            // arrange
            const loginData = {
                email: 'email@mail.com',
                password: 'wrongpassword'
            };

            const req = createMockRequest(loginData);
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(loginData as LoginDto);
            mockedAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

            // act
            await authController.login(req as any, res as any);

            // assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
        });

        it('should return 400 when login validation fails', async () => {
            // arrange
            const invalidData = { email: 'wrongemail' };
            const req = createMockRequest(invalidData);
            const res = createMockResponse();

            mockedValidateDto.mockResolvedValue(null);

            // act
            await authController.login(req as any, res as any);

            // assert
            expect(mockedAuthService.login).not.toHaveBeenCalled();
        });
    });

    describe('Verify token', () => {
        it('should verify valid token and return user data', async () => {
            // arrange
            const token = 'tokentokentoken';
            const user = { id: 1, email: 'email@email.com', role: 'user' };

            const req = createMockRequest(
                {},
                { authorization: `Bearer ${token}` }
            );
            const res = createMockResponse();

            mockedAuthService.verifyToken.mockResolvedValue(user as any);

            // act
            await authController.verifyToken(req as any, res as any);

            // assert
            expect(mockedAuthService.verifyToken).toHaveBeenCalledWith(token);
            expect(res.json).toHaveBeenCalledWith({ user });
        });

        it('should return 401 when token not provided', async () => {
            // arrange
            const req = createMockRequest({}, {});
            const res = createMockResponse();

            // act
            await authController.verifyToken(req as any, res as any);

            // assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Token not provided' });
            expect(mockedAuthService.verifyToken).not.toHaveBeenCalled();
        });

        it('should return 401 when token is invalid', async () => {
            // arrange
            const token = 'tokentokentoken';
            const req = createMockRequest(
                {},
                { authorization: `Bearer ${token}` }
            );
            const res = createMockResponse();

            mockedAuthService.verifyToken.mockRejectedValue(new Error('Invalid token'));

            // act
            await authController.verifyToken(req as any, res as any);

            // assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        });

        it('should handle authorization header with wrong format', async () => {
            // arrange
            const req = createMockRequest(
                {},
                { authorization: 'InvalidFormat' }
            );
            const res = createMockResponse();

            // act
            await authController.verifyToken(req as any, res as any);

            // assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Token not provided' });
        });
    });
});
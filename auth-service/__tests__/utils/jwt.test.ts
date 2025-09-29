import * as jwt from 'jsonwebtoken';
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from 'jsonwebtoken';
import { UserEntity } from '../../src/models/user.entity';
import { RoleEnum } from '../../src/models/role.enum';

jest.mock('dotenv', () => ({
    config: jest.fn()
}));

jest.mock('jsonwebtoken');
const mockedJwt = jest.mocked(jwt);

interface TokenPayload {
    id: number;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
    [key: string]: any;
}

describe('JWT utils', () => {
    const mockUser: UserEntity = {
        id: 1,
        username: 'username',
        email: 'email@mail.com',
        password: 'hashedpassword',
        role: RoleEnum.USER,
        created_at: new Date('2025-09-25')
    } as UserEntity;

    const mockAdminUser: UserEntity = {
        id: 2,
        username: 'admin',
        email: 'admin@mail.com',
        password: 'hashedpassword',
        role: RoleEnum.ADMIN,
        created_at: new Date('2025-09-25')
    } as UserEntity;

    let generateToken: any;
    let verifyToken: any;

    beforeAll(async () => {
        process.env.JWT_SECRET = 'secretsecretsecret';
        process.env.JWT_EXPIRES_IN = '3600';

        const jwtModule = await import('../../src/utils/jwt');
        generateToken = jwtModule.generateToken;
        verifyToken = jwtModule.verifyToken;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Generate token', () => {
        it('should generate token successfully for regular user', () => {
            // arrange
            const expectedToken = 'tokentokentoken';
            mockedJwt.sign.mockReturnValue(expectedToken as any);

            // act
            const result = generateToken(mockUser);

            // assert
            expect(mockedJwt.sign).toHaveBeenCalledWith(
                {
                    id: mockUser.id,
                    email: mockUser.email,
                    role: mockUser.role
                },
                'secretsecretsecret',
                { expiresIn: 3600 }
            );
            expect(result).toBe(expectedToken);
        });

        it('should successfully generate token for admin user', () => {
            // arrange
            const expectedToken = 'admintokentokentoken';
            mockedJwt.sign.mockReturnValue(expectedToken as any);

            // act
            const result = generateToken(mockAdminUser);

            // assert
            expect(mockedJwt.sign).toHaveBeenCalledWith(
                {
                    id: mockAdminUser.id,
                    email: mockAdminUser.email,
                    role: RoleEnum.ADMIN
                },
                'secretsecretsecret',
                { expiresIn: 3600 }
            );
            expect(result).toBe(expectedToken);
        });

        it('should include correct payload structure in generated token', () => {
            // arrange
            const expectedToken = 'tokentokenoken';
            mockedJwt.sign.mockReturnValue(expectedToken as any);

            // act
            const result = generateToken(mockUser);

            // assert
            const expectedPayload = {
                id: mockUser.id,
                email: mockUser.email,
                role: mockUser.role
            };
            expect(mockedJwt.sign).toHaveBeenCalledWith(
                expectedPayload,
                'secretsecretsecret',
                { expiresIn: 3600 }
            );

            const actualPayload = mockedJwt.sign.mock.calls[0][0] as TokenPayload;
            expect(actualPayload).toHaveProperty('id');
            expect(actualPayload).toHaveProperty('email');
            expect(actualPayload).toHaveProperty('role');
            expect(actualPayload.id).toBe(mockUser.id);
            expect(actualPayload.email).toBe(mockUser.email);
            expect(actualPayload.role).toBe(mockUser.role);
        });
    });

    describe('Verify token', () => {
        it('should successfully verify valid token and return complete payload', () => {
            // arrange
            const token = 'tokentokenoken';
            const expectedPayload = {
                id: 1,
                email: 'email@mail.com',
                role: 'user',
                iat: 1516239022,
                exp: 1516242622
            };

            mockedJwt.verify.mockReturnValue(expectedPayload as any);

            // act
            const result = verifyToken(token);

            // assert
            expect(mockedJwt.verify).toHaveBeenCalledWith(token, 'secretsecretsecret');
            expect(result.id).toBe(1);
            expect(result.email).toBe('email@mail.com');
            expect(result.role).toBe('user');
        });

        it('should verify token with admin role correctly', () => {
            // arrange
            const token = 'tokentokenoken';
            const adminPayload = {
                id: 2,
                email: 'admin@mail.com',
                role: 'admin'
            };

            mockedJwt.verify.mockReturnValue(adminPayload as any);

            // act
            const result = verifyToken(token) as TokenPayload;

            // assert
            expect(result.role).toBe('admin');
            expect(result.id).toBe(2);
            expect(result.email).toBe('admin@mail.com');
        });

        it('should throw specific error for expired token', () => {
            // arrange
            const token = 'expiredtokentorentoken';
            const expiredError = new TokenExpiredError(
                'jwt expired',
                new Date(Date.now() - 1000)
            );

            mockedJwt.verify.mockImplementation(() => {
                throw expiredError;
            });

            // act
            const verifyTokenCall = () => verifyToken(token);

            // assert
            expect(verifyTokenCall).toThrow('Invalid or expired token');
            expect(mockedJwt.verify).toHaveBeenCalledWith(token, 'secretsecretsecret');
        });
    });

    describe('Security cases', () => {
        it('should not expose sensitive information in error messages for JWT-specific errors', () => {
            // arrange
            const token = 'tokentokenoken';
            const jwtError = new JsonWebTokenError('Secret "secretsecretsecret" is invalid');

            mockedJwt.verify.mockImplementation(() => {
                throw jwtError;
            });

            // act
            const verifyDangerousToken = () => verifyToken(token);

            // assert
            expect(verifyDangerousToken).toThrow('Invalid or expired token');
        });
    });

    describe('Business logic validation', () => {
        it('should validate token payload structure after verification', () => {
            // arrange
            const token = 'tokentokenoken';
            const incompletePayload: TokenPayload = {
                id: 1,
                role: 'user'
            } as TokenPayload;

            mockedJwt.verify.mockReturnValue(incompletePayload as any);

            // act
            const result = verifyToken(token);

            // assert
            expect(result).toEqual(incompletePayload);
        });

        it('should handle tokens with extra fields in payload', () => {
            // arrange
            const token = 'tokenwithextrafields';
            const extendedPayload: TokenPayload = {
                id: 1,
                email: 'email@mail.com',
                role: 'user',
                extraField: 'should be ignored',
                anotherField: 123
            };

            mockedJwt.verify.mockReturnValue(extendedPayload as any);

            // act
            const result = verifyToken(token) as TokenPayload;

            // assert
            expect(result.id).toBe(1);
            expect(result.email).toBe('email@mail.com');
            expect(result.role).toBe('user');
        });
    });
});
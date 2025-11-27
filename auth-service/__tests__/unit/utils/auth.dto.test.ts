import { validate } from 'class-validator';
import { RegisterDto, LoginDto } from '../../../src/dto/auth.dto';

describe('Auth DTOs', () => {
    describe('Register DTO', () => {
        it('should validate correct register data', async () => {
            // arrange
            const dto = new RegisterDto();
            dto.username = 'username';
            dto.email = 'email@mail.com';
            dto.password = 'password';

            // act
            const errors = await validate(dto);

            // assert
            expect(errors.length).toBe(0);
        });

        it('should fail validation when username is too short', async () => {
            // arrange
            const dto = new RegisterDto();
            dto.username = 'ab';
            dto.email = 'email@mail.com';
            dto.password = 'password';

            // act
            const errors = await validate(dto);

            // assert
            expect(errors.length).toBe(1);
            expect(errors[0].property).toBe('username');
            expect(errors[0].constraints).toHaveProperty('isLength');
        });

        it('should fail validation when email is invalid', async () => {
            // arrange
            const dto = new RegisterDto();
            dto.username = 'username';
            dto.email = 'invalidemail';
            dto.password = 'password';

            // act
            const errors = await validate(dto);

            // assert
            expect(errors.length).toBe(1);
            expect(errors[0].property).toBe('email');
            expect(errors[0].constraints).toHaveProperty('isEmail');
        });

        it('should fail validation when password is too short', async () => {
            // arrange
            const dto = new RegisterDto();
            dto.username = 'username';
            dto.email = 'email@mail.com';
            dto.password = 'short';

            // act
            const errors = await validate(dto);

            // assert
            expect(errors.length).toBe(1);
            expect(errors[0].property).toBe('password');
            expect(errors[0].constraints).toHaveProperty('isLength');
        });

        it('should fail validation when required fields are missing', async () => {
            // arrange
            const dto = new RegisterDto();

            // act
            const errors = await validate(dto);

            // assert
            expect(errors.length).toBe(3);
            expect(errors.map(e => e.property)).toEqual(['username', 'email', 'password']);
        });
    });

    describe('Login DTO', () => {
        it('should validate correct login data', async () => {
            // arrange
            const dto = new LoginDto();
            dto.email = 'email@mail.com';
            dto.password = 'password';

            // act
            const errors = await validate(dto);

            // assert
            expect(errors.length).toBe(0);
        });

        it('should fail validation when email is invalid', async () => {
            // arrange
            const dto = new LoginDto();
            dto.email = 'invalidemail';
            dto.password = 'password';

            // act
            const errors = await validate(dto);

            // assert
            expect(errors.length).toBe(1);
            expect(errors[0].property).toBe('email');
            expect(errors[0].constraints).toHaveProperty('isEmail');
        });

        it('should fail validation when password is too short', async () => {
            // arrange
            const dto = new LoginDto();
            dto.email = 'email@mail.com';
            dto.password = 'short';

            // act
            const errors = await validate(dto);

            // assert
            expect(errors.length).toBe(1);
            expect(errors[0].property).toBe('password');
            expect(errors[0].constraints).toHaveProperty('isLength');
        });

        it('should fail validation when required fields are missing', async () => {
            // arrange
            const dto = new LoginDto();

            // act
            const errors = await validate(dto);

            // asssert
            expect(errors.length).toBe(2);
            expect(errors.map(e => e.property)).toEqual(['email', 'password']);
        });
    });
});
import { validateDto } from "../../src/utils/validate.util";
import { CreatePropertyDto } from "../../src/dto/property.dto";

describe('Validate util', () => {
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    it('should return validated DTO when valid', async () => {
        //arrange
        const validData = {
            title: 'Property',
            rentalType: 'monthly',
            price: 10000,
            location: 'Location',
            propertyType: 'apartment'
        };

        //act
        const result = await validateDto(CreatePropertyDto, validData, mockRequest, mockResponse);

        //assert
        expect(result).toBeInstanceOf(CreatePropertyDto);
        expect(result).toEqual(validData);
    });

    it('should return null and send 400 when invalid', async () => {
        //arrange
        const invalidData = {
            title: '',
            price: -100
        };

        //act
        const result = await validateDto(CreatePropertyDto, invalidData, mockRequest, mockResponse);

        //assert
        expect(result).toBeNull();
        expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
});
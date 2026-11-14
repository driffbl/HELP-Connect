const generateOTP = require('../src/utils/generateOTP');

describe('OTP Generation Unit Test', () => {
  test('should return a string of exactly 6 digits', () => {
    const otp = generateOTP();
    expect(otp).toHaveLength(6); 
    expect(otp).toMatch(/^\d+$/); 
  });
});
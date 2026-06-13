export const TEST_PASSWORD = 'test-password-123';

export const TEST_LANDLORD = {
  email: 'test-landlord@renting.berlin',
  password: TEST_PASSWORD,
  name: 'Test Landlord',
  handle: 'test_landlord',
} as const;

export const TEST_SEEKER = {
  email: 'test-seeker@renting.berlin',
  password: TEST_PASSWORD,
  name: 'Test Seeker',
  handle: 'test_seeker',
} as const;

export const TEST_STRANGER = {
  email: 'test-stranger@renting.berlin',
  password: TEST_PASSWORD,
  name: 'Test Stranger',
  handle: 'test_stranger',
} as const;

export const TEST_LISTING = {
  shortCode: 'testlst1',
  title: 'Test flat for integration',
} as const;

export const TEST_SEEKER_PROFILE = {
  slug: 'test-seeker-profile',
  title: 'Test seeker looking for a room',
} as const;

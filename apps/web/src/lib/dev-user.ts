/** Client-safe defaults — env overrides apply on the server via getDevAccounts(). */
const DEFAULT_DEV_ACCOUNTS = [
  { email: 'dev@renting.berlin', password: 'devdevdev', name: 'Dev Seeker' },
  { email: 'landlord@renting.berlin', password: 'devdevdev', name: 'Dev Landlord' },
] as const;

export type DevAccount = (typeof DEFAULT_DEV_ACCOUNTS)[number];

export function getDevAccounts(): DevAccount[] {
  return [
    {
      email: process.env.DEV_USER_EMAIL ?? DEFAULT_DEV_ACCOUNTS[0].email,
      password: process.env.DEV_USER_PASSWORD ?? DEFAULT_DEV_ACCOUNTS[0].password,
      name: process.env.DEV_USER_NAME ?? DEFAULT_DEV_ACCOUNTS[0].name,
    },
    {
      email: process.env.DEV_LANDLORD_EMAIL ?? DEFAULT_DEV_ACCOUNTS[1].email,
      password: process.env.DEV_LANDLORD_PASSWORD ?? DEFAULT_DEV_ACCOUNTS[1].password,
      name: process.env.DEV_LANDLORD_NAME ?? DEFAULT_DEV_ACCOUNTS[1].name,
    },
  ];
}

export const DEV_SEEKER = DEFAULT_DEV_ACCOUNTS[0];
export const DEV_LANDLORD = DEFAULT_DEV_ACCOUNTS[1];
/** @deprecated Use DEV_SEEKER */
export const DEV_USER = DEV_SEEKER;
export const DEV_ACCOUNTS = DEFAULT_DEV_ACCOUNTS;

export const showDevLogin =
  (typeof import.meta !== 'undefined' && import.meta.env?.DEV === true) ||
  process.env.PUBLIC_ENABLE_DEV_LOGIN === 'true';

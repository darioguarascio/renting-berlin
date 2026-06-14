/// <reference types="astro/client" />

declare module '*.txt?raw' {
  const content: string;
  export default content;
}

import type { Session } from './lib/auth';

declare namespace App {
  interface Locals {
    session: Session | null;
  }
}

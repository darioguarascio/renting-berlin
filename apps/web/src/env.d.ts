/// <reference types="astro/client" />

import type { Session } from './lib/auth';

declare namespace App {
  interface Locals {
    session: Session | null;
  }
}

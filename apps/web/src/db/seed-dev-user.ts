import { auth } from '../lib/auth';
import { getDevAccounts } from '../lib/dev-user';

async function ensureAccount(email: string, password: string, name: string) {
  try {
    await auth.api.signUpEmail({ body: { email, password, name } });
    console.log(`Created: ${email}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes('already') || message.toLowerCase().includes('exists')) {
      console.log(`Already exists: ${email}`);
    } else {
      throw err;
    }
  }
}

async function seedDevUser() {
  for (const account of getDevAccounts()) {
    await ensureAccount(account.email, account.password, account.name);
  }

  console.log('');
  console.log('  Dev login credentials (password for both: devdevdev):');
  for (const account of getDevAccounts()) {
    console.log(`  ${account.name.padEnd(14)} ${account.email}`);
  }
  console.log('');
}

seedDevUser().catch((err) => {
  console.error(err);
  process.exit(1);
});

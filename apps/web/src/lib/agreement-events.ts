import { REDIS_KEYS } from './redis';
import { enqueueStreamEvent } from './queue-stream';

export type AgreementJobType = 'signed';

export type AgreementJob = {
  type: AgreementJobType;
  agreementId: string;
};

function agreementsSyncEnabled(): boolean {
  // PDF generation lives in the Python worker; there is no in-process fallback.
  return process.env.AGREEMENTS_SYNC === '1';
}

/**
 * Enqueues a job for the agreements worker, which renders the stored contract
 * markdown to a PDF and emails it to both parties. Best-effort: callers should
 * not let a failure here block the signing flow.
 */
export async function enqueueAgreementJob(job: AgreementJob): Promise<void> {
  if (agreementsSyncEnabled()) return;

  await enqueueStreamEvent(REDIS_KEYS.agreementEvents, {
    type: job.type,
    agreementId: job.agreementId,
  });
}

export function parseAgreementJob(data: Record<string, string>): AgreementJob | null {
  const { type, agreementId } = data;
  if (type !== 'signed') return null;
  if (!agreementId) return null;
  return { type, agreementId };
}

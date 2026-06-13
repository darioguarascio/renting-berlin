import { describe, expect, it } from 'vitest';
import { defaultTemplateLabel } from './message-template';

describe('defaultTemplateLabel', () => {
  it('uses the first line when short enough', () => {
    expect(defaultTemplateLabel('Hello, I am interested in your flat.')).toBe(
      'Hello, I am interested in your flat.',
    );
  });

  it('truncates long first lines', () => {
    const body = 'A'.repeat(60);
    expect(defaultTemplateLabel(body)).toBe(`${'A'.repeat(45)}…`);
  });

  it('falls back for blank bodies', () => {
    expect(defaultTemplateLabel('')).toBe('Untitled template');
    expect(defaultTemplateLabel('   ')).toBe('Untitled template');
  });
});

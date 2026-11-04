import { describe, expect, it } from 'vitest';
import { previewOptions, loadPreviewConfig } from '../../scripts/preview-options.ts';

describe('developer preview safety', () => {
  it('defaults to a dry run with package-relative output and no deployment config', () => {
    const options = previewOptions('persona-samples', [], {});
    expect(options.run).toBe(false);
    expect(options.output.replaceAll('\\', '/')).toMatch(/coo-draw\/\.preview\/persona-samples$/);
    expect(options.config).toBeUndefined();
    expect(loadPreviewConfig(options)).toEqual({});
  });
  it('requires explicit config before running against a service', () => {
    expect(() => previewOptions('persona-samples', ['--run'], {})).toThrow('--run requires');
  });
  it('accepts environment overrides and preserves positional reference compatibility', () => {
    const options = previewOptions('reference-retry', ['image.png', '0.6'], { COOPANION_CONFIG: 'fixture.json', COOPANION_PREVIEW_DIR: 'fixture-output' });
    expect(options.config).toMatch(/fixture\.json$/);
    expect(options.reference).toMatch(/image\.png$/);
    expect(options.denoise).toBe(0.6);
    expect(options.run).toBe(false);
  });
  it.each(['NaN', '0', '-1', '1.2'])('rejects invalid denoise %s before any requests', denoise => {
    expect(() => previewOptions('reference-retry', ['--denoise', denoise], {})).toThrow('--denoise');
  });
});

import { describe, expect, it } from 'vitest';
import { popupHtml } from '../src/popup.ts';

describe('popupHtml', () => {
  it('renders the image, the duration and click-through', () => {
    const html = popupHtml('data:image/png;base64,AAAA', { duration: 6, scale: 1.2 });
    expect(html).toContain('data:image/png;base64,AAAA');
    expect(html).toContain('DURATION=6');
    expect(html).toContain('SCALE=1.2');
    expect(html).toContain('setInteractive(false)');
    expect(html).toContain("window.close()");
  });

  it('clamps duration, scale and radius', () => {
    const html = popupHtml('data:image/png;base64,AAAA', { duration: 99, scale: 9, radius: 999 });
    expect(html).toContain('DURATION=30');
    expect(html).toContain('SCALE=2');
    expect(html).toContain('RADIUS=64');
  });
});

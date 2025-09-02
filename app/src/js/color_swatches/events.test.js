import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ColorSwatch, ColorSwatches } from './color-swatches.js';

describe('ColorSwatches Event Handling', () => {
  beforeEach(() => {
    // Clear any existing custom elements and re-register
    if (!customElements.get('color-swatch')) {
      customElements.define('color-swatch', ColorSwatch);
    }
    if (!customElements.get('color-swatches')) {
      customElements.define('color-swatches', ColorSwatches);
    }
  });

  it('should dispatch swatch-click event when a swatch is clicked', () => {
    const container = document.createElement('color-swatches');
    document.body.appendChild(container);

    // Set up colors
    container.colors = [
      { id: 'test-red', color: '#ff0000' },
      { id: 'test-blue', color: '#0000ff' }
    ];

    // Create event listener spy
    const eventSpy = vi.fn();
    container.addEventListener('swatch-click', eventSpy);

    // Get the first swatch and click it
    const firstSwatch = container.children[0];
    firstSwatch.click();

    // Verify event was dispatched
    expect(eventSpy).toHaveBeenCalledOnce();

    const eventDetail = eventSpy.mock.calls[0][0].detail;
    expect(eventDetail.id).toBe('test-red');
    expect(eventDetail.color).toBe('#ff0000');
    expect(eventDetail.element).toBe(firstSwatch);

    document.body.removeChild(container);
  });

  it('should dispatch correct event details for different swatches', () => {
    const container = document.createElement('color-swatches');
    document.body.appendChild(container);

    container.colors = [
      { id: 'swatch-1', color: '#123456' },
      { id: 'swatch-2', color: '#abcdef' },
      { id: 'swatch-3', color: '#fedcba' }
    ];

    const eventSpy = vi.fn();
    container.addEventListener('swatch-click', eventSpy);

    // Click the second swatch
    const secondSwatch = container.children[1];
    secondSwatch.click();

    expect(eventSpy).toHaveBeenCalledOnce();
    const eventDetail = eventSpy.mock.calls[0][0].detail;
    expect(eventDetail.id).toBe('swatch-2');
    expect(eventDetail.color).toBe('#abcdef');
    expect(eventDetail.element).toBe(secondSwatch);

    document.body.removeChild(container);
  });

  it('should handle events bubbling from nested elements', () => {
    const container = document.createElement('color-swatches');
    document.body.appendChild(container);

    container.colors = [{ id: 'bubble-test', color: '#ff00ff' }];

    const eventSpy = vi.fn();
    container.addEventListener('swatch-click', eventSpy);

    // Create a click event that bubbles up from within the swatch
    const swatch = container.children[0];
    const clickEvent = new MouseEvent('click', { bubbles: true });
    swatch.dispatchEvent(clickEvent);

    expect(eventSpy).toHaveBeenCalledOnce();
    const eventDetail = eventSpy.mock.calls[0][0].detail;
    expect(eventDetail.id).toBe('bubble-test');
    expect(eventDetail.color).toBe('#ff00ff');

    document.body.removeChild(container);
  });

  it('should handle swatch with target attribute correctly', () => {
    const container = document.createElement('color-swatches');
    document.body.appendChild(container);

    // Create a swatch manually with target attribute
    const swatch = document.createElement('color-swatch');
    swatch.setAttribute('target', 'manual-target');
    swatch.setAttribute('color', '#00ff00');
    container.appendChild(swatch);

    const eventSpy = vi.fn();
    container.addEventListener('swatch-click', eventSpy);

    swatch.click();

    expect(eventSpy).toHaveBeenCalledOnce();
    const eventDetail = eventSpy.mock.calls[0][0].detail;
    expect(eventDetail.id).toBe('manual-target');
    expect(eventDetail.color).toBe('#00ff00');

    document.body.removeChild(container);
  });

  it('should handle swatch without target attribute', () => {
    const container = document.createElement('color-swatches');
    document.body.appendChild(container);

    // Create a swatch without target attribute
    const swatch = document.createElement('color-swatch');
    swatch.setAttribute('color', '#ffff00');
    container.appendChild(swatch);

    const eventSpy = vi.fn();
    container.addEventListener('swatch-click', eventSpy);

    swatch.click();

    expect(eventSpy).toHaveBeenCalledOnce();
    const eventDetail = eventSpy.mock.calls[0][0].detail;
    expect(eventDetail.id).toBe('unknown'); // fallback value
    expect(eventDetail.color).toBe('#ffff00');

    document.body.removeChild(container);
  });

  it('should clean up event listeners on disconnect', () => {
    const container = document.createElement('color-swatches');
    document.body.appendChild(container);

    container.colors = [{ id: 'cleanup-test', color: '#000000' }];

    const eventSpy = vi.fn();
    container.addEventListener('swatch-click', eventSpy);

    // Verify event works before disconnect
    container.children[0].click();
    expect(eventSpy).toHaveBeenCalledOnce();

    // Disconnect and reconnect
    document.body.removeChild(container);
    document.body.appendChild(container);

    // Event should still work after reconnect (new listener attached)
    container.children[0].click();
    expect(eventSpy).toHaveBeenCalledTimes(2);

    document.body.removeChild(container);
  });
});

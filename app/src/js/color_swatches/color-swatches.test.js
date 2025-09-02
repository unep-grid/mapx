import { describe, it, expect, beforeEach } from 'vitest';
import { ColorSwatch, ColorSwatches } from './color-swatches.js';

describe('ColorSwatch Component', () => {
  beforeEach(() => {
    // Clear any existing custom elements and re-register
    if (!customElements.get('color-swatch')) {
      customElements.define('color-swatch', ColorSwatch);
    }
  });

  it('should create a ColorSwatch element', () => {
    const swatch = document.createElement('color-swatch');
    expect(swatch).toBeInstanceOf(ColorSwatch);
    expect(swatch.shadowRoot).toBeTruthy();
  });

  it('should have default color when no color attribute is set', () => {
    const swatch = document.createElement('color-swatch');
    expect(swatch.color).toBe('#ccc');
  });

  it('should set and get color attribute correctly', () => {
    const swatch = document.createElement('color-swatch');
    swatch.color = '#ff0000';
    expect(swatch.color).toBe('#ff0000');
    expect(swatch.getAttribute('color')).toBe('#ff0000');
  });

  it('should update color when attribute changes', () => {
    const swatch = document.createElement('color-swatch');
    document.body.appendChild(swatch);

    swatch.setAttribute('color', '#00ff00');
    expect(swatch.color).toBe('#00ff00');

    document.body.removeChild(swatch);
  });

  it('should render with correct background color in shadow DOM', () => {
    const swatch = document.createElement('color-swatch');
    swatch.color = '#ff0000';
    document.body.appendChild(swatch);

    const shadowContent = swatch.shadowRoot.innerHTML;
    expect(shadowContent).toContain('background: #ff0000');

    document.body.removeChild(swatch);
  });
});

describe('ColorSwatches Container', () => {
  beforeEach(() => {
    // Clear any existing custom elements and re-register
    if (!customElements.get('color-swatches')) {
      customElements.define('color-swatches', ColorSwatches);
    }
    if (!customElements.get('color-swatch')) {
      customElements.define('color-swatch', ColorSwatch);
    }
  });

  it('should create a ColorSwatches container', () => {
    const container = document.createElement('color-swatches');
    expect(container).toBeInstanceOf(ColorSwatches);
    expect(container.shadowRoot).toBeTruthy();
  });

  it('should have empty colors array by default', () => {
    const container = document.createElement('color-swatches');
    expect(container.colors).toEqual([]);
  });

  it('should set colors array and create child swatches', () => {
    const container = document.createElement('color-swatches');
    document.body.appendChild(container);

    const testColors = [
      { id: 'red', color: '#ff0000' },
      { id: 'green', color: '#00ff00' },
      { id: 'blue', color: '#0000ff' }
    ];

    container.colors = testColors;

    expect(container.colors).toEqual(testColors);
    expect(container.children.length).toBe(3);
    expect(container.children[0].tagName.toLowerCase()).toBe('color-swatch');
    expect(container.children[0].getAttribute('color')).toBe('#ff0000');
    expect(container.children[0].getAttribute('target')).toBe('red');

    document.body.removeChild(container);
  });

  it('should handle slant attribute correctly', () => {
    const container = document.createElement('color-swatches');
    expect(container.slant).toBe('12px'); // default

    container.slant = '20px';
    expect(container.slant).toBe('20px');
    expect(container.getAttribute('slant')).toBe('20px');
  });

  it('should parse colors from JSON string attribute', () => {
    const container = document.createElement('color-swatches');
    document.body.appendChild(container);

    const colorsJson = JSON.stringify([
      { id: 'test1', color: '#123456' },
      { id: 'test2', color: '#abcdef' }
    ]);

    container.setAttribute('colors', colorsJson);

    expect(container.colors.length).toBe(2);
    expect(container.colors[0].id).toBe('test1');
    expect(container.colors[0].color).toBe('#123456');

    document.body.removeChild(container);
  });

  it('should ignore invalid colors array', () => {
    const container = document.createElement('color-swatches');
    const originalColors = container.colors;

    // Try to set non-array value
    container.colors = 'not an array';
    expect(container.colors).toEqual(originalColors);

    container.colors = null;
    expect(container.colors).toEqual(originalColors);
  });
});

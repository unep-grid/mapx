import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Geocoder } from './index.js';

// Mock mapboxgl
vi.mock('../mx', () => ({
  mapboxgl: {
    Marker: class {
      constructor() {
        this.element = document.createElement('div');
      }
      setLngLat(coords) {
        this._lngLat = coords;
        return this;
      }
      addTo() {
        return this;
      }
      remove() {}
      getElement() {
        return this.element;
      }
    }
  }
}));

describe('Geocoder', () => {
  let geocoder;
  let mockMap;
  let mockElement;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockElement = document.createElement('div');
    mockMap = {
      getCenter: () => ({ lat: 0, lng: 0 }),
      getBounds: () => [[-180, -90], [180, 90]],
      flyTo: vi.fn(),
      fitBounds: vi.fn()
    };

    // Mock fetch responses
    global.fetch = vi.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [2.3522, 48.8566]
            },
            properties: {
              name: 'Paris',
              city: 'Paris',
              country: 'France',
              osm_type: 'N'
            }
          }]
        })
      })
    );
  });

  describe('Initialization', () => {
    it('should initialize with valid configuration', async () => {
      geocoder = new Geocoder();
      await geocoder.init({
        elTarget: mockElement,
        map: mockMap
      });

      expect(geocoder.config).toBeDefined();
      expect(geocoder.config.language).toBe('en');
      expect(geocoder.config.limit).toBe(50);
    });

    it('should throw error when initialized without target element', async () => {
      geocoder = new Geocoder();
      await expect(geocoder.init({
        map: mockMap
      })).rejects.toThrow('Geocoder : no target');
    });
  });

  describe('API Interaction', () => {
    it('should build search URL with correct parameters', async () => {
      geocoder = new Geocoder();
      await geocoder.init({
        elTarget: mockElement,
        map: mockMap,
        language: 'fr'
      });

      const url = geocoder.buildSearchURL('Paris');
      expect(url.toString()).toContain('https://photon.komoot.io/');
      expect(url.searchParams.get('q')).toBe('Paris');
      expect(url.searchParams.get('lang')).toBe('fr');
      expect(url.searchParams.get('limit')).toBe('50');
    });

    it('should include proximity parameters when enabled', async () => {
      geocoder = new Geocoder();
      await geocoder.init({
        elTarget: mockElement,
        map: mockMap,
        proximity: true
      });

      const url = geocoder.buildSearchURL('Paris');
      expect(url.searchParams.get('lat')).toBe('0');
      expect(url.searchParams.get('lon')).toBe('0');
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn(() => 
        Promise.resolve({
          ok: false,
          status: 404
        })
      );

      geocoder = new Geocoder();
      await geocoder.init({
        elTarget: mockElement,
        map: mockMap
      });

      await expect(geocoder.fetchGeoJSON('invalid')).rejects.toThrow('HTTP error! status: 404');
    });

    it('should abort pending requests when new search is initiated', async () => {
      // Mock a slow fetch
      global.fetch = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const abortSpy = vi.fn();
      const mockController = { abort: abortSpy, signal: {} };
      global.AbortController = vi.fn(() => mockController);

      geocoder = new Geocoder();
      await geocoder.init({
        elTarget: mockElement,
        map: mockMap
      });

      // Start first request
      geocoder._executeSearch('first');
      
      // Start second request immediately
      geocoder._executeSearch('second');
      
      expect(abortSpy).toHaveBeenCalledWith(geocoder.config.errors.abord_new_query);
      
      // Clean up
      geocoder.destroy();
    });
  });

  describe('Location Processing', () => {
    it('should format location string correctly', async () => {
      geocoder = new Geocoder();
      await geocoder.init({
        elTarget: mockElement,
        map: mockMap
      });

      const location = geocoder.formatLocationString({
        name: 'Paris',
        city: 'Paris',
        state: 'Île-de-France',
        country: 'France'
      });

      expect(location).toBe('Paris, Paris, Île-de-France, France');
    });

    it('should handle missing location properties', async () => {
      geocoder = new Geocoder();
      await geocoder.init({
        elTarget: mockElement,
        map: mockMap
      });

      const location = geocoder.formatLocationString({
        name: 'Paris',
        country: 'France'
      });

      expect(location).toBe('Paris, France');
    });

    it('should convert OSM node types to correct icon classes', async () => {
      geocoder = new Geocoder();
      await geocoder.init({
        elTarget: mockElement,
        map: mockMap
      });

      expect(geocoder.osmNodeToIconClass({ osm_type: 'N' })).toBe('gcm--node');
      expect(geocoder.osmNodeToIconClass({ osm_type: 'W' })).toBe('gcm--way');
      expect(geocoder.osmNodeToIconClass({ osm_type: 'R' })).toBe('gcm--relation');
    });
  });

  describe('Callbacks', () => {
    it('should call onLocationSelect when location is selected', async () => {
      const onLocationSelect = vi.fn();
      geocoder = new Geocoder();
      await geocoder.init({
        elTarget: mockElement,
        map: mockMap,
        onLocationSelect
      });

      const mockResult = {
        feature: {
          geometry: { coordinates: [2.3522, 48.8566] },
          properties: {}
        }
      };

      geocoder.handleLocationSelect(mockResult);
      expect(onLocationSelect).toHaveBeenCalledWith(mockResult);
    });

    it('should call onGeoJSONSave when saving features', async () => {
      const onGeoJSONSave = vi.fn();
      geocoder = new Geocoder();
      await geocoder.init({
        elTarget: mockElement,
        map: mockMap,
        onGeoJSONSave
      });

      const mockFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [2.3522, 48.8566]
        }
      };

      // Add a marker
      const marker = geocoder.addMarker({ feature: mockFeature });
      
      // Save GeoJSON
      await geocoder.saveToGeoJSON();

      expect(onGeoJSONSave).toHaveBeenCalledWith({
        type: 'FeatureCollection',
        features: [mockFeature]
      });
    });
  });
});

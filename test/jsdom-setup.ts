import { JSDOM } from 'jsdom';
import '@testing-library/jest-dom';

const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).navigator = dom.window.navigator;
(global as any).HTMLInputElement = dom.window.HTMLInputElement;
(global as any).HTMLSelectElement = dom.window.HTMLSelectElement;
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).Element = dom.window.Element;
(global as any).Node = dom.window.Node;
(global as any).Event = dom.window.Event;
(global as any).SVGElement = dom.window.SVGElement;

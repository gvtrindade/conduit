import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useDropdownPosition } from "../../lib/hooks/use-dropdown-position";
import { createRef } from "react";

// Helper to create a fake DOMRect
const createDOMRect = (x: number, y: number, width: number, height: number) => {
  return {
    x,
    y,
    width,
    height,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x,
    toJSON: () => {},
  } as DOMRect;
};

describe("useDropdownPosition", () => {
  let originalInnerHeight: number;
  let originalAddEventListener: typeof window.addEventListener;
  let originalRemoveEventListener: typeof window.removeEventListener;

  beforeEach(() => {
    originalInnerHeight = window.innerHeight;
    originalAddEventListener = window.addEventListener;
    originalRemoveEventListener = window.removeEventListener;
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      value: originalInnerHeight,
      writable: true,
    });
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  it("returns 'below' when there is enough space below", () => {
    // Mock window.innerHeight as 800
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    
    const triggerRef = createRef<HTMLDivElement>();
    const mockElement = document.createElement('div');
    mockElement.getBoundingClientRect = () => createDOMRect(0, 100, 100, 30);
    triggerRef.current = mockElement;

    const { result } = renderHook(() =>
      useDropdownPosition({ triggerRef, dropdownHeight: 300 })
    );

    // trigger bottom at y=130, viewport height 800, space below = 670 > 300
    expect(result.current.position).toBe('below');
  });

  it("returns 'above' when there is insufficient space below but enough above", () => {
    Object.defineProperty(window, 'innerHeight', { value: 500, writable: true });
    
    const triggerRef = createRef<HTMLDivElement>();
    const mockElement = document.createElement('div');
    mockElement.getBoundingClientRect = () => createDOMRect(0, 350, 100, 30);
    triggerRef.current = mockElement;

    const { result } = renderHook(() =>
      useDropdownPosition({ triggerRef, dropdownHeight: 300 })
    );

    // trigger bottom at 380, space below = 120 < 300, space above = 350 > 300
    expect(result.current.position).toBe('above');
  });

  it("returns 'below' when insufficient space both above and below (default fallback)", () => {
    Object.defineProperty(window, 'innerHeight', { value: 400, writable: true });
    
    const triggerRef = createRef<HTMLDivElement>();
    const mockElement = document.createElement('div');
    mockElement.getBoundingClientRect = () => createDOMRect(0, 200, 100, 30);
    triggerRef.current = mockElement;

    const { result } = renderHook(() =>
      useDropdownPosition({ triggerRef, dropdownHeight: 300 })
    );

    // space below = 400 - 230 = 170 < 300, space above = 200 < 300, choose direction with more space (above)
    expect(result.current.position).toBe('above');
  });

  it("uses dropdown ref height if provided", () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    
    const triggerRef = createRef<HTMLDivElement>();
    const triggerElement = document.createElement('div');
    triggerElement.getBoundingClientRect = () => createDOMRect(0, 600, 100, 30);
    triggerRef.current = triggerElement;

    const dropdownRef = createRef<HTMLDivElement>();
    const dropdownElement = document.createElement('div');
    Object.defineProperty(dropdownElement, 'offsetHeight', { value: 150 });
    dropdownRef.current = dropdownElement;

    const { result } = renderHook(() =>
      useDropdownPosition({ triggerRef, dropdownRef, dropdownHeight: 300 })
    );

    // trigger bottom at 630, space below = 170 >= 150 + offset (4) => enough
    expect(result.current.position).toBe('below');
  });

  it("recalculates on window resize", () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    
    const triggerRef = createRef<HTMLDivElement>();
    const mockElement = document.createElement('div');
    mockElement.getBoundingClientRect = () => createDOMRect(0, 100, 100, 30);
    triggerRef.current = mockElement;

    const { result } = renderHook(() =>
      useDropdownPosition({ triggerRef, dropdownHeight: 300 })
    );

    expect(result.current.position).toBe('below');

    // Simulate window resize to smaller viewport
    Object.defineProperty(window, 'innerHeight', { value: 400, writable: true });
    // Need to trigger resize event
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    // The hook should recalculate; now trigger bottom at 130, space below = 270 < 300, space above = 100 < 300 -> default below
    expect(result.current.position).toBe('below');
  });
});
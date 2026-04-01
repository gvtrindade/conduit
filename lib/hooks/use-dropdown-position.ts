import { useState, useEffect, RefObject } from 'react';

interface UseDropdownPositionOptions {
  triggerRef: RefObject<HTMLElement | null>;
  dropdownRef?: RefObject<HTMLElement | null>;
  boundaryRef?: RefObject<HTMLElement | null>;
  dropdownHeight?: number;
  offset?: number;
}

interface PositionStyle {
  position: Position;
  maxHeight?: number;
}

type Position = 'above' | 'below';

function findOverflowAncestor(element: HTMLElement): HTMLElement {
  let current: HTMLElement | null = element;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    if (style.overflow.includes('hidden') || style.overflow.includes('clip')) {
      return current;
    }
    current = current.parentElement;
  }
  return document.documentElement; // fallback to viewport
}

export function useDropdownPosition({
  triggerRef,
  dropdownRef,
  boundaryRef,
  dropdownHeight = 300,
  offset = 4,
}: UseDropdownPositionOptions): PositionStyle {
  const [style, setStyle] = useState<PositionStyle>({ position: 'below' });

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const calculatePosition = () => {
      const triggerRect = trigger.getBoundingClientRect();
      
      // Determine boundary element (nearest overflow hidden ancestor or provided ref)
      const boundary = boundaryRef?.current ?? findOverflowAncestor(trigger);
      const boundaryRect = boundary.getBoundingClientRect();
      
      // Use viewport height if boundary is document element (viewport)
      const isViewport = boundary === document.documentElement;
      const boundaryHeight = isViewport ? window.innerHeight : boundaryRect.height;
      const boundaryTop = isViewport ? 0 : boundaryRect.top;
      
      // Calculate space within boundary
      const triggerTopRelative = triggerRect.top - boundaryTop;
      const triggerBottomRelative = triggerRect.bottom - boundaryTop;
      
      const spaceBelow = boundaryHeight - triggerBottomRelative;
      const spaceAbove = triggerTopRelative;
      
      // If we have a dropdown ref, use its actual height
      let actualDropdownHeight = dropdownHeight;
      if (dropdownRef?.current) {
        actualDropdownHeight = dropdownRef.current.offsetHeight || dropdownHeight;
      }
      
      let chosenPosition: Position;
      let maxHeight: number | undefined;
      
      // Choose direction with more space within boundary
      if (spaceBelow >= actualDropdownHeight + offset) {
        chosenPosition = 'below';
        maxHeight = undefined; // enough space, no limit
      } else if (spaceAbove >= actualDropdownHeight + offset) {
        chosenPosition = 'above';
        maxHeight = undefined;
      } else {
        // Not enough space either way, choose direction with more space
        if (spaceBelow > spaceAbove) {
          chosenPosition = 'below';
          maxHeight = Math.max(spaceBelow - offset, 0);
        } else {
          chosenPosition = 'above';
          maxHeight = Math.max(spaceAbove - offset, 0);
        }
      }
      
      setStyle({ position: chosenPosition, maxHeight });
    };

    calculatePosition();

    // Recalculate on window resize
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [triggerRef, dropdownRef, boundaryRef, dropdownHeight, offset]);

  return style;
}
import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DatePicker } from "../../components/date-picker";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("DatePicker", () => {
  it("displays the value in YYYY.MM.DD format", () => {
    const onChange = () => {};
    render(<DatePicker value="2024.10.14" onChange={onChange} />);

    const display = screen.getByText("2024.10.14");
    expect(display).toBeInTheDocument();
  });

  it("calls onChange with YYYY.MM.DD format when a date is selected", () => {
    const onChange = mock((date: string) => {});

    render(<DatePicker value="2024.10.14" onChange={onChange} />);

    const trigger = screen.getByText("2024.10.14");
    fireEvent.click(trigger);

    const dayButton = screen.getByText("15");
    fireEvent.click(dayButton);

    expect(onChange).toHaveBeenCalledWith("2024.10.15");
  });

  it("disables dates outside min/max range", () => {
    const onChange = mock((date: string) => {});

    render(
      <DatePicker
        value="2024.10.14"
        onChange={onChange}
        min="2024.10.10"
        max="2024.10.20"
      />
    );

    const trigger = screen.getByText("2024.10.14");
    fireEvent.click(trigger);

    const disabledDay = screen.getByText("05");
    expect(disabledDay).toBeDisabled();

    const enabledDay = screen.getByText("15");
    expect(enabledDay).not.toBeDisabled();
  });

  it("renders month and year dropdowns when opened", () => {
    const onChange = mock((date: string) => {});

    render(<DatePicker value="2024.10.14" onChange={onChange} />);

    const trigger = screen.getByText("2024.10.14");
    fireEvent.click(trigger);

    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);

    const options = screen.getAllByRole("option");
    const monthOptions = options.filter((opt) =>
      ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].includes(opt.textContent || "")
    );
    expect(monthOptions).toHaveLength(12);
  });

  it("updates calendar view when month dropdown changes", () => {
    const onChange = mock((date: string) => {});

    render(<DatePicker value="2024.10.14" onChange={onChange} />);

    const trigger = screen.getByText("2024.10.14");
    fireEvent.click(trigger);

    const selects = screen.getAllByRole("combobox");
    const monthSelect = selects[0];

    fireEvent.change(monthSelect, { target: { value: "0" } });

    expect(screen.getByText("JAN")).toBeInTheDocument();
  });
});

describe("DatePicker positioning", () => {
  let originalInnerHeight: number;
  let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    originalInnerHeight = window.innerHeight;
    originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      value: originalInnerHeight,
      writable: true,
    });
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it("positions dropdown above when trigger is near bottom of viewport", async () => {
    // Set viewport height small
    Object.defineProperty(window, 'innerHeight', { value: 500, writable: true });
    
    const onChange = mock(() => {});
    render(<DatePicker value="2024.10.14" onChange={onChange} />);
    
    const trigger = screen.getByText("2024.10.14");
    // Mock getBoundingClientRect to simulate trigger near bottom
    trigger.getBoundingClientRect = () => ({
      x: 0,
      y: 400,
      width: 200,
      height: 30,
      top: 400,
      right: 200,
      bottom: 430,
      left: 0,
      toJSON: () => {},
    });
    
    // Open the dropdown
    fireEvent.click(trigger);
    
    // Trigger resize to force hook recalculation with mocked position
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    
    const dropdown = screen.getByTestId('datepicker-dropdown');
    expect(dropdown.className).toContain('bottom-full');
    expect(dropdown.className).toContain('mb-1');
    expect(dropdown.className).not.toContain('mt-1');
  });

  it("positions dropdown below when there is sufficient space", async () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    
    const onChange = mock(() => {});
    render(<DatePicker value="2024.10.14" onChange={onChange} />);
    
    const trigger = screen.getByText("2024.10.14");
    trigger.getBoundingClientRect = () => ({
      x: 0,
      y: 100,
      width: 200,
      height: 30,
      top: 100,
      right: 200,
      bottom: 130,
      left: 0,
      toJSON: () => {},
    });
    
    fireEvent.click(trigger);
    
    // Trigger resize to force hook recalculation with mocked position
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    
    const dropdown = screen.getByTestId('datepicker-dropdown');
    expect(dropdown.className).toContain('mt-1');
    expect(dropdown.className).not.toContain('bottom-full');
  });

  it("recalculates position on window resize", async () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    
    const onChange = mock(() => {});
    render(<DatePicker value="2024.10.14" onChange={onChange} />);
    
    const trigger = screen.getByText("2024.10.14");
    trigger.getBoundingClientRect = () => ({
      x: 0,
      y: 100,
      width: 200,
      height: 30,
      top: 100,
      right: 200,
      bottom: 130,
      left: 0,
      toJSON: () => {},
    });
    
    fireEvent.click(trigger);
    
    // Initially below
    let dropdown = screen.getByTestId('datepicker-dropdown');
    expect(dropdown.className).toContain('mt-1');
    
    // Simulate window resize to smaller viewport and adjust trigger position to be near top
    Object.defineProperty(window, 'innerHeight', { value: 400, writable: true });
    // Update mock to simulate trigger near top (enough space above)
    trigger.getBoundingClientRect = () => ({
      x: 0,
      y: 350,
      width: 200,
      height: 30,
      top: 350,
      right: 200,
      bottom: 380,
      left: 0,
      toJSON: () => {},
    });
    // Trigger resize event
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    
    // The hook should recalculate, dropdown should now be above
    dropdown = screen.getByTestId('datepicker-dropdown');
    expect(dropdown.className).toContain('bottom-full');
  });
});

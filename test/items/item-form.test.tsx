import { describe, it, expect, mock } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { ItemForm } from "@/components/item-form";

describe("ItemForm", () => {
  const mockCategories = ["produce", "dairy", "pantry", "beverages"];
  const mockTags = ["organic", "sale", "seasonal", "favorite"];

  const createDefaultProps = () => ({
    mode: "create" as const,
    categories: mockCategories,
    tags: mockTags,
    onSubmit: mock(() => Promise.resolve()),
    onCancel: mock(() => {}),
  });

  const getByLabelWithSlash = (label: string) => {
    return screen.getByLabelText(new RegExp(`// ${label} //`));
  };

  const getByLabelWithSlashAndAsterisk = (label: string) => {
    return screen.getByLabelText(new RegExp(`// ${label} \\* //`));
  };

  describe("Form renders all editable item fields", () => {
    it("renders name, codename, emoji, category, tag, and unit fields", () => {
      render(<ItemForm {...createDefaultProps()} />);

      expect(getByLabelWithSlashAndAsterisk("NAME")).toBeInTheDocument();
      expect(getByLabelWithSlash("CODE_NAME")).toBeInTheDocument();
      expect(getByLabelWithSlash("EMOJI")).toBeInTheDocument();
      expect(getByLabelWithSlash("CATEGORY")).toBeInTheDocument();
      expect(getByLabelWithSlash("TAG")).toBeInTheDocument();
      expect(getByLabelWithSlash("UNIT")).toBeInTheDocument();
    });
  });

  describe("Name field validates as required", () => {
    it("shows validation error when name is empty on submit", async () => {
      render(<ItemForm {...createDefaultProps()} />);

      fireEvent.change(getByLabelWithSlash("CODE_NAME"), { target: { value: "TEST_CODE" } });

      const submitButton = screen.getByRole("button", { name: /create/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      const props = createDefaultProps();
      expect(props.onSubmit).not.toHaveBeenCalled();
    });

    it("blocks form submission when name is empty", async () => {
      const onSubmitMock = mock(() => Promise.resolve());
      render(<ItemForm {...createDefaultProps()} onSubmit={onSubmitMock} />);

      const submitButton = screen.getByRole("button", { name: /create/i });
      fireEvent.click(submitButton);

      expect(onSubmitMock).not.toHaveBeenCalled();
    });
  });

  describe("Category selector shows dropdown with Other option", () => {
    it("category dropdown shows all categories passed as props", () => {
      render(<ItemForm {...createDefaultProps()} categories={mockCategories} />);

      const categorySelect = getByLabelWithSlash("CATEGORY");
      const options = categorySelect.querySelectorAll("option");
      const optionValues = Array.from(options).map(o => o.value);
      
      mockCategories.forEach((category) => {
        expect(optionValues).toContain(category);
      });
    });

    it("category dropdown shows Other as option", () => {
      render(<ItemForm {...createDefaultProps()} categories={mockCategories} />);

      const categorySelect = getByLabelWithSlash("CATEGORY");
      const options = categorySelect.querySelectorAll("option");
      const optionTexts = Array.from(options).map(o => o.textContent);
      
      expect(optionTexts).toContain("Other...");
    });
  });

  describe("Selecting Other for category shows text input", () => {
    it("reveals custom category text input when Other is selected", () => {
      render(<ItemForm {...createDefaultProps()} categories={mockCategories} />);

      const categorySelect = getByLabelWithSlash("CATEGORY");
      fireEvent.change(categorySelect, { target: { value: "other" } });

      expect(screen.getByLabelText(new RegExp("// CUSTOM CATEGORY //"))).toBeInTheDocument();
    });
  });

  describe("Tag selector shows dropdown with Other option", () => {
    it("tag dropdown shows all tags passed as props", () => {
      render(<ItemForm {...createDefaultProps()} tags={mockTags} />);

      const tagSelect = getByLabelWithSlash("TAG");
      const options = tagSelect.querySelectorAll("option");
      const optionValues = Array.from(options).map(o => o.value);
      
      mockTags.forEach((tag) => {
        expect(optionValues).toContain(tag);
      });
    });

    it("tag dropdown shows Other as option", () => {
      render(<ItemForm {...createDefaultProps()} tags={mockTags} />);

      const tagSelect = getByLabelWithSlash("TAG");
      const options = tagSelect.querySelectorAll("option");
      const optionTexts = Array.from(options).map(o => o.textContent);
      
      expect(optionTexts).toContain("Other...");
    });
  });

  describe("Selecting Other for tag shows text input", () => {
    it("reveals custom tag text input when Other is selected", () => {
      render(<ItemForm {...createDefaultProps()} tags={mockTags} />);

      const tagSelect = getByLabelWithSlash("TAG");
      fireEvent.change(tagSelect, { target: { value: "other" } });

      expect(screen.getByLabelText(new RegExp("// CUSTOM TAG //"))).toBeInTheDocument();
    });
  });

  describe("Create mode renders empty fields with CREATE button", () => {
    it("shows empty/default values in create mode", () => {
      render(<ItemForm {...createDefaultProps()} mode="create" />);

      expect(getByLabelWithSlashAndAsterisk("NAME")).toHaveValue("");
      expect(getByLabelWithSlash("EMOJI")).toHaveValue("📦");
    });

    it("shows CREATE button text in create mode", () => {
      render(<ItemForm {...createDefaultProps()} mode="create" />);

      expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    });
  });

  describe("Edit mode renders pre-populated fields with SAVE button", () => {
    const editProps = {
      ...createDefaultProps(),
      mode: "edit" as const,
      initialData: {
        id: "item-123",
        name: "Existing Item",
        codename: "EXISTING_CODE",
        emoji: "🍎",
        category: "produce",
        tags: ["organic"],
        unit: "kCr / kg",
      },
    };

    it("pre-fills form fields with initialData in edit mode", () => {
      render(<ItemForm {...editProps} />);

      expect(getByLabelWithSlashAndAsterisk("NAME")).toHaveValue("Existing Item");
      expect(getByLabelWithSlash("CODE_NAME")).toHaveValue("EXISTING_CODE");
      expect(getByLabelWithSlash("EMOJI")).toHaveValue("🍎");
      expect(getByLabelWithSlash("CATEGORY")).toHaveValue("produce");
      expect(getByLabelWithSlash("UNIT")).toHaveValue("kCr / kg");
    });

    it("shows SAVE button text in edit mode", () => {
      render(<ItemForm {...editProps} />);

      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /create/i })).not.toBeInTheDocument();
    });
  });

  describe("onSubmit callback receives correct form data", () => {
    it("calls onSubmit with proper data shape when form is valid", async () => {
      const onSubmitMock = mock(() => Promise.resolve());
      render(
        <ItemForm
          {...createDefaultProps()}
          categories={mockCategories}
          tags={mockTags}
          onSubmit={onSubmitMock}
        />
      );

      fireEvent.change(getByLabelWithSlashAndAsterisk("NAME"), { target: { value: "Test Item" } });
      fireEvent.change(getByLabelWithSlash("CODE_NAME"), { target: { value: "TEST_ITEM" } });
      fireEvent.change(getByLabelWithSlash("EMOJI"), { target: { value: "🧪" } });
      fireEvent.change(getByLabelWithSlash("UNIT"), { target: { value: "kCr / unit" } });

      fireEvent.change(getByLabelWithSlash("CATEGORY"), { target: { value: "produce" } });
      fireEvent.change(getByLabelWithSlash("TAG"), { target: { value: "organic" } });

      const submitButton = screen.getByRole("button", { name: /create/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledTimes(1);
      });

      const submittedData = onSubmitMock.mock.calls[0][0];
      expect(submittedData).toMatchObject({
        name: "Test Item",
        codename: "TEST_ITEM",
        emoji: "🧪",
        category: "produce",
        tags: ["organic"],
        unit: "kCr / unit",
      });
    });

    it("includes custom category in submit data when Other is selected", async () => {
      const onSubmitMock = mock(() => Promise.resolve());
      render(
        <ItemForm
          {...createDefaultProps()}
          categories={mockCategories}
          tags={mockTags}
          onSubmit={onSubmitMock}
        />
      );

      fireEvent.change(getByLabelWithSlashAndAsterisk("NAME"), { target: { value: "Test Item" } });
      fireEvent.change(getByLabelWithSlash("CODE_NAME"), { target: { value: "TEST" } });

      fireEvent.change(getByLabelWithSlash("CATEGORY"), { target: { value: "other" } });

      fireEvent.change(screen.getByLabelText(new RegExp("// CUSTOM CATEGORY //")), {
        target: { value: "custom-category" },
      });

      fireEvent.click(screen.getByRole("button", { name: /create/i }));

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledTimes(1);
      });

      const submittedData = onSubmitMock.mock.calls[0][0];
      expect(submittedData.category).toBeNull();
      expect(submittedData.category_custom).toBe("custom-category");
    });
  });
});

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { useState } from 'react';

import { ManualReceiptForm } from "@/components/manual-receipt-form";

afterEach(cleanup);

const mockMerchants = [
  { id: "m1", name: "SECTOR_7_WHOLE_FOODS", emoji: "🛒" },
  { id: "m2", name: "CORPO_MART", emoji: "🏪" },
];

const createDefaultProps = () => ({
  merchants: mockMerchants,
  onSubmit: mock(() => Promise.resolve()),
  onCancel: mock(() => {}),
  onCreateMerchant: mock((name: string, emoji: string | null) => Promise.resolve("new-merchant-id")),
});

describe("ManualReceiptForm - Merchant Field Reset", () => {
  it("clears merchant name and emoji fields after successful creation", async () => {
    const onCreateMock = mock(() => Promise.resolve("new-merchant-id"));
    render(<ManualReceiptForm {...createDefaultProps()} onCreateMerchant={onCreateMock} />);

    // Open the merchant customization form
    const merchantSelect = screen.getByLabelText(new RegExp("// MERCHANT //"));
    fireEvent.change(merchantSelect, { target: { value: "other" } });

    // Fill in merchant name and emoji
    const nameInput = screen.getByLabelText(new RegExp("// MERCHANT_NAME //"));
    const emojiInput = screen.getByLabelText(new RegExp("// MERCHANT_EMOJI //"));
    const createButton = screen.getByRole("button", { name: /create_merchant/i });

    fireEvent.change(nameInput, { target: { value: "TEST MERCHANT" } });
    fireEvent.change(emojiInput, { target: { value: "🧪" } });

    // Create the merchant
    fireEvent.click(createButton);

    // Wait for the creation to complete
    await waitFor(() => {
      expect(onCreateMock).toHaveBeenCalledTimes(1);
    });
    
    // Additional wait for state to update
    await waitFor(0);

    // Verify that the name and emoji fields are cleared
    expect((nameInput as HTMLInputElement).value).toBe("");
    expect((emojiInput as HTMLInputElement).value).toBe("");
    
    // Verify that we're back to the merchant dropdown (not showing custom form)
    expect(merchantSelect).toBeInTheDocument();
    expect(screen.queryByLabelText(new RegExp("// MERCHANT_NAME //"))).not.toBeInTheDocument();
    expect(screen.queryByLabelText(new RegExp("// MERCHANT_EMOJI //"))).not.toBeInTheDocument();
  });
});
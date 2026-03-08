"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock } from "lucide-react";

interface CardDetails {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

interface CreditCardFormProps {
  onSubmit: (cardDetails: CardDetails) => void;
  onCancel: () => void;
  amount: string;
  isProcessing?: boolean;
  buttonText?: string;
}

export function CreditCardForm({
  onSubmit,
  onCancel,
  amount,
  isProcessing = false,
  buttonText = "Pay Now",
}: CreditCardFormProps) {
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(cardDetails);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-6 border rounded-lg bg-card">
        <h3 className="text-lg font-medium mb-4">Payment Information</h3>
        <p className="text-sm text-muted-foreground mb-4">
          To list your product in our directory, there is a one-time fee of{" "}
          {amount}. This helps us maintain the quality of listings and support
          the platform.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="cardName" className="block font-medium">
              Name on card
            </label>
            <Input
              id="cardName"
              name="cardName"
              placeholder="John Smith"
              value={cardDetails.cardName}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="cardNumber" className="block font-medium">
              Card number
            </label>
            <div className="relative">
              <Input
                id="cardNumber"
                name="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.cardNumber}
                onChange={handleInputChange}
                required
                className="pr-10"
                maxLength={16}
                pattern="[0-9]*"
                inputMode="numeric"
              />
              <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="expiry" className="block font-medium">
                Expiry date
              </label>
              <Input
                id="expiry"
                name="expiry"
                placeholder="MM/YY"
                value={cardDetails.expiry}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="cvc" className="block font-medium">
                CVC
              </label>
              <Input
                id="cvc"
                name="cvc"
                placeholder="123"
                value={cardDetails.cvc}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span>Secure payment processing by Stripe</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Back
        </Button>

        <Button type="submit" disabled={isProcessing}>
          {isProcessing ? "Processing..." : buttonText}
        </Button>
      </div>
    </form>
  );
}

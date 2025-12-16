import {
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  CartOperation,
  DiscountClass,
  ProductDiscountCandidate,
  ProductDiscountSelectionStrategy,
} from '../generated/api';

// Data structure we expect from our app/DB via fetchResult.jsonBody
type BuyXGetYRule = {
  buyVariantId: string;          // ProductVariant GID customer must buy (X)
  getVariantId: string;          // ProductVariant GID that gets discounted (Y)
  buyQuantity: number;           // Min quantity of X to activate the rule
  discountPercentage: number;    // Percentage discount to apply on Y
};
                 
type FunctionConfig = {
  rules: BuyXGetYRule[];
};

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  // No cart lines → nothing to do
  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  // Ensure this discount runs only when the discount has PRODUCT class
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
    
  );
console.log('BUY_X_GET_Y_CONFIG', JSON.stringify((input as any).fetchResult?.jsonBody));

  if (!hasProductDiscountClass) {
    return { operations: [] };
  }

  // Read config from fetch phase: fetchResult.jsonBody must contain { rules: [...] }
  const rawConfig = (input as any).fetchResult?.jsonBody as
    | FunctionConfig
    | undefined;

  const rules: BuyXGetYRule[] = Array.isArray(rawConfig?.rules)
    ? rawConfig.rules
    : [];

  // If our app/DB didn't send any rules, don't apply anything
  if (!rules.length) {
    return { operations: [] };
  }

  // Build a helper map: variantId → list of cart lines for that variant
  type LineWithVariant = (typeof input.cart.lines)[number] & {
    quantity: number;
    merchandise?: { id?: string | null } | null;
  };

  const linesByVariantId = new Map<string, LineWithVariant[]>();

  for (const line of input.cart.lines as LineWithVariant[]) {
    const variantId = line.merchandise?.id;
    if (!variantId) continue;

    const bucket = linesByVariantId.get(variantId) ?? [];
    bucket.push(line);
    linesByVariantId.set(variantId, bucket);
  }

  // Create product discount candidates for every Y line that qualifies
  const candidates: ProductDiscountCandidate[] = [];

  for (const rule of rules) {
    const {
      buyVariantId,
      getVariantId,
      buyQuantity,
      discountPercentage,
    } = rule;

    // Skip invalid or incomplete rules
    if (
      !buyVariantId ||
      !getVariantId ||
      buyQuantity <= 0 ||
      discountPercentage <= 0
    ) {
      continue;
    }

    const buyLines = linesByVariantId.get(buyVariantId) ?? [];
    const getLines = linesByVariantId.get(getVariantId) ?? [];

    // If cart is missing X or Y, this rule cannot apply
    if (!buyLines.length || !getLines.length) continue;

    // Total quantity of X (buy product) in cart across all lines
    const totalBuyQty = buyLines.reduce(
      (sum, line) => sum + line.quantity,
      0,
    );

    // Customer hasn't reached the required quantity of X yet
    if (totalBuyQty < buyQuantity) continue;

    // Rule is active → apply percentage discount to all Y (get product) lines
    for (const getLine of getLines) {
      candidates.push({
        message: `Buy ${buyQuantity} get ${discountPercentage}% off`,
        targets: [
          {
            cartLine: {
              id: getLine.id,
              // Discount applies to the whole quantity on that cart line
              quantity: getLine.quantity,
            },
          },
        ],
        value: {
          percentage: {
            value: discountPercentage,
          },
        },
      });
    }
  }

  // No matching rules → don't modify the cart
  if (!candidates.length) {
    return { operations: [] };
  }

  // Return one productDiscountsAdd operation with all candidates
  const operations: CartOperation[] = [
    {
      productDiscountsAdd: {
        candidates,
        // One candidate per Y line → FIRST is enough here
        selectionStrategy: ProductDiscountSelectionStrategy.First,
      },
    },
  ];

  return { operations };
}

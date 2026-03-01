"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import {
  defaultLocale,
  resolveMessages,
  type AppLocale,
  type AppMessages,
} from "./messages";

type PaymentMethodLabel = "all" | "cash" | "on_account";
type PaymentStatusLabel = "paid" | "partial" | "pending";
type MovementTypeLabel = "inbound" | "outbound" | "adjustment";

interface I18nContextValue {
  readonly locale: AppLocale;
  readonly messages: AppMessages;
  readonly formatCurrency: (amount: number) => string;
  readonly formatDateTime: (value: Date | string) => string;
  readonly labelForCategory: (categoryId: string) => string;
  readonly labelForPaymentMethod: (value: PaymentMethodLabel) => string;
  readonly labelForPaymentStatus: (value: PaymentStatusLabel) => string;
  readonly labelForMovementType: (value: MovementTypeLabel) => string;
  readonly humanizeIdentifier: (value: string) => string;
}

interface I18nProviderProps {
  readonly children: ReactNode;
  readonly locale?: AppLocale;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function humanizeIdentifier(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((segment) =>
      segment.length === 0
        ? segment
        : `${segment[0].toLocaleUpperCase("es")}${segment.slice(1)}`,
    )
    .join(" ");
}

export function I18nProvider({
  children,
  locale = defaultLocale,
}: I18nProviderProps): JSX.Element {
  const messages = useMemo(() => resolveMessages(locale), [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      messages,
      formatCurrency: (amount: number): string => `$${amount.toFixed(2)}`,
      formatDateTime: (input: Date | string): string =>
        new Date(input).toLocaleString("es-AR"),
      labelForCategory: (categoryId: string): string => {
        const localized =
          messages.common.categories[
            categoryId as keyof typeof messages.common.categories
          ];

        return localized ?? humanizeIdentifier(categoryId);
      },
      labelForPaymentMethod: (paymentMethod: PaymentMethodLabel): string =>
        messages.common.paymentMethods[paymentMethod],
      labelForPaymentStatus: (paymentStatus: PaymentStatusLabel): string =>
        messages.common.paymentStatuses[paymentStatus],
      labelForMovementType: (movementType: MovementTypeLabel): string =>
        messages.common.movementTypes[movementType],
      humanizeIdentifier,
    }),
    [locale, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n debe usarse dentro de I18nProvider.");
  }

  return value;
}

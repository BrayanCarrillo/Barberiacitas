/**
 * Represents payment information.
 */
export interface Payment {
  /**
   * The payment amount.
   */
  amount: number;
  /**
   * The payment date.
   */
  date: string;
  /**
   * The payment method.
   */
  method: string;
}

/**
 * Asynchronously submits a rent payment.
 *
 * @param payment The payment information.
 * @returns A promise that resolves to a boolean indicating if the payment was successful.
 */
export async function submitRentPayment(payment: Payment): Promise<boolean> {
  // TODO: Implement this by calling an API.
  console.log('Payment submitted:', payment);
  return true;
}

/**
 * Asynchronously retrieves the rent payment history.
 *
 * @param barberId The barber's ID.
 * @returns A promise that resolves to an array of Payment objects.
 */
export async function getRentPaymentHistory(barberId: string): Promise<Payment[]> {
  // TODO: Implement this by calling an API.
  // Example COP values
  return [
    {
      amount: 600000, // Example rent in COP
      date: '2024-01-01',
      method: 'Cash', // Consistent with RentPanel logic
    },
    {
      amount: 600000, // Example rent in COP
      date: '2024-02-01',
      method: 'Cash', // Consistent with RentPanel logic
    },
  ];
}

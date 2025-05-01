"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import {  DollarSign, History, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription, // Import FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { submitRentPayment, getRentPaymentHistory } from '@/services/rent-payment';
import type { Payment } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { getBarberSettingsFromStorage } from '@/lib/settings-storage';
import { formatCurrency } from '@/lib/currency-utils'; // Import currency formatter

const rentPaymentSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Amount must be positive.' }),
});

type RentPaymentValues = z.infer<typeof rentPaymentSchema>;

interface RentPanelProps {
  barberId: string;
}

export function RentPanel({ barberId }: RentPanelProps) {
  const { toast } = useToast();
  const [paymentHistory, setPaymentHistory] = React.useState<Payment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [rentAmount, setRentAmount] = React.useState<number>(0);

  const form = useForm<RentPaymentValues>({
    resolver: zodResolver(rentPaymentSchema),
    defaultValues: {
      amount: 0,
    },
  });

  React.useEffect(() => {
    const settings = getBarberSettingsFromStorage(barberId);
    setRentAmount(settings.rentAmount || 0);
    form.reset({ amount: settings.rentAmount || 0 }); // Initialize with stored rent amount
  }, [barberId, form]);


  const fetchHistory = React.useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const history = await getRentPaymentHistory(barberId);
      setPaymentHistory(history);
    } catch (error) {
      console.error("Failed to fetch payment history:", error);
      toast({
        title: "Error",
        description: "Could not load payment history.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [barberId, toast]);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function onSubmit(data: RentPaymentValues) {
    setIsSubmitting(true);
    const paymentData: Payment = {
      amount: data.amount,
      date: new Date().toISOString(),
      method: 'Cash', // Hardcoded payment method
    };

    try {
      const success = await submitRentPayment(paymentData);
      if (success) {
        toast({
          title: 'Payment Successful',
          description: `Successfully paid ${formatCurrency(data.amount)} towards rent.`,
        });
        form.reset({ amount: rentAmount }); // Reset form to current rent amount
        fetchHistory();
      } else {
        throw new Error("Payment processing failed.");
      }
    } catch (error) {
      console.error("Rent payment error:", error);
      toast({
        title: 'Payment Failed',
        description: 'There was an issue processing your rent payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

   const renderHistorySkeleton = (rows = 3) => (
     Array.from({ length: rows }).map((_, i) => (
      <TableRow key={`skel-${i}`}>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      </TableRow>
    ))
   );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5"/>Make Rent Payment</CardTitle>
          <CardDescription>Submit your cash payment for this month's station rent. Rent is {formatCurrency(rentAmount)}.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount (COP)</FormLabel>
                    <FormControl>
                      <div className="relative">
                         <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <Input type="number" step="100" placeholder="Enter amount" className="pl-8" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                    <FormDescription>
                       Payment is made in cash.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
               <Button type="submit" className="w-full" disabled={isSubmitting}>
                 {isSubmitting ? "Processing..." : `Pay Rent (${formatCurrency(form.watch('amount') || 0)})`}
               </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Payment History</CardTitle>
          <CardDescription>Your past rent payments.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col min-h-0">
          <ScrollArea className="flex-grow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount (COP)</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory ? (
                   renderHistorySkeleton(4)
                ) : paymentHistory.length > 0 ? (
                  paymentHistory.map((payment, index) => (
                    <TableRow key={index}>
                      <TableCell>{format(parseISO(payment.date), 'PPP p')}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{payment.method}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No payment history found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

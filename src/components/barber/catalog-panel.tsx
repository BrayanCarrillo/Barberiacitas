"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"; // Added import for Card components
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose, // Import DialogClose
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { useToast } from '@/hooks/use-toast';
import type { Service, Product, Combo } from '@/types';
import {
  getBarberServices,
  addBarberService,
  updateBarberService,
  removeBarberService,
  getBarberProducts,
  addBarberProduct,
  updateBarberProduct,
  removeBarberProduct,
  getBarberCombos,
  addBarberCombo,
  updateBarberCombo,
  removeBarberCombo,
} from '@/lib/catalog-storage';
import { PlusCircle, Edit, Trash2, Package, Scissors, Star } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency-utils'; // Import currency formatter

// Schemas
const serviceSchema = z.object({
    id: z.string().optional(), // Optional for add, required for edit
    name: z.string().min(2, "Name must be at least 2 characters."),
    duration: z.coerce.number().int().positive("Duration must be a positive number."),
    price: z.coerce.number().positive("Price must be a positive number."),
});
type ServiceFormValues = z.infer<typeof serviceSchema>;

const productSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "Name must be at least 2 characters."),
    price: z.coerce.number().positive("Price must be a positive number."),
    description: z.string().optional(),
});
type ProductFormValues = z.infer<typeof productSchema>;

const comboSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "Name must be at least 2 characters."),
    price: z.coerce.number().positive("Price must be a positive number."),
    serviceIds: z.array(z.string()).min(1, "Select at least one service."), // Ensure at least one service is selected
});
type ComboFormValues = z.infer<typeof comboSchema>;


interface CatalogPanelProps {
  barberId: string;
}

export function CatalogPanel({ barberId }: CatalogPanelProps) {
  const { toast } = useToast();
  const [services, setServices] = React.useState<Service[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [combos, setCombos] = React.useState<Combo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Service | Product | Combo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogType, setDialogType] = React.useState<'service' | 'product' | 'combo' | null>(null);

  const fetchData = React.useCallback(() => {
    setIsLoading(true);
    try {
      setServices(getBarberServices(barberId));
      setProducts(getBarberProducts(barberId));
      setCombos(getBarberCombos(barberId));
    } catch (error) {
      console.error("Failed to load catalog data:", error);
      toast({ title: "Error", description: "Could not load catalog data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [barberId, toast]);

  React.useEffect(() => {
    fetchData();
    // Listener for catalog changes from storage module
     const handleCatalogChange = () => {
        console.log("Catalog change detected, refetching data...");
        fetchData();
     };
     window.addEventListener('catalogChanged', handleCatalogChange);
     return () => window.removeEventListener('catalogChanged', handleCatalogChange);
  }, [fetchData]);


  // --- Form Setup ---
  const serviceForm = useForm<ServiceFormValues>({ resolver: zodResolver(serviceSchema) });
  const productForm = useForm<ProductFormValues>({ resolver: zodResolver(productSchema) });
  const comboForm = useForm<ComboFormValues>({ resolver: zodResolver(comboSchema), defaultValues: { serviceIds: [] } });


  // --- Dialog Handling ---
  const openDialog = (type: 'service' | 'product' | 'combo', item: Service | Product | Combo | null = null) => {
    setDialogType(type);
    setEditingItem(item);
    setIsDialogOpen(true);

    // Reset forms and populate if editing
    if (type === 'service') {
      serviceForm.reset(item ? { ...item } : { name: '', duration: 30, price: 0 });
    } else if (type === 'product') {
      productForm.reset(item ? { ...item } : { name: '', price: 0, description: '' });
    } else if (type === 'combo') {
       comboForm.reset(item ? { ...item as Combo } : { name: '', price: 0, serviceIds: [] });
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setDialogType(null);
    // Optionally reset forms here if needed, though they reset on open
  };


  // --- Submit Handlers ---
  const handleSave = async (values: any) => {
    if (!dialogType) return;
    setIsSaving(true);
    let success = false;
    const id = editingItem?.id ?? crypto.randomUUID();

    try {
      if (dialogType === 'service') {
         const serviceData: Service = { ...values, id, type: 'service' };
         success = editingItem
             ? updateBarberService(barberId, serviceData)
             : addBarberService(barberId, serviceData);
      } else if (dialogType === 'product') {
         const productData: Product = { ...values, id, type: 'product' };
         success = editingItem
             ? updateBarberProduct(barberId, productData)
             : addBarberProduct(barberId, productData);
      } else if (dialogType === 'combo') {
         const comboData: Combo = { ...values, id, type: 'combo' };
         success = editingItem
             ? updateBarberCombo(barberId, comboData)
             : addBarberCombo(barberId, comboData);
      }

      if (success) {
         toast({ title: "Success", description: `${dialogType.charAt(0).toUpperCase() + dialogType.slice(1)} ${editingItem ? 'updated' : 'added'} successfully.` });
         fetchData(); // Refresh data
         closeDialog();
      } else {
         throw new Error(`Failed to ${editingItem ? 'update' : 'add'} ${dialogType}.`);
      }
    } catch (error: any) {
      console.error(`Error saving ${dialogType}:`, error);
      toast({ title: "Error", description: error.message || `Could not save ${dialogType}.`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  // --- Delete Handler ---
  const handleDelete = (type: 'service' | 'product' | 'combo', id: string) => {
    let success = false;
    let itemName = '';
    let error: unknown = null; // Initialize error variable
    try {
        if (type === 'service') {
            itemName = services.find(s => s.id === id)?.name || 'Service';
            success = removeBarberService(barberId, id);
            if (!success && combos.some(c => c.serviceIds.includes(id))) {
                 throw new Error("Cannot delete service: It's part of one or more combos. Please remove it from combos first.");
            }
        } else if (type === 'product') {
            itemName = products.find(p => p.id === id)?.name || 'Product';
            success = removeBarberProduct(barberId, id);
        } else if (type === 'combo') {
            itemName = combos.find(c => c.id === id)?.name || 'Combo';
            success = removeBarberCombo(barberId, id);
        }

      if (success) {
         toast({ title: "Deleted", description: `${itemName} removed successfully.` });
         fetchData();
      } else {
         // If remove function returned false but didn't throw (e.g., service in combo handled internally)
         // Check if a specific error message wasn't already thrown
          if (!success && !(error instanceof Error)) {
              throw new Error(`Failed to remove ${type}.`);
          }
      }
    } catch (err: any) {
       error = err; // Store the error
       console.error(`Error deleting ${type}:`, error);
       toast({ title: "Error", description: error.message || `Could not remove ${type}.`, variant: "destructive" });
    }
  };


  // --- Rendering Helpers ---
  const renderSkeletons = (count = 3) => Array.from({ length: count }).map((_, i) => (
    <TableRow key={`skel-${i}`}>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
    </TableRow>
  ));

  const calculateComboDuration = (combo: Combo): number => {
      return combo.serviceIds.reduce((total, serviceId) => {
          const service = services.find(s => s.id === serviceId);
          return total + (service?.duration || 0);
      }, 0);
  };

  return (
    <Tabs defaultValue="services" className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Service &amp; Product Catalog</h2>
        <TabsList>
          <TabsTrigger value="services"><Scissors className="mr-2 h-4 w-4" />Services</TabsTrigger>
          <TabsTrigger value="combos"><Star className="mr-2 h-4 w-4" />Combos</TabsTrigger>
          <TabsTrigger value="products"><Package className="mr-2 h-4 w-4" />Products</TabsTrigger>
        </TabsList>
      </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {/* Add Buttons trigger dialogs */}

          <DialogContent className="sm:max-w-[480px]">
             <DialogHeader>
               <DialogTitle>{editingItem ? 'Edit' : 'Add'} {dialogType?.charAt(0).toUpperCase()}{dialogType?.slice(1)}</DialogTitle>
                <DialogDescription>
                    {editingItem ? `Update the details for this ${dialogType}.` : `Enter the details for the new ${dialogType}.`}
                </DialogDescription>
             </DialogHeader>

             {/* Service Form */}
             {dialogType === 'service' && (
                <Form {...serviceForm}>
                    <form id="service-form" onSubmit={serviceForm.handleSubmit(handleSave)} className="grid gap-4 py-4">
                         <FormField control={serviceForm.control} name="name" render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Name</FormLabel>
                                 <FormControl><Input placeholder="e.g., Classic Haircut" {...field} /></FormControl>
                                 <FormMessage />
                             </FormItem>
                         )} />
                        <FormField control={serviceForm.control} name="duration" render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Duration (minutes)</FormLabel>
                                 <FormControl><Input type="number" placeholder="e.g., 30" {...field} /></FormControl>
                                 <FormMessage />
                             </FormItem>
                         )} />
                         <FormField control={serviceForm.control} name="price" render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Price (COP)</FormLabel>
                                 <FormControl><Input type="number" step="100" placeholder="e.g., 25000" {...field} /></FormControl>
                                 <FormMessage />
                             </FormItem>
                         )} />
                    </form>
                 </Form>
             )}

             {/* Product Form */}
             {dialogType === 'product' && (
                 <Form {...productForm}>
                     <form id="product-form" onSubmit={productForm.handleSubmit(handleSave)} className="grid gap-4 py-4">
                         <FormField control={productForm.control} name="name" render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Name</FormLabel>
                                 <FormControl><Input placeholder="e.g., Styling Wax" {...field} /></FormControl>
                                 <FormMessage />
                             </FormItem>
                         )} />
                          <FormField control={productForm.control} name="price" render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Price (COP)</FormLabel>
                                 <FormControl><Input type="number" step="100" placeholder="e.g., 15000" {...field} /></FormControl>
                                 <FormMessage />
                             </FormItem>
                         )} />
                         <FormField control={productForm.control} name="description" render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Description (Optional)</FormLabel>
                                 <FormControl><Textarea placeholder="e.g., Strong hold, matte finish" {...field} /></FormControl>
                                 <FormMessage />
                             </FormItem>
                         )} />
                     </form>
                 </Form>
             )}

             {/* Combo Form */}
             {dialogType === 'combo' && (
                 <Form {...comboForm}>
                    <form id="combo-form" onSubmit={comboForm.handleSubmit(handleSave)} className="grid gap-4 py-4">
                         <FormField control={comboForm.control} name="name" render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Combo Name</FormLabel>
                                 <FormControl><Input placeholder="e.g., Haircut &amp; Beard Deluxe" {...field} /></FormControl>
                                 <FormMessage />
                             </FormItem>
                         )} />
                          <FormField control={comboForm.control} name="price" render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Combo Price (COP)</FormLabel>
                                 <FormControl><Input type="number" step="100" placeholder="e.g., 40000" {...field} /></FormControl>
                                  <FormDescription>Set a special price for this combo.</FormDescription>
                                 <FormMessage />
                             </FormItem>
                         )} />
                          <FormField control={comboForm.control} name="serviceIds" render={() => (
                            <FormItem>
                                <div className="mb-4">
                                    <FormLabel className="text-base">Included Services</FormLabel>
                                    <FormDescription>Select the services to include in this combo.</FormDescription>
                                </div>
                                <ScrollArea className="h-40 rounded-md border p-4">
                                    {services.map((service) => (
                                        <FormField
                                            key={service.id}
                                            control={comboForm.control}
                                            name="serviceIds"
                                            render={({ field }) => (
                                                <FormItem key={service.id} className="flex flex-row items-start space-x-3 space-y-0 mb-2">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(service.id)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...(field.value || []), service.id])
                                                                    : field.onChange(field.value?.filter((value) => value !== service.id));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                        {service.name} ({service.duration} min, {formatCurrency(service.price)})
                                                    </FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </ScrollArea>
                                <FormMessage />
                            </FormItem>
                         )} />
                     </form>
                 </Form>
             )}

             <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                 <Button type="submit" form={`${dialogType}-form`} disabled={isSaving}>
                     {isSaving ? "Saving..." : (editingItem ? "Update" : "Add")}
                 </Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Services Tab */}
      <TabsContent value="services">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
              <div>
                  <CardTitle>Services</CardTitle>
                  <CardDescription>Manage your haircut, beard trim, and other services.</CardDescription>
              </div>
              <Button size="sm" onClick={() => openDialog('service')}>
                 <PlusCircle className="mr-2 h-4 w-4" /> Add Service
              </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Duration (min)</TableHead>
                  <TableHead>Price (COP)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? renderSkeletons() : services.length === 0 ? (
                   <TableRow><TableCell colSpan={4} className="h-24 text-center">No services added yet.</TableCell></TableRow>
                ) : (
                  services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.duration}</TableCell>
                      <TableCell>{formatCurrency(service.price)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openDialog('service', service)}>
                          <Edit className="h-4 w-4" /> <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete('service', service.id)}>
                           <Trash2 className="h-4 w-4" /> <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

       {/* Combos Tab */}
      <TabsContent value="combos">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
              <div>
                  <CardTitle>Combos</CardTitle>
                  <CardDescription>Create special packages combining multiple services.</CardDescription>
              </div>
              <Button size="sm" onClick={() => openDialog('combo')} disabled={services.length === 0}>
                 <PlusCircle className="mr-2 h-4 w-4" /> Add Combo
              </Button>
          </CardHeader>
          <CardContent>
             {services.length === 0 && (
                <p className="text-sm text-muted-foreground mb-4">Please add services before creating combos.</p>
             )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Included Services</TableHead>
                  <TableHead>Total Duration (min)</TableHead>
                  <TableHead>Combo Price (COP)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {isLoading ? renderSkeletons() : combos.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No combos created yet.</TableCell></TableRow>
                 ) : (
                    combos.map((combo) => {
                        const includedServices = combo.serviceIds.map(id => services.find(s => s.id === id)).filter(Boolean) as Service[];
                        const totalDuration = calculateComboDuration(combo);
                        return (
                            <TableRow key={combo.id}>
                                <TableCell className="font-medium">{combo.name}</TableCell>
                                <TableCell>
                                    {includedServices.map(s => <Badge key={s.id} variant="secondary" className="mr-1 mb-1">{s.name}</Badge>)}
                                </TableCell>
                                <TableCell>{totalDuration}</TableCell>
                                <TableCell>{formatCurrency(combo.price)}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => openDialog('combo', combo)}>
                                        <Edit className="h-4 w-4" /> <span className="sr-only">Edit</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete('combo', combo.id)}>
                                        <Trash2 className="h-4 w-4" /> <span className="sr-only">Delete</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })
                 )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Products Tab */}
      <TabsContent value="products">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
              <div>
                 <CardTitle>Products</CardTitle>
                 <CardDescription>Manage items for sale like wax, combs, etc.</CardDescription>
              </div>
              <Button size="sm" onClick={() => openDialog('product')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Product
              </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Price (COP)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {isLoading ? renderSkeletons() : products.length === 0 ? (
                     <TableRow><TableCell colSpan={4} className="h-24 text-center">No products added yet.</TableCell></TableRow>
                 ) : (
                     products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-muted-foreground">{product.description || '-'}</TableCell>
                          <TableCell>{formatCurrency(product.price)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => openDialog('product', product)}>
                                <Edit className="h-4 w-4" /> <span className="sr-only">Edit</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete('product', product.id)}>
                                <Trash2 className="h-4 w-4" /> <span className="sr-only">Delete</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                     ))
                 )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

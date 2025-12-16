import React, { useState } from 'react';
import { Users, Plus, X, Search } from 'lucide-react';
import { Customer, LoyaltyPoint } from '../types';

interface CustomersProps {
  customers: Customer[];
  loyaltyPoints: LoyaltyPoint[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'created_at'>) => void;
}

export const Customers: React.FC<CustomersProps> = ({ customers, loyaltyPoints, onAddCustomer }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Customers</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Add Customer
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500/50 outline-none"
        />
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Add New Customer</h3>
              <button onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newCustomer = {
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
              };
              if (newCustomer.name) {
                onAddCustomer(newCustomer);
                setIsAdding(false);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-zinc-400">Name</label>
                  <input type="text" id="name" name="name" required className="w-full bg-[#27272a] border border-[#3f3f46] rounded-lg px-3 py-2 text-white mt-1" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-zinc-400">Email</label>
                  <input type="email" id="email" name="email" className="w-full bg-[#27272a] border border-[#3f3f46] rounded-lg px-3 py-2 text-white mt-1" />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-zinc-400">Phone</label>
                  <input type="tel" id="phone" name="phone" className="w-full bg-[#27272a] border border-[#3f3f46] rounded-lg px-3 py-2 text-white mt-1" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-lg text-zinc-400 hover:bg-[#27272a]">Cancel</button>
                <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg">Add Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#27272a] text-xs uppercase text-zinc-400">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Phone</th>
              <th className="p-4 text-right">Loyalty Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a]">
            {filteredCustomers.map(customer => (
              <tr key={customer.id} className="hover:bg-[#27272a]">
                <td className="p-4 text-white font-medium">{customer.name}</td>
                <td className="p-4 text-zinc-400">{customer.email || 'N/A'}</td>
                <td className="p-4 text-zinc-400">{customer.phone || 'N/A'}</td>
                <td className="p-4 text-white font-bold text-right">
                  {loyaltyPoints.find(lp => lp.customer_id === customer.id)?.points || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

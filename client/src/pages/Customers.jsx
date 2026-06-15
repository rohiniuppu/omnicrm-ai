import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, MapPin, Mail, Phone, Calendar, ShoppingBag, X } from 'lucide-react';
import CustomerModal from '../components/CustomerModal';
import OrderModal from '../components/OrderModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/customers`);
      if (!res.ok) throw new Error('Failed to fetch customers');
      setCustomers(await res.json());
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleOpenDetail = async (customer) => {
    try {
      const res = await fetch(`${API_URL}/api/customers/${customer.id}`);
      if (!res.ok) throw new Error('Failed to fetch customer details');
      const data = await res.json();
      setSelectedCustomer(data);
      setOrderHistory(data.orders || []);
    } catch (err) { alert(err.message); }
  };

  const handleSaveCustomer = async (formData) => {
    const method = editingCustomer ? 'PUT' : 'POST';
    const url = editingCustomer ? `${API_URL}/api/customers/${editingCustomer.id}` : `${API_URL}/api/customers`;
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to save'); }
    fetchCustomers();
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Delete this customer and all their orders?')) return;
    try {
      const res = await fetch(`${API_URL}/api/customers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
      fetchCustomers();
    } catch (err) { alert(err.message); }
  };

  const handleSaveOrder = async (orderData) => {
    const res = await fetch(`${API_URL}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to record order'); }
    fetchCustomers();
    if (selectedCustomer) handleOpenDetail(selectedCustomer);
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.city && c.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Customer Engagement</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage profiles, search cities, register orders, and view spend history.</p>
        </div>
        <button
          onClick={() => { setEditingCustomer(null); setIsCustomerModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 font-semibold text-slate-950 shadow-lg transition-all text-sm"
        >
          <Plus className="h-5 w-5" /> Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
            <input type="text" placeholder="Search by name, email, or city..." value={search} onChange={e => setSearch(e.target.value)} className="glass-input w-full pl-11 pr-4 py-2.5 rounded-xl text-sm" />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(n => <div key={n} className="h-24 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 text-sm">No matching customers found.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(customer => (
                <div
                  key={customer.id}
                  onClick={() => handleOpenDetail(customer)}
                  className={`glass-panel p-5 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer transition-all ${
                    selectedCustomer?.id === customer.id
                      ? 'border-emerald-500'
                      : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/60'
                  }`}
                >
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-base flex items-center gap-2">
                      {customer.name}
                      {customer.city && (
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {customer.city}
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {customer.email}</span>
                      {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {customer.phone}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-slate-200 dark:border-slate-800/60 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400">Total Spend</div>
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{parseFloat(customer.total_spend || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400">Orders</div>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{customer.order_count}</div>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditingCustomer(customer); setIsCustomerModalOpen(true); }} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteCustomer(customer.id)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {selectedCustomer ? (
            <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 sticky top-24 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800/80 pb-4 mb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{selectedCustomer.name}</h2>
                  <span className="text-xs text-slate-400">Customer Details Profile</span>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3.5 mb-6 text-sm">
                <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-emerald-500 shrink-0" /><span className="text-slate-600 dark:text-slate-300 select-all truncate">{selectedCustomer.email}</span></div>
                {selectedCustomer.phone && <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-emerald-500 shrink-0" /><span className="text-slate-600 dark:text-slate-300">{selectedCustomer.phone}</span></div>}
                {selectedCustomer.city && <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-emerald-500 shrink-0" /><span className="text-slate-600 dark:text-slate-300">{selectedCustomer.city}</span></div>}
                <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-emerald-500 shrink-0" /><span className="text-slate-500 dark:text-slate-400 text-xs">Registered: {new Date(selectedCustomer.created_at).toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' })}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 mb-6">
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Total Spend</span>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{parseFloat(selectedCustomer.total_spend || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Order Count</span>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-200">{selectedCustomer.order_count}</p>
                </div>
                <div className="col-span-2 border-t border-slate-200 dark:border-slate-800/60 pt-2.5 mt-1">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Last Purchase Date</span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {selectedCustomer.last_purchase_date ? new Date(selectedCustomer.last_purchase_date).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' }) : 'No orders logged yet.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wider">Purchase History</h3>
                  <button onClick={() => setIsOrderModalOpen(true)} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                    <Plus className="h-3 w-3" /> Add Order
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {orderHistory.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">No orders recorded.</div>
                  ) : orderHistory.map(order => (
                    <div key={order.id} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="truncate mr-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{order.product_name}</span>
                        <span className="text-[10px] text-slate-400 block">{new Date(order.date).toLocaleDateString()}</span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">₹{parseFloat(order.amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm h-72 flex flex-col justify-center items-center gap-3 sticky top-24">
              <ShoppingBag className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <span>Select a customer to view their metrics and purchase log.</span>
            </div>
          )}
        </div>
      </div>

      <CustomerModal isOpen={isCustomerModalOpen} onClose={() => { setIsCustomerModalOpen(false); setEditingCustomer(null); }} onSave={handleSaveCustomer} customer={editingCustomer} />
      <OrderModal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} onSave={handleSaveOrder} customer={selectedCustomer} />
    </div>
  );
}

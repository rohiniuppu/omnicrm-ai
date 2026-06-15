import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Plus } from 'lucide-react';

export default function OrderModal({ isOpen, onClose, onSave, customer }) {
  const [formData, setFormData] = useState({
    product_name: '',
    amount: '',
    date: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      product_name: '',
      amount: '',
      date: new Date().toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:MM
    });
    setError('');
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_name.trim() || !formData.amount) {
      setError('Product Name and Amount are required.');
      return;
    }

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid order amount.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onSave({
        customer_id: customer.id,
        product_name: formData.product_name.trim(),
        amount: parsedAmount,
        date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred while adding the order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800/80 animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Log Order for {customer.name}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Product Name *
            </label>
            <input
              type="text"
              name="product_name"
              required
              value={formData.product_name}
              onChange={handleChange}
              placeholder="e.g. Ergonomic Mechanical Keyboard"
              className="glass-input w-full rounded-lg px-3.5 py-2 text-sm focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Order Amount (INR ₹) *
            </label>
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0"
              required
              value={formData.amount}
              onChange={handleChange}
              placeholder="e.g. 3500.00"
              className="glass-input w-full rounded-lg px-3.5 py-2 text-sm focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Order Date & Time
            </label>
            <input
              type="datetime-local"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="glass-input w-full rounded-lg px-3.5 py-2 text-sm focus:ring-emerald-500/20"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/50 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 rounded-lg shadow-lg shadow-emerald-950/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? 'Logging...' : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

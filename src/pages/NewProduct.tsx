import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataStore } from '../data';
import type { Product } from '../lib/types';

export function NewProduct() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Product['category']>('table');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const product = await dataStore.createProduct({ name: name.trim(), category });
    navigate(`/products/${product.id}`);
  };

  return (
    <div className="content" style={{ maxWidth: 420 }}>
      <h1>Add product</h1>
      <form className="card elev-sm" style={{ padding: 24, gap: 16 }} onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" className="input" value={category} onChange={(e) => setCategory(e.target.value as Product['category'])}>
            <option value="table">Table</option>
            <option value="chair">Chair</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create product'}
        </button>
      </form>
    </div>
  );
}

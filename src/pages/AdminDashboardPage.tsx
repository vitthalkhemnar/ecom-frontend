import { useState } from 'react';
import UsersTab from '../components/admin/UsersTab';
import ProductsTab from '../components/admin/ProductsTab';

type Tab = 'users' | 'products';

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div className="page">
      <h1 className="detail-title">Admin dashboard</h1>
      <div className="admin-layout">
        <nav className="admin-tabs">
          <button
            type="button"
            className={`admin-tab ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            User management
          </button>
          <button
            type="button"
            className={`admin-tab ${tab === 'products' ? 'active' : ''}`}
            onClick={() => setTab('products')}
          >
            Product management
          </button>
        </nav>
        <div className="admin-content">
          {tab === 'users' && <UsersTab />}
          {tab === 'products' && <ProductsTab />}
        </div>
      </div>
    </div>
  );
}
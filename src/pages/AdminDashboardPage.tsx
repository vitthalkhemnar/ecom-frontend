import { useState } from 'react';
import UsersTab from '../components/admin/UsersTab';
import ProductsTab from '../components/admin/ProductsTab';
import OrdersTab from '../components/admin/OrdersTab';

type Tab = 'users' | 'products' | 'orders';

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div className="page admin-dashboard-page">
      <div className="admin-page-header">
        <h1 className="detail-title" style={{ margin: 0 }}>Admin Dashboard</h1>
      </div>

      <div className="admin-layout">
        <nav className="admin-tabs" aria-label="Admin Navigation">
          <button
            type="button"
            className={`admin-tab ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            Users
          </button>
          <button
            type="button"
            className={`admin-tab ${tab === 'products' ? 'active' : ''}`}
            onClick={() => setTab('products')}
          >
            Products
          </button>
          <button
            type="button"
            className={`admin-tab ${tab === 'orders' ? 'active' : ''}`}
            onClick={() => setTab('orders')}
          >
            Orders
          </button>
        </nav>

        <div className="admin-content">
          {tab === 'users' && <UsersTab />}
          {tab === 'products' && <ProductsTab />}
          {tab === 'orders' && <OrdersTab />}
        </div>
      </div>
    </div>
  );
}

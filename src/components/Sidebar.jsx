import { Link, useLocation } from 'react-router-dom';
import { 
  MdDashboard, 
  MdListAlt, 
  MdAddCircleOutline, 
  MdPeople, 
  MdAccountBalanceWallet, 
  MdPayment 
} from 'react-icons/md';

const navItems = [
  { path: '/', name: 'Dashboard', icon: MdDashboard },
  { path: '/orders', name: 'Orders', icon: MdListAlt },
  { path: '/new-order', name: 'New Order', icon: MdAddCircleOutline },
  { path: '/customers', name: 'Customers', icon: MdPeople },
  { path: '/udhari', name: 'Udhari Ledger', icon: MdAccountBalanceWallet },
  { path: '/payments', name: 'Payments', icon: MdPayment },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-neutral-900 h-screen fixed top-0 left-0 flex flex-col pt-6 border-r border-slate-700 shadow-xl">
      <div className="px-6 pb-6 border-b border-slate-700 mb-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-brand-orange to-yellow-500 bg-clip-text text-transparent">
          DattaKrupa
          <span className="block text-sm font-medium text-slate-400">Laundry System</span>
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-brand-orange text-white shadow-md shadow-orange-500/20' 
                  : 'text-slate-300 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Icon 
                className={`mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                }`} 
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-3 text-sm text-slate-400">
          <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-brand-orange font-bold">
            A
          </div>
          <div>
            <p className="font-medium text-slate-200">Admin User</p>
            <p className="text-xs">DattaKrupa Laundry</p>
          </div>
        </div>
      </div>
    </div>
  );
}

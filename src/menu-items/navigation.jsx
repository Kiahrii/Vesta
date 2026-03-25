const navigation = {
  id: 'group-dashboard-loading-unique',
  title: 'Navigation',
  type: 'group',
  children: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      type: 'item',
      icon: 'ph ph-house-line',
      url: '/'
    },
    {
      id: 'room-management',
      title: 'Room Management',
      type: 'item',
      icon: 'ph ph-door',
      url: '/room-management'
    },
  {    id: 'tenant-management',
      title: 'Tenant Management',
      type: 'item',
      icon: 'ph ph-users',
      url: '/tenant-management'
    },
    {
      id: 'rent-payment',
      title: 'Rent Payment',
      type: 'item',
      icon: 'ph ph-wallet',
      url: '/rent-payment'
    },
    {
      id: 'maintenance-report',
      title: 'Maintenance Report',
      type: 'item',
      icon: 'ph ph-wrench',
      url: '/maintenance-report'
    },
    {
      id: 'archive',
      title: 'Archive',
      type: 'collapse',
      icon: 'ph ph-archive',
      children: [
        {
          id: 'past-tenants',
          title: 'Past Tenants',
          type: 'item',
          icon: 'ph ph-users-three',
          url: '/past-tenants'
        },
        {
          id: 'payment-history',
          title: 'Payment History',
          type: 'item',
          icon: 'ph ph-receipt',
          url: '/payment-history'
        },
        {
          id: 'maintenance-history',
          title: 'Maintenance History',
          type: 'item',
          icon: 'ph ph-clipboard-text',
          url: '/maintenance-history'
        }
      ]
    }
  ]
};

export default navigation;


import { Injectable } from '@angular/core';
import { Application } from '../models/application.model';
import { UserRole } from '../models/user.model';

const ALL_APPLICATIONS: Application[] = [
  {
    id: 'app1',
    name: 'Dashboard Analytics',
    description: 'View key performance indicators and business metrics.',
    icon: 'M3 13H5V11H3V13ZM3 17H5V15H3V17ZM3 9H5V7H3V9ZM7 13H17V11H7V13ZM7 17H17V15H7V17ZM7 7V9H17V7H7Z', // Simplified chart icon
    url: '#/dashboard'
  },
  {
    id: 'app2',
    name: 'User Management',
    description: 'Administer user accounts, roles, and permissions.',
    icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    url: '#/users'
  },
  {
    id: 'app3',
    name: 'Content Editor',
    description: 'Create and manage website content and articles.',
    icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    url: '#/content'
  },
  {
    id: 'app4',
    name: 'Support Tickets',
    description: 'View and respond to customer support inquiries.',
    icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 12H5.17L4 15.17V4h16v10z',
    url: '#/support'
  },
];

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  getApplicationsForRole(role: UserRole): Application[] {
    switch (role) {
      case 'admin':
        return ALL_APPLICATIONS;
      case 'user':
        return ALL_APPLICATIONS.filter(app => ['app1', 'app3', 'app4'].includes(app.id));
      case 'guest':
        return [ALL_APPLICATIONS.find(app => app.id === 'app1')!];
      default:
        return [];
    }
  }
}

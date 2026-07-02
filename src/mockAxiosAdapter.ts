import axios from 'axios';
import initialMockData from '@/data/mockData.json';

// Initialize localStorage if empty
const initDB = () => {
  if (typeof window !== 'undefined' && !localStorage.getItem('mockDB')) {
    const extendedData = {
      ...initialMockData,
      roles: [
        { _id: 'role1', roleName: 'Admin' },
        { _id: 'role2', roleName: 'Reseller' },
        { _id: 'role3', roleName: 'Sales Agent' }
      ],
      teams: [
        { _id: 'team1', name: 'Alpha Squad' },
        { _id: 'team2', name: 'Beta Force' }
      ],
      organizations: [
        { _id: 'org1', name: 'Acme Corp' },
        { _id: 'org2', name: 'Global Tech' }
      ],
      tasks: [
        { 
          _id: 'task1', 
          title: 'Call John Doe', 
          priority: 'High', 
          status: 'Pending', 
          dueDate: new Date().toISOString() 
        }
      ]
    };
    localStorage.setItem('mockDB', JSON.stringify(extendedData));
  }
};

const getDB = () => {
  if (typeof window === 'undefined') return { ...initialMockData };
  const data = localStorage.getItem('mockDB');
  return data ? JSON.parse(data) : { ...initialMockData };
};

const saveDB = (data: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mockDB', JSON.stringify(data));
  }
};

const generateId = () => `mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// Mapping routes to collections
const getCollectionName = (url: string) => {
  if (url.includes('/statuses') || url.includes('/lead-status') || url.includes('/leadstatus')) return 'statuses';
  if (url.includes('/sources') || url.includes('/leadsources')) return 'sources';
  if (url.includes('/taskstatus') || url.includes('/taskstatuses')) return 'taskstatuses';
  if (url.includes('/leads')) return 'leads';
  if (url.includes('/users') || url.includes('/staff')) return 'users';
  if (url.includes('/tasks')) return 'tasks';
  if (url.includes('/roles')) return 'roles';
  if (url.includes('/teams')) return 'teams';
  if (url.includes('/organizations')) return 'organizations';
  return null;
};

// Override the default axios adapter to intercept all requests
axios.defaults.adapter = async (config) => {
  initDB();
  const db = getDB();
  const { url = '', method = 'get', data } = config;
  console.log(`[Mock API] ${method.toUpperCase()} ${url}`);

  let responseData: any = { message: 'Success' };
  let parsedData = data ? JSON.parse(data) : {};
  const collectionName = getCollectionName(url);

  if (method.toLowerCase() === 'get') {
    if (url.includes('/settings/lead-fields')) {
      responseData = {
        data: [
          { id: 'customerName', label: 'Full Name' },
          { id: 'companyName', label: 'Company Name' },
          { id: 'address', label: 'Address' },
          { id: 'customerContact', label: 'Phone' },
          { id: 'customerEmail', label: 'Email' },
          { id: 'leadSource', label: 'Source' },
          { id: 'leadStatus', label: 'Status' },
          { id: 'assignedTo', label: 'Assign Staff' }
        ]
      };
    } else if (url.includes('/settings/required-fields')) {
      responseData = {
        data: {
          requiredLeads: db.requiredLeads || ['customerName', 'customerContact', 'leadSource', 'leadStatus'],
          requiredTasks: db.requiredTasks || ['subject', 'status', 'priority']
        }
      };
    } else if (url.includes('/kanban')) {
      responseData = { data: db.kanbanData || [] };
    } else if (url.includes('/summary')) {
      responseData = {
        data: {
          totalLeads: db.leads?.length || 0,
          currentMonthLeads: db.leads?.length || 0,
          totalRevenue: 50000,
          totalCommission: 5000,
          totalSettlement: 4000,
          statusWiseCounts: []
        }
      };
    } else if (url.includes('/resellers')) {
      responseData = { data: (db.users || []).filter((u: any) => u.role === 'Reseller' || u.role?.roleName === 'Reseller') };
    } else if (collectionName && db[collectionName]) {
      responseData = { data: db[collectionName], pagination: { totalPages: 1, currentPage: 1, limit: 100 } };
    } else {
      responseData = { data: [] };
    }
  } 
  else if (method.toLowerCase() === 'post') {
    if (url.includes('/settings/required-fields')) {
      db.requiredLeads = parsedData.requiredLeads || [];
      db.requiredTasks = parsedData.requiredTasks || [];
      saveDB(db);
      responseData = { message: 'Settings saved successfully' };
    }
    else if (collectionName) {
      if (['statuses', 'sources', 'taskstatuses'].includes(collectionName)) {
        const nameLower = (parsedData.name || '').trim().toLowerCase();
        const exists = db[collectionName]?.some((item: any) => (item.name || '').trim().toLowerCase() === nameLower);
        if (exists) {
          const typeName = collectionName === 'statuses' ? 'Status' : (collectionName === 'sources' ? 'Source' : 'Task Status');
          return {
            data: { message: `${typeName} name already exists` },
            status: 400,
            statusText: 'Bad Request',
            headers: {},
            config,
            request: {}
          };
        }
      }
      const newItem = { _id: generateId(), id: generateId(), ...parsedData, createdAt: new Date().toISOString() };
      if (!db[collectionName]) db[collectionName] = [];
      db[collectionName].push(newItem);
      saveDB(db);
      responseData = { data: newItem, message: 'Created successfully' };
    }
  } 
  else if (method.toLowerCase() === 'put' || method.toLowerCase() === 'patch') {
    if (collectionName) {
      const idMatch = url.match(/\/([a-zA-Z0-9_-]+)(?:\/|$)/);
      const id = idMatch ? idMatch[1] : parsedData._id || parsedData.id;
      
      if (db[collectionName]) {
        if (['statuses', 'sources', 'taskstatuses'].includes(collectionName)) {
          const nameLower = (parsedData.name || '').trim().toLowerCase();
          const exists = db[collectionName]?.some((item: any) => 
            (item._id !== id && item.id !== id) && 
            (item.name || '').trim().toLowerCase() === nameLower
          );
          if (exists) {
            const typeName = collectionName === 'statuses' ? 'Status' : (collectionName === 'sources' ? 'Source' : 'Task Status');
            return {
              data: { message: `${typeName} name already exists` },
              status: 400,
              statusText: 'Bad Request',
              headers: {},
              config,
              request: {}
            };
          }
        }
        const index = db[collectionName].findIndex((item: any) => item._id === id || item.id === id);
        if (index !== -1) {
          db[collectionName][index] = { ...db[collectionName][index], ...parsedData };
          saveDB(db);
          responseData = { data: db[collectionName][index], message: 'Updated successfully' };
        }
      }
    }
  } 
  else if (method.toLowerCase() === 'delete') {
    if (collectionName) {
      const idMatch = url.match(/\/([a-zA-Z0-9_-]+)(?:\/|$)/);
      const id = idMatch ? idMatch[1] : null;
      
      if (id && db[collectionName]) {
        db[collectionName] = db[collectionName].filter((item: any) => item._id !== id && item.id !== id);
        saveDB(db);
        responseData = { message: 'Deleted successfully' };
      }
    }
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    data: responseData,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {}
  };
};

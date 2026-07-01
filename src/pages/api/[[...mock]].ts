import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src', 'data', 'mockData.json');

const readDB = () => {
  if (!fs.existsSync(dbPath)) {
    // If mockData.json doesn't exist, create it with basic structure
    const initial = { users: [], sources: [], statuses: [], leads: [], tasks: [], roles: [], teams: [], organizations: [], settlements: [], taskstatuses: [] };
    fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  const fileContent = fs.readFileSync(dbPath, 'utf8');
  const data = JSON.parse(fileContent);

  // Initialize missing collections if they don't exist
  let updated = false;
  if (!data.users) { data.users = []; updated = true; }
  if (!data.leads) { data.leads = []; updated = true; }
  if (!data.sources) { data.sources = []; updated = true; }
  if (!data.tasks) { data.tasks = []; updated = true; }
  if (!data.settlements) { data.settlements = []; updated = true; }
  if (!data.departments) { data.departments = []; updated = true; }
  
  // Expand statuses to include all CRM pipeline stages
  const defaultStatuses = [
    { _id: 'status1', name: 'New' },
    { _id: 'status2', name: 'Contacted' },
    { _id: 'status3', name: 'Follow-Up' },
    { _id: 'status4', name: 'Interested' },
    { _id: 'status5', name: 'Qualified' },
    { _id: 'status6', name: 'Not Interested' },
    { _id: 'status7', name: 'Lost' },
    { _id: 'status8', name: 'Won' }
  ];
  if (!data.statuses || data.statuses.length < 8) {
    data.statuses = defaultStatuses;
    updated = true;
  }

  if (!data.roles) {
    data.roles = [
      { _id: 'role1', roleName: 'Admin' },
      { _id: 'role2', roleName: 'Reseller' }
    ];
    updated = true;
  }
  if (!data.teams) {
    data.teams = [
      { _id: 'team1', name: 'Alpha Squad' },
      { _id: 'team2', name: 'Beta Force' }
    ];
    updated = true;
  }
  if (!data.organizations) {
    data.organizations = [
      { _id: 'org1', name: 'Acme Corp' },
      { _id: 'org2', name: 'Global Tech' }
    ];
    updated = true;
  }
  if (!data.taskstatuses) {
    data.taskstatuses = [
      { _id: 'ts1', name: 'Pending' },
      { _id: 'ts2', name: 'In Progress' },
      { _id: 'ts3', name: 'Completed' }
    ];
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  }

  return data;
};

const writeDB = (data: any) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
};

const generateId = () => `mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const getCollectionKey = (type: string) => {
  switch (type) {
    case 'lead': return 'leads';
    case 'reseller': return 'users';
    case 'role': return 'roles';
    case 'team': return 'teams';
    case 'department': return 'departments';
    case 'organization': return 'organizations';
    case 'leadstatus': return 'statuses';
    case 'leadsources': return 'sources';
    case 'taskstatus': return 'taskstatuses';
    case 'task': return 'tasks';
    case 'settlement': return 'settlements';
    default: return null;
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = readDB();
  const { method = 'GET', query } = req;

  // Clean URL to parse route details
  const mockRoute = query.mock as string[];
  const mainType = mockRoute?.[0]; // e.g. "lead", "reseller", "role"
  const subType = mockRoute?.[1];  // e.g. "create", "my", or ID

  console.log(`[Mock Server API] ${method} ${req.url}`);

  // Handle Authentication Mock
  if (mainType === 'auth' && subType === 'login') {
    return res.status(200).json({
      data: {
        token: 'mock-jwt-token',
        user: db.users[0] || { _id: 'mock-admin', fullName: 'Mock Admin', email: 'admin@mock.com' },
        role: 'admin',
        permissions: {
          lead: { readAll: true, readOwn: true, create: true, edit: true, delete: true },
          task: { readAll: true, readOwn: true, create: true, edit: true, delete: true },
          staff: { readAll: true, readOwn: true, create: true, edit: true, delete: true },
          role: { readAll: true, readOwn: true, create: true, edit: true, delete: true },
          leadStatus: { readAll: true, readOwn: true, create: true, edit: true, delete: true },
          leadSource: { readAll: true, readOwn: true, create: true, edit: true, delete: true },
          setup: { readAll: true, readOwn: true, create: true, edit: true, delete: true }
        }
      }
    });
  }

  const collectionKey = getCollectionKey(mainType);

  if (method === 'GET') {
    // Lead Counts & Summaries
    if (mainType === 'lead' && subType === 'count-summary') {
      return res.status(200).json({
        data: {
          totalLeads: db.leads.length,
          currentMonthLeads: db.leads.length,
          totalRevenue: 50000,
          totalCommission: 5000,
          totalSettlement: 4000,
          statusWiseCounts: db.statuses.map((s: any) => ({
            statusId: s._id,
            statusName: s.name,
            count: db.leads.filter((l: any) => l.leadStatus === s._id || l.leadStatus?._id === s._id).length
          }))
        }
      });
    }

    // Lead Kanban View
    if (mainType === 'lead' && subType === 'kanban') {
      const kanban = db.statuses.map((s: any) => ({
        statusId: s._id,
        statusName: s.name,
        leads: db.leads.filter((l: any) => l.leadStatus === s._id || l.leadStatus?._id === s._id)
      }));
      return res.status(200).json({ data: kanban });
    }

    if (mainType === 'lead' && subType === 'kanban-status') {
      const statusId = query.statusId as string;
      const leadsForStatus = db.leads.filter((l: any) => l.leadStatus === statusId || l.leadStatus?._id === statusId);
      return res.status(200).json({ data: leadsForStatus, pagination: { totalPages: 1, currentPage: 1 } });
    }

    // Default collection fetches
    if (collectionKey && db[collectionKey]) {
      return res.status(200).json({ data: db[collectionKey], pagination: { totalPages: 1, currentPage: 1 } });
    }

    return res.status(200).json({ data: [] });
  }

  // Map relation IDs to full objects to keep schema consistent
  const resolveRelations = (item: any) => {
    const resolved = { ...item };
    if (resolved.leadStatus && typeof resolved.leadStatus === 'string') {
      const match = db.statuses.find((s: any) => s._id === resolved.leadStatus);
      if (match) resolved.leadStatus = match;
    }
    if (resolved.leadSource && typeof resolved.leadSource === 'string') {
      const match = db.sources.find((s: any) => s._id === resolved.leadSource);
      if (match) resolved.leadSource = match;
    }
    if (resolved.assignedTo && typeof resolved.assignedTo === 'string') {
      const match = db.users.find((u: any) => u._id === resolved.assignedTo);
      if (match) resolved.assignedTo = { _id: match._id, fullName: match.fullName, avatar: match.avatar };
    }
    return resolved;
  };

  if (method === 'POST') {
    if (collectionKey && db[collectionKey]) {
      const resolvedBody = resolveRelations(req.body);
      const newItem = {
        _id: generateId(),
        id: generateId(),
        ...resolvedBody,
        createdAt: new Date().toISOString()
      };
      db[collectionKey].push(newItem);
      writeDB(db);
      return res.status(201).json({ data: newItem, message: 'Created successfully' });
    }
  }

  if (method === 'PUT' || method === 'PATCH') {
    if (collectionKey && db[collectionKey]) {
      // Find the ID to update
      const id = subType || req.body._id || req.body.id;
      const index = db[collectionKey].findIndex((item: any) => item._id === id || item.id === id);
      
      if (index !== -1) {
        const resolvedBody = resolveRelations(req.body);
        db[collectionKey][index] = { ...db[collectionKey][index], ...resolvedBody };
        writeDB(db);
        return res.status(200).json({ data: db[collectionKey][index], message: 'Updated successfully' });
      }
    }
  }

  if (method === 'DELETE') {
    if (collectionKey && db[collectionKey]) {
      const id = subType;
      if (id) {
        db[collectionKey] = db[collectionKey].filter((item: any) => item._id !== id && item.id !== id);
        writeDB(db);
        return res.status(200).json({ message: 'Deleted successfully' });
      }
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

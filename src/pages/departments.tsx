'use client';

import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Dialog from '@/components/Dialog';
import DataTable, { Column } from '@/components/DataTable';
import DeleteDialog from '@/components/DeleteDialog';
import axios from 'axios';
import { getAuthToken } from '@/config';
import { toast } from 'react-toastify';
import FormInput from '@/components/ui/Input';

type Department = { _id: string; name: string; createdAt?: string };

function useDebounce<T>(value: T, delay = 500): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// Validation schema
const validationSchema = Yup.object({
  name: Yup.string()
    .required('Department name is required')
    .min(2, 'Department name must be at least 2 characters')
    .max(100, 'Department name must be at most 100 characters')
    .matches(/^[a-zA-Z0-9\s&-]+$/, 'Department name can only contain letters, numbers, spaces, &, and -'),
});

export function DepartmentsContent() {
  const [data, setData] = useState<Department[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/reseller', { headers });
      setAllUsers(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const getDepartmentUsers = (deptId: string) => {
    return allUsers.filter(u => 
      typeof u.department === 'object' 
        ? u.department?._id === deptId 
        : u.department === deptId
    );
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [toDelete, setToDelete] = useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  // Initialize formik
  const formik = useFormik({
    validateOnChange: false,
    validateOnBlur: false,
    initialValues: {
      _id: '',
      name: '',
    },
    validationSchema,

    onSubmit: async (values) => {
      await handleSave(values);
    },
    enableReinitialize: true,
  });

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/department', {
        headers,
        params: { search: debouncedSearch || undefined, page: currentPage, limit: pageSize },
      });
      setData(res.data?.data ?? []);
      setTotalRecords(res.data?.pagination?.totalRecords ?? 0);
    } catch (err: any) {
      console.error('Failed to fetch departments', err);
      setData([]);
      toast.error(err?.response?.data?.message || 'Failed to load departments');
    }
  };

  useEffect(() => {
    fetchData();
    fetchUsers();
  }, [debouncedSearch, currentPage, pageSize]);

  const handleSave = async (values: { _id?: string; name: string }) => {
    setIsSubmitting(true);
    try {
      if (values._id) {
        await axios.put(`/api/department/${values._id}`, { name: values.name }, { headers });
        toast.success('Department updated successfully');
      } else {
        await axios.post('/api/department', { name: values.name }, { headers });
        toast.success('Department created successfully');
      }
      await fetchData();
      setIsDialogOpen(false);
      formik.resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`/api/department/${toDelete._id}`, { headers });
      toast.success('Department deleted successfully');
      await fetchData();
      setShowDeleteDialog(false);
      setToDelete(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    formik.resetForm();
  };

  const handleEdit = (row: Department) => {
    formik.setValues({
      _id: row._id,
      name: row.name,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (row: Department) => {
    setToDelete(row);
    setShowDeleteDialog(true);
  };

  const columns: Column<Department>[] = [
    {
      key: 'name',
      label: 'DEPARTMENT NAME',
      sortable: true,
      render: (val: any) => <span className="font-medium text-gray-900">{val || '-'}</span>,
    },
    {
      key: 'users',
      label: 'DEPARTMENT USERS',
      render: (val, row) => {
        const users = getDepartmentUsers(row._id);
        if (users.length === 0) return <span className="text-gray-400">No users</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {users.map(u => (
              <span key={u._id} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {u.fullName}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      key: 'createdAt',
      label: 'CREATED DATE',
      sortable: true,
      render: (val: any) => <span>{val ? new Date(val).toLocaleDateString() : '-'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-600 mt-1">Manage corporate departments</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
          className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary transition"
        >
          Add Department
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <DataTable
          columns={columns}
          data={data}
          loading={false}
          currentPage={currentPage}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          onSearch={setSearch}
          searchable={true}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          canEdit={() => true}
          canDelete={() => true}
        />
      </div>

      {/* Delete Confirmation */}
      <DeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete Department"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowDeleteDialog(false)}
              className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-6 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition cursor-pointer"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-gray-600">
          Are you sure you want to delete the department "{toDelete?.name}"?
        </p>
      </DeleteDialog>

      {/* Add/Edit Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={formik.values._id ? `Edit Department: ${formik.values.name}` : "Add New Department"}
      >
        <form onSubmit={formik.handleSubmit} className="space-y-6">
          <FormInput
            name="name"
            label="Department Name"
            placeholder="e.g. Human Resources"
            value={formik.values.name}
            onChange={formik.handleChange}
            error={formik.touched.name && formik.errors.name ? formik.errors.name : undefined}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default function DepartmentsPage() {
  return <DepartmentsContent />;
}

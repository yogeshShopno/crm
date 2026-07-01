// UpdateProfile Dialog
'use client';

import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { EMAIL_REGEX } from '@/utills/emailRegex';
import { baseUrl, getAuthToken } from '@/config';
import Dialog from './Dialog';
import FormInput from './ui/Input';
import { FiCamera } from 'react-icons/fi';

interface UpdateProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    profileImage?: string;
    role?: any;
    status?: string;
    commissionRate?: any;
  } | null;
  onSuccess: () => void;
}

const profileValidationSchema = Yup.object({
  fullName: Yup.string()
    .required('Full name is required')
    .min(2, 'Full name must be at least 2 characters'),
  email: Yup.string()
    .required('Email is required')
    .matches(EMAIL_REGEX, 'Invalid email format'),
  phone: Yup.string()
    .required('Phone number is required')
    .matches(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),
  password: Yup.string()
    .notRequired()
    .test('min-length', 'Password must be at least 6 characters', (val) =>
      !val || val.trim() === '' || val.trim().length >= 6
    ),
  confirmPassword: Yup.string().test(
    'passwords-match',
    'Passwords do not match',
    function (value) {
      const { password } = this.parent;
      if (!password || password.trim() === '') return true;
      return value === password;
    }
  ),
});

export default function UpdateProfileDialog({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
}: UpdateProfileDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema: profileValidationSchema,
    validateOnChange: false,
    validateOnBlur: false,
    enableReinitialize: true,
    onSubmit: async (values) => {
      await handleSubmit(values);
    },
  });

  useEffect(() => {
    if (isOpen && currentUser) {
      formik.setValues({
        fullName: currentUser.fullName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        password: '',
        confirmPassword: '',
      });
      setSelectedFile(null);
      setError(null);
      if (currentUser.profileImage) {
        setPreviewImage(
          currentUser.profileImage.startsWith('http')
            ? currentUser.profileImage
            : `${baseUrl.getImageUrl}/images/ResellerProfileImages/${currentUser.profileImage}`
        );
      } else {
        setPreviewImage(null);
      }
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (error) setError(null);
  }, [formik.values, selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, JPG, GIF, and WEBP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }
    setSelectedFile(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const payload = new FormData();
      payload.append('fullName', values.fullName);
      payload.append('email', values.email);
      payload.append('phone', values.phone);
      if (values.password && values.password.trim()) {
        payload.append('password', values.password.trim());
      }
      if (selectedFile) {
        payload.append('profileImage', selectedFile);
      }
      const { default: axios } = await import('axios');
      await axios.put(baseUrl.updateMyProfile, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Update My Profile"
      size="xl"
      footer={
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="update-profile-form"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <form noValidate id="update-profile-form" onSubmit={formik.handleSubmit} className="p-1 space-y-6">

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="border border-gray-100 rounded-xl bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50 text-blue-600 font-semibold text-sm uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            PROFILE IMAGE
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <FiCamera className="w-8 h-8" />
                </div>
              )}
            </div>
            <label
              htmlFor="update-profile-image-upload"
              className="px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 font-medium text-sm hover:bg-blue-100 cursor-pointer transition-colors text-center inline-flex items-center gap-1.5"
            >
              <FiCamera className="w-4 h-4" />
              {selectedFile ? 'Change Photo' : 'Upload Photo'}
              <input
                id="update-profile-image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-400">JPG, PNG, GIF, WEBP up to 5MB</p>
          </div>
        </div>

        <div className="border border-gray-100 rounded-xl bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50 text-blue-600 font-semibold text-sm uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            PERSONAL INFORMATION
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Full Name"
              name="fullName"
              type="text"
              value={formik.values.fullName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.fullName && formik.errors.fullName ? formik.errors.fullName : undefined}
              required
              placeholder="John Doe"
            />
            <FormInput
              label="Email Address"
              name="email"
              type="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && formik.errors.email ? formik.errors.email : undefined}
              required
              placeholder="name@email.com"
            />
            <div className="md:col-span-2">
              <FormInput
                label="Phone Number"
                name="phone"
                type="tel"
                isPhone={true}
                value={formik.values.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  formik.setFieldValue('phone', val);
                }}
                onBlur={formik.handleBlur}
                error={formik.touched.phone && formik.errors.phone ? formik.errors.phone : undefined}
                required
                placeholder="98765 43210"
              />
            </div>
          </div>
        </div>

        <div className="border border-gray-100 rounded-xl bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50 text-blue-600 font-semibold text-sm uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            CHANGE PASSWORD
            <span className="text-gray-400 font-normal normal-case tracking-normal text-xs ml-1">(optional)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="New Password"
              name="password"
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && formik.errors.password ? formik.errors.password : undefined}
              placeholder="Leave blank to keep current"
            />
            <FormInput
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.confirmPassword && formik.errors.confirmPassword ? formik.errors.confirmPassword : undefined}
              placeholder="Re-enter new password"
            />
          </div>
        </div>

      </form>
    </Dialog>
  );
}

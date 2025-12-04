'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import { AceInput } from '@/share/ui/AceInput';
import { AceButton } from '@/share/ui/AceButton';
import { FormErrorText } from '@/share/ui/FormErrorText';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';

type ChangePasswordFormValues = {
  oldPassword?: string;
  newPassword: string;
  confirmNewPassword: string;
};

const numericMsg = 'Mật khẩu chỉ gồm chữ số (0-9)';
const minMsg = 'Mật khẩu tối thiểu 6 ký tự';

export const ChangePasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams?.get('mode');
  const { setTokensAndCustomerFromLoginResponse, setMustChangePassword, mustChangePassword } =
    useAuth();
  const [submitError, setSubmitError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const isForceMode = useMemo(
    () => modeParam === 'force' || mustChangePassword,
    [modeParam, mustChangePassword],
  );

  const schema = useMemo(() => {
    const baseNew = yup
      .string()
      .required('Mật khẩu mới bắt buộc')
      .matches(/^[0-9]+$/, numericMsg)
      .min(6, minMsg);
    const confirm = yup
      .string()
      .required('Vui lòng nhập lại mật khẩu mới')
      .oneOf([yup.ref('newPassword')], 'Mật khẩu mới không khớp');

    if (isForceMode) {
      return yup.object({
        newPassword: baseNew,
        confirmNewPassword: confirm,
      });
    }
    return yup.object({
        oldPassword: yup
          .string()
          .required('Mật khẩu hiện tại bắt buộc')
          .matches(/^[0-9]+$/, numericMsg)
          .min(6, minMsg),
        newPassword: baseNew,
        confirmNewPassword: confirm,
      });
  }, [isForceMode]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: yupResolver(schema),
    mode: 'onSubmit',
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setSubmitError('');
    setSuccessMessage('');

    try {
      const payload = isForceMode
        ? { newPassword: values.newPassword, confirmPassword: values.confirmNewPassword }
        : {
            oldPassword: values.oldPassword,
            newPassword: values.newPassword,
            confirmPassword: values.confirmNewPassword,
          };
      const response = await authService.changePassword(payload);
      setTokensAndCustomerFromLoginResponse(response);
      setMustChangePassword(false);
      setSuccessMessage(response.message ?? 'Đổi mật khẩu thành công');
      router.replace(routes.dashboard);
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Không thể đổi mật khẩu. Vui lòng thử lại.';
      setSubmitError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {isForceMode ? (
        <p className="text-sm text-[#333] bg-amber-50 border border-amber-200 rounded-lg p-3">
          Bạn cần đổi mật khẩu để tiếp tục sử dụng ứng dụng.
        </p>
      ) : null}

      {!isForceMode ? (
        <div className="space-y-2">
          <label htmlFor="oldPassword" className="text-sm font-medium text-[#333]">
            Mật khẩu hiện tại
          </label>
          <AceInput
            id="oldPassword"
            type="password"
            placeholder="Nhập mật khẩu hiện tại (tối thiểu 6 số)"
            inputMode="numeric"
            pattern="[0-9]*"
            minLength={6}
            error={Boolean(errors.oldPassword)}
            {...register('oldPassword')}
          />
          <FormErrorText>{errors.oldPassword?.message}</FormErrorText>
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="newPassword" className="text-sm font-medium text-[#333]">
          Mật khẩu mới
        </label>
        <AceInput
          id="newPassword"
          type="password"
          placeholder="Mật khẩu mới (tối thiểu 6 số)"
          inputMode="numeric"
          pattern="[0-9]*"
          minLength={6}
          error={Boolean(errors.newPassword)}
          {...register('newPassword')}
        />
        <FormErrorText>{errors.newPassword?.message}</FormErrorText>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmNewPassword" className="text-sm font-medium text-[#333]">
          Nhập lại mật khẩu mới
        </label>
        <AceInput
          id="confirmNewPassword"
          type="password"
          placeholder="Nhập lại mật khẩu mới"
          inputMode="numeric"
          pattern="[0-9]*"
          minLength={6}
          error={Boolean(errors.confirmNewPassword)}
          {...register('confirmNewPassword')}
        />
        <FormErrorText>{errors.confirmNewPassword?.message}</FormErrorText>
      </div>

      {submitError ? (
        <p className="text-sm text-red-500" role="alert">
          {submitError}
        </p>
      ) : null}

      {successMessage ? (
        <p className="text-sm text-green-600" role="status">
          {successMessage}
        </p>
      ) : null}

      <AceButton type="submit" isLoading={isSubmitting}>
        Đổi mật khẩu
      </AceButton>
    </form>
  );

  // NOTE: dynamic form supports force mode (no oldPassword) vs normal mode (require oldPassword).
};

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import { AceInput } from '@/share/ui/AceInput';
import { AceButton } from '@/share/ui/AceButton';
import { FormErrorText } from '@/share/ui/FormErrorText';
import { routes } from '@/lib/routes';
import { useAuth } from '@/hooks/useAuth';

type LoginFormValues = {
  memberNo: string;
  password: string;
};

const schema = yup.object({
  memberNo: yup
    .string()
    .required('Mã khách hàng bắt buộc')
    .matches(/^[0-9]+$/, 'Mã khách hàng chỉ gồm chữ số.'),
  password: yup
    .string()
    .required('Mật khẩu bắt buộc')
    .matches(/^[0-9]+$/, 'Mật khẩu chỉ gồm chữ số.')
    .min(6, 'Mật khẩu phải tối thiểu 6 số'),
});

export const LoginForm = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(schema),
    mode: 'onSubmit',
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError('');
    try {
      const result = await login({ memberNo: values.memberNo, password: values.password });
      if (result.customer?.mustChangePassword) {
        router.replace(`${routes.dashboard}?tab=account`);
      } else {
        router.replace(routes.dashboard);
      }
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      setSubmitError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label htmlFor="memberNo" className="text-sm font-medium text-[#333]">
          Mã khách hàng
        </label>
        <AceInput
          id="memberNo"
          placeholder="Nhập mã khách hàng"
          inputMode="numeric"
          pattern="[0-9]*"
          error={Boolean(errors.memberNo)}
          {...register('memberNo')}
        />
        <FormErrorText>{errors.memberNo?.message}</FormErrorText>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-[#333]">
          Mật khẩu (chỉ gồm số)
        </label>
        <AceInput
          id="password"
          type="password"
          placeholder="Nhập mật khẩu 6 số"
          inputMode="numeric"
          pattern="[0-9]*"
          minLength={6}
          error={Boolean(errors.password)}
          {...register('password')}
        />
        <div className="text-xs text-[#777] leading-relaxed">
          Mật khẩu lần đầu do nhân viên ACE cung cấp. Sau khi đăng nhập, ứng dụng sẽ yêu cầu bạn đổi
          mật khẩu mới.
        </div>
        <FormErrorText>{errors.password?.message}</FormErrorText>
      </div>

      {submitError ? (
        <p className="text-sm text-red-500" role="alert">
          {submitError}
        </p>
      ) : null}

      <AceButton type="submit" isLoading={isSubmitting}>
        Đăng nhập
      </AceButton>

      <div className="text-center">
        <Link
          href={routes.forgotPassword}
          className="text-sm font-medium text-[#2b6cb0] hover:text-[#245a93]"
        >
          Quên mật khẩu?
        </Link>
      </div>
    </form>
  );

  // NOTE: replaced bản tiếng Anh bằng tiếng Việt đầy đủ.
};

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion, AnimatePresence } from 'framer-motion';
import { AceInput } from '@/share/ui/AceInput';
import { AceButton } from '@/share/ui/AceButton';
import { FormErrorText } from '@/share/ui/FormErrorText';
import { appApi } from '@/services/appApi';

type ForgotPasswordFormValues = {
  memberNo: string;
};

const schema = yup.object({
  memberNo: yup
    .string()
    .required('Mã khách hàng không được để trống')
    .matches(/^[0-9]+$/, 'Mã khách hàng chỉ gồm chữ số.'),
});

export const ForgotPasswordForm = () => {
  const [info, setInfo] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ForgotPasswordFormValues>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setError(null);
    try {
      await appApi.requestPasswordReset(values.memberNo.trim());
      setInfo(
        'Yêu cầu đổi mật khẩu đã được gửi đến nhân viên ACE. Nhân viên sẽ liên hệ với bạn trong thời gian sớm nhất.',
      );
      reset();
    } catch (err) {
      // Không tiết lộ khách hàng có tồn tại hay không
      setInfo(
        'Yêu cầu đổi mật khẩu đã được gửi đến nhân viên ACE. Nhân viên sẽ liên hệ với bạn trong thời gian sớm nhất.',
      );
      setError('Không thể gửi yêu cầu lúc này, vui lòng thử lại.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label htmlFor="memberNo" className="text-sm font-medium text-[#333]">
          Mã khách hàng (memberNo)
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

      <AceButton
        type="submit"
        isLoading={isSubmitting}
        className="!bg-[#2b6cb0] !hover:bg-[#245a93]"
      >
        Gửi yêu cầu
      </AceButton>

      <AnimatePresence>
        {info ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="text-sm text-[#333] bg-white/80 border border-[#c7d5e8] rounded-lg p-3"
          >
            {info}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </form>
  );

  // NOTE: bản tiếng Việt, gọi /auth/request-password-reset.
};

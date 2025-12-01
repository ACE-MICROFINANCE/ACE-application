'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { AceInput } from '@/share/ui/AceInput';
import { AceButton } from '@/share/ui/AceButton';
import { FormErrorText } from '@/share/ui/FormErrorText';
import { motion, AnimatePresence } from 'framer-motion';

type ForgotPasswordFormValues = {
  customerId: string;
};

const schema = yup.object({
  customerId: yup
    .string()
    .required('Mã khách hàng bắt buộc')
    .matches(/^[0-9]+$/, 'Mã khách hàng chỉ gồm số.'),
});

export const ForgotPasswordForm = () => {
  const [info, setInfo] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: yupResolver(schema),
  });

  const onSubmit = (values: ForgotPasswordFormValues) => {
    setInfo(
      'Tính năng quên mật khẩu hiện đang được phát triển. Vui lòng liên hệ cán bộ ACE để được hỗ trợ.',
    );
    return values;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label htmlFor="customerId" className="text-sm font-medium text-[#333]">
          Mã khách hàng
        </label>
        <AceInput
          id="customerId"
          placeholder="Nhập mã khách hàng"
          inputMode="numeric"
          pattern="[0-9]*"
          error={Boolean(errors.customerId)}
          {...register('customerId')}
        />
        <FormErrorText>{errors.customerId?.message}</FormErrorText>
      </div>

      <AceButton
        type="submit"
        isLoading={isSubmitting}
        className="!bg-gray-400 !hover:bg-gray-500"
      >
        Yêu cầu cấp lại mật khẩu (đang phát triển)
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
    </form>
  );
};

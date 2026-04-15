import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

type PaginationBarProps = {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

type PageToken = number | "ellipsis";

const CHIP_SIZE = 34;

const buildPageTokens = (currentPage: number, totalPages: number): PageToken[] => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage, "ellipsis", totalPages];
};

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  disabled = false,
  className = "",
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const tokens = useMemo(() => buildPageTokens(currentPage, totalPages), [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  const goToPage = (page: number) => {
    if (disabled || page === currentPage || page < 1 || page > totalPages) return;
    onPageChange(page);
  };

  const renderNavButton = (label: string, targetPage: number, isDisabled: boolean) => (
    <Pressable
      key={`${label}-${targetPage}`}
      onPress={() => goToPage(targetPage)}
      disabled={disabled || isDisabled}
      className="items-center justify-center rounded-xl border border-black/8 bg-white"
      style={{
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        opacity: disabled || isDisabled ? 0.4 : 1,
      }}
    >
      <Text className="text-sm font-semibold text-[#5f6b7a]">{label}</Text>
    </Pressable>
  );

  return (
    <View className={`items-center ${className}`}>
      <View
        className="flex-row items-center rounded-[18px] bg-transparent px-2 py-2"
        style={{ gap: 8 }}
      >
        {renderNavButton("‹", currentPage - 1, currentPage <= 1)}

        {tokens.map((token, index) =>
          token === "ellipsis" ? (
            <View
              key={`ellipsis-${index}`}
              className="items-center justify-center rounded-xl bg-transparent"
              style={{ width: CHIP_SIZE, height: CHIP_SIZE }}
            >
              <Text className="text-sm font-semibold text-[#94a3b8]">…</Text>
            </View>
          ) : (
            <Pressable
              key={`page-${token}`}
              onPress={() => goToPage(token)}
              disabled={disabled || token === currentPage}
              className={`items-center justify-center rounded-xl border ${
                token === currentPage ? "border-[#2b6cb0] bg-[#2b6cb0]" : "border-black/8 bg-white"
              }`}
              style={{ width: CHIP_SIZE, height: CHIP_SIZE, opacity: disabled ? 0.7 : 1 }}
            >
              <Text
                className={`text-sm font-semibold ${token === currentPage ? "text-white" : "text-[#475569]"}`}
              >
                {token}
              </Text>
            </Pressable>
          ),
        )}

        {renderNavButton("›", currentPage + 1, currentPage >= totalPages)}
      </View>
    </View>
  );
};

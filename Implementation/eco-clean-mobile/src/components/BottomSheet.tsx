import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { BottomSheetModal, BottomSheetBackdrop } from "@gorhom/bottom-sheet";

export type BottomSheetHandle = {
  open: () => void;
  close: () => void;
};

export const ReusableBottomSheet = forwardRef<
  BottomSheetHandle,
  { title?: string; children: React.ReactNode }
>(({ title, children }, ref) => {
  const modalRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    open: () => modalRef.current?.present(),
    close: () => modalRef.current?.dismiss(),
  }));

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={["25%", "50%"]}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
        />
      )}
    >
      <View style={styles.content}>
        {title && <Text style={styles.title}>{title}</Text>}
        {children}
      </View>
    </BottomSheetModal>
  );
});

ReusableBottomSheet.displayName = "ReusableBottomSheet";

const styles = StyleSheet.create({
  content: { padding: 16 },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    fontFamily: "Comic-Bold",
  },
});

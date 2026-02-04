import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";

import { BottomSheetHandle } from "./types";

type Props = {
  title?: string;
  children: React.ReactNode;
  snapPoints?: string[];
};

export const ReusableBottomSheet = forwardRef<BottomSheetHandle, Props>(
  ({ title, children, snapPoints }, ref) => {
    const sheetRef = useRef<BottomSheet>(null);

    const points = useMemo(() => snapPoints ?? ["25%", "50%"], [snapPoints]);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.expand(),
      close: () => sheetRef.current?.close(),
    }));

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={points}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
          />
        )}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
      >
        <View style={styles.content}>
          {title && <Text style={styles.title}>{title}</Text>}
          {children}
        </View>
      </BottomSheet>
    );
  },
);

ReusableBottomSheet.displayName = "ReusableBottomSheet";

const styles = StyleSheet.create({
  background: {
    borderRadius: 24,
  },
  handle: {
    backgroundColor: "#D1D5DB",
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
});

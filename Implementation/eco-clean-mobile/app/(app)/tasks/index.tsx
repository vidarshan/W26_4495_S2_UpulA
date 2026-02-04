import { ReusableBottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { BottomSheetHandle } from "@/components/types";
import React, { useRef } from "react";
import { Text, View } from "react-native";

const index = () => {
  // const sheetRef = useRef<BottomSheetHandle>(null);

  return (
    <View>
      <Text>Tasks screen</Text>
      {/* <Button title="Open actions" onPress={() => sheetRef.current?.open()} />

      <ReusableBottomSheet ref={sheetRef} title="Task actions"> */}
      <Text>Edit task</Text>
      <Text>Delete task</Text>
      {/* </ReusableBottomSheet> */}
    </View>
  );
};

export default index;

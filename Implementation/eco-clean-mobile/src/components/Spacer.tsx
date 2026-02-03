import React from "react";
import { View } from "react-native";

const Spacer = ({ size = 8, horizontal = false }) => {
  return <View style={horizontal ? { width: size } : { height: size }} />;
};

export default Spacer;

import LoginScreen from "@/screens/LoginScreen";
import { useFonts } from "expo-font";

export default function Index() {
  const [fontsLoaded] = useFonts({
    "Comic-Bold": require("../assets/fonts/ComicNeue-Bold.ttf"),
    "Comic-BoldItalic": require("../assets/fonts/ComicNeue-BoldItalic.ttf"),
    "Comic-Italic": require("../assets/fonts/ComicNeue-Italic.ttf"),
    "Comic-Light": require("../assets/fonts/ComicNeue-Light.ttf"),
    "Comic-LightItalic": require("../assets/fonts/ComicNeue-LightItalic.ttf"),
    "Comic-Regular": require("../assets/fonts/ComicNeue-Regular.ttf"),
    "ComicRelief-LightItalic": require("../assets/fonts/ComicNeue-LightItalic.ttf"),
    "ComicRelief-Regular": require("../assets/fonts/ComicRelief-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return <LoginScreen />;
}

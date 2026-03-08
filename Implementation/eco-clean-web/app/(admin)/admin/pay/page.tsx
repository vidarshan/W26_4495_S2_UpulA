import { Button } from "@mantine/core";
import { IoAlarmOutline } from "react-icons/io5";

const page = () => {
  return (
    <div>
      p
      <Button
        size="xl"
        leftSection={<IoAlarmOutline />}
        variant="filled"
        color="grape"
      >
        Button
      </Button>
    </div>
  );
};

export default page;
